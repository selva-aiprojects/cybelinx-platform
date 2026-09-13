package com.cybelinx.platform.api.products;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.ProductVersionRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.ProductVersion;
import com.cybelinx.platform.api.products.ProductVersionViews.ProductVersionListResponse;
import com.cybelinx.platform.api.products.ProductVersionViews.ProductVersionView;
import com.cybelinx.platform.api.products.ProductVersionViews.PublishVersionResponse;
import com.cybelinx.platform.api.products.dto.CreateProductVersionRequest;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Product version catalog — versions are product-owned metadata on top of Product. */
@Service
public class ProductVersionsService {

    private final ProductVersionRepository versions;
    private final ProductRepository products;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final AuthorizationService authorization;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    public ProductVersionsService(
            ProductVersionRepository versions,
            ProductRepository products,
            UserRepository users,
            AuditEventRepository auditEvents,
            AuthorizationService authorization) {
        this.versions = versions;
        this.products = products;
        this.users = users;
        this.auditEvents = auditEvents;
        this.authorization = authorization;
    }

    @Transactional
    public ProductVersionView createVersion(
            AuthPrincipal principal, UUID productId, CreateProductVersionRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);
        Product product = requireProduct(productId);

        if (versions.findByProductIdAndVersion(productId, request.getVersion()).isPresent()) {
            throw new ApiError(
                    ErrorCode.PRODUCT_VERSION_TAKEN,
                    "Version \"" + request.getVersion() + "\" already exists for this product",
                    Map.of("productId", productId.toString(), "version", request.getVersion()));
        }

        ProductVersion version = new ProductVersion();
        version.setProduct(product);
        version.setVersion(request.getVersion());
        version.setReleaseNotes(request.getReleaseNotes());
        version.setCurrent(false);
        version = versions.save(version);

        writeAudit(
                principal,
                product.getId(),
                version.getId(),
                "product_version.created",
                Map.of("version", version.getVersion()));

        return toView(version);
    }

    @Transactional(readOnly = true)
    public ProductVersionListResponse listVersions(AuthPrincipal principal, UUID productId) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);
        requireProduct(productId);

        List<ProductVersionView> data =
                versions.findByProductIdOrderByCreatedAtAsc(productId).stream()
                        .map(ProductVersionsService::toView)
                        .toList();
        return new ProductVersionListResponse(data);
    }

    @Transactional(readOnly = true)
    public ProductVersionView getVersion(AuthPrincipal principal, UUID productId, UUID versionId) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);
        return toView(requireVersion(productId, versionId));
    }

    @Transactional
    public PublishVersionResponse publishVersion(AuthPrincipal principal, UUID productId, UUID versionId) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);
        Product product = requireProduct(productId);
        ProductVersion version = requireVersion(productId, versionId);

        versions.findByProductIdAndIsCurrentTrue(productId).forEach(previous -> {
            previous.setCurrent(false);
            versions.save(previous);
        });

        version.setCurrent(true);
        version.setPublishedAt(LocalDateTime.now(ZoneOffset.UTC));
        versions.save(version);

        product.setCurrentVersion(version);
        products.save(product);

        writeAudit(
                principal,
                product.getId(),
                version.getId(),
                "product_version.published",
                Map.of("version", version.getVersion()));

        return new PublishVersionResponse(version.getId().toString(), version.getVersion(), true);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private Product requireProduct(UUID productId) {
        return products.findById(productId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "Product \"" + productId + "\" is not registered",
                        Map.of("productId", productId.toString())));
    }

    private ProductVersion requireVersion(UUID productId, UUID versionId) {
        return versions.findByIdAndProductId(versionId, productId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_VERSION_NOT_FOUND,
                        "Version \"" + versionId + "\" is not registered for product \"" + productId + "\"",
                        Map.of("productId", productId.toString(), "versionId", versionId.toString())));
    }

    private void assertPlatformPermission(UUID userId, String permission) {
        boolean granted = authorization.listAccess(userId).stream()
                .anyMatch(entry -> entry.roles().contains(AuthorizationService.PLATFORM_ADMIN_ROLE)
                        || entry.permissions().contains(permission));
        if (!granted) {
            throw new ApiError(
                    ErrorCode.FORBIDDEN,
                    "Missing required permission: " + permission,
                    Map.of("permission", permission));
        }
    }

    private void writeAudit(AuthPrincipal principal, UUID productId, UUID versionId, String action, Object metadata) {
        AuditEvent audit = new AuditEvent();
        audit.setProduct(products.getReferenceById(productId));
        audit.setUser(users.getReferenceById(principal.user().id()));
        audit.setActorType("USER");
        audit.setAction(action);
        audit.setEntityType("product_version");
        audit.setEntityId(versionId);
        audit.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        audit.setMetadata(toJson(metadata));
        auditEvents.save(audit);
    }

    private static String toJson(Object value) {
        try {
            return AUDIT_JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize audit metadata", e);
        }
    }

    private static ProductVersionView toView(ProductVersion version) {
        return new ProductVersionView(
                version.getId().toString(),
                version.getVersion(),
                version.getReleaseNotes(),
                version.isCurrent(),
                version.getPublishedAt() == null ? null : IsoTime.format(version.getPublishedAt()),
                IsoTime.format(version.getCreatedAt()));
    }
}