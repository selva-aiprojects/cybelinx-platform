package com.cybelinx.platform.api.usage;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UsageEventRepository;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.UsageEvent;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.usage.UsageViews.IngestResponse;
import com.cybelinx.platform.api.usage.UsageViews.IngestUsageRequest;
import com.cybelinx.platform.api.usage.UsageViews.Meta;
import com.cybelinx.platform.api.usage.UsageViews.UsageEventView;
import com.cybelinx.platform.api.usage.UsageViews.UsageListResponse;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Metering service: idempotent ingest + query for {@code usage_events} (Capability 22). */
@Service
public class UsageService {

    private final UsageEventRepository usageEvents;
    private final TenantRepository tenants;
    private final ProductRepository products;
    private final AuthorizationService authorization;

    public UsageService(
            UsageEventRepository usageEvents,
            TenantRepository tenants,
            ProductRepository products,
            AuthorizationService authorization) {
        this.usageEvents = usageEvents;
        this.tenants = tenants;
        this.products = products;
        this.authorization = authorization;
    }

    // ── ingest ────────────────────────────────────────────────────────────────

    @Transactional
    public IngestResponse ingestUsage(
            AuthPrincipal principal, UUID tenantId, IngestUsageRequest request) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);
        Tenant tenant = requireTenant(tenantId);
        Product product = requireProduct(request.productCode());

        // Idempotent: same dedupeKey → return existing (status=existing)
        if (request.dedupeKey() != null && !request.dedupeKey().isBlank()) {
            Optional<UsageEvent> existing = usageEvents.findByDedupeKey(request.dedupeKey());
            if (existing.isPresent()) {
                return new IngestResponse(existing.get().getId().toString(), "existing");
            }
        }

        UsageEvent event = new UsageEvent();
        event.setTenant(tenant);
        event.setProduct(product);
        event.setEventType(request.eventType());
        event.setQuantity(request.quantity() != null ? request.quantity() : BigDecimal.ONE);
        event.setUnit(request.unit());
        event.setDedupeKey(request.dedupeKey());
        event.setMetadata(request.metadata());

        if (request.occurredAt() != null && !request.occurredAt().isBlank()) {
            try {
                event.setOccurredAt(IsoTime.parse(request.occurredAt()));
            } catch (Exception ignored) {
                event.setOccurredAt(LocalDateTime.now());
            }
        } else {
            event.setOccurredAt(LocalDateTime.now());
        }

        UsageEvent saved = usageEvents.save(event);
        return new IngestResponse(saved.getId().toString(), "created");
    }

    // ── query ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public UsageListResponse listUsage(
            AuthPrincipal principal,
            UUID tenantId,
            String eventType,
            String from,
            String to,
            int page,
            int limit) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        requireTenant(tenantId);

        Specification<UsageEvent> spec = buildSpec(tenantId, eventType, from, to);
        Page<UsageEvent> resultPage = usageEvents.findAll(
                spec, PageRequest.of(page - 1, limit, Sort.by(Sort.Direction.DESC, "occurredAt")));

        List<UsageEventView> views = resultPage.getContent().stream().map(this::toView).toList();
        return new UsageListResponse(views,
                new Meta(page, limit, resultPage.getTotalElements(), resultPage.getTotalPages()));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void assertCanManageTenant(AuthPrincipal principal, UUID tenantId, String permission) {
        List<AuthorizationService.PlatformAccess> access =
                authorization.listAccess(principal.user().id());
        boolean isPlatformAdmin = access.stream()
                .anyMatch(entry -> entry.roles().contains(TenantConstants.PLATFORM_ADMIN_ROLE));
        if (isPlatformAdmin) return;
        var entry = access.stream().filter(e -> e.tenantId().equals(tenantId)).findFirst().orElse(null);
        if (entry == null || !entry.permissions().contains(permission)) {
            throw new ApiError(ErrorCode.TENANT_ACCESS_DENIED,
                    "You do not have \"" + permission + "\" access on tenant \"" + tenantId + "\"",
                    Map.of("tenantId", tenantId.toString(), "permission", permission));
        }
    }

    private Specification<UsageEvent> buildSpec(
            UUID tenantId, String eventType, String from, String to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.join("tenant").get("id"), tenantId));
            if (eventType != null && !eventType.isBlank()) {
                predicates.add(cb.equal(root.get("eventType"), eventType));
            }
            if (from != null && !from.isBlank()) {
                try {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), IsoTime.parse(from)));
                } catch (Exception ignored) {}
            }
            if (to != null && !to.isBlank()) {
                try {
                    predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), IsoTime.parse(to)));
                } catch (Exception ignored) {}
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Tenant requireTenant(UUID tenantId) {
        return tenants.findById(tenantId)
                .orElseThrow(() -> new ApiError(ErrorCode.TENANT_NOT_FOUND,
                        "Tenant not found: " + tenantId, Map.of("tenantId", tenantId.toString())));
    }

    private Product requireProduct(String productCode) {
        return products.findByProductCode(productCode)
                .orElseThrow(() -> new ApiError(ErrorCode.PRODUCT_NOT_FOUND,
                        "Product not found: " + productCode, Map.of("productCode", productCode)));
    }

    private UsageEventView toView(UsageEvent e) {
        return new UsageEventView(
                e.getId() != null ? e.getId().toString() : null,
                e.getTenant() != null ? e.getTenant().getId().toString() : null,
                e.getProduct() != null ? e.getProduct().getId().toString() : null,
                e.getEventType(),
                e.getQuantity(),
                e.getUnit(),
                e.getDedupeKey(),
                e.getOccurredAt() != null ? IsoTime.format(e.getOccurredAt()) : null,
                e.getIngestedAt() != null ? IsoTime.format(e.getIngestedAt()) : null);
    }
}
