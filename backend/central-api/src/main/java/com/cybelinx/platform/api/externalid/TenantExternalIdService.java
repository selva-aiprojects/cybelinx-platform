package com.cybelinx.platform.api.externalid;

import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.externalid.ExternalIdViews.ExternalIdActionResponse;
import com.cybelinx.platform.api.externalid.ExternalIdViews.ExternalIdListResponse;
import com.cybelinx.platform.api.externalid.ExternalIdViews.ExternalIdView;
import com.cybelinx.platform.api.externalid.ExternalIdViews.RegisterExternalIdRequest;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.TenantExternalIdentifierRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantExternalIdentifier;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Service for managing tenant-to-product external ID mappings (Capability 25). */
@Service
public class TenantExternalIdService {

    private final TenantExternalIdentifierRepository externalIds;
    private final TenantRepository tenants;
    private final ProductRepository products;
    private final AuthorizationService authorization;

    public TenantExternalIdService(
            TenantExternalIdentifierRepository externalIds,
            TenantRepository tenants,
            ProductRepository products,
            AuthorizationService authorization) {
        this.externalIds = externalIds;
        this.tenants = tenants;
        this.products = products;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public ExternalIdListResponse listExternalIds(AuthPrincipal principal, UUID tenantId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        requireTenant(tenantId);
        List<ExternalIdView> views =
                externalIds.findByTenant_Id(tenantId).stream().map(this::toView).toList();
        return new ExternalIdListResponse(views);
    }

    @Transactional
    public ExternalIdView registerExternalId(
            AuthPrincipal principal, UUID tenantId, RegisterExternalIdRequest request) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);
        Tenant tenant = requireTenant(tenantId);
        Product product = requireProduct(request.productCode());

        if (externalIds.existsByTenant_IdAndProduct_IdAndExternalId(
                tenantId, product.getId(), request.externalId())) {
            throw new ApiError(
                    ErrorCode.EXTERNAL_ID_ALREADY_MAPPED,
                    "External ID already mapped for tenant + product",
                    Map.of("tenantId", tenantId.toString(), "productCode", request.productCode(),
                           "externalId", request.externalId()));
        }

        TenantExternalIdentifier mapping = new TenantExternalIdentifier();
        mapping.setTenant(tenant);
        mapping.setProduct(product);
        mapping.setProvider(request.provider());
        mapping.setExternalId(request.externalId());
        TenantExternalIdentifier saved = externalIds.save(mapping);
        return toView(saved);
    }

    @Transactional
    public ExternalIdActionResponse removeExternalId(
            AuthPrincipal principal, UUID tenantId, UUID mappingId) {
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);
        TenantExternalIdentifier mapping =
                externalIds
                        .findById(mappingId)
                        .filter(m -> m.getTenant().getId().equals(tenantId))
                        .orElseThrow(() -> new ApiError(
                                ErrorCode.EXTERNAL_ID_NOT_FOUND,
                                "External ID mapping not found: " + mappingId,
                                Map.of("mappingId", mappingId.toString())));
        externalIds.delete(mapping);
        return new ExternalIdActionResponse(mappingId.toString(), tenantId.toString(), "removed");
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

    private ExternalIdView toView(TenantExternalIdentifier m) {
        return new ExternalIdView(
                m.getId() != null ? m.getId().toString() : null,
                m.getTenant() != null ? m.getTenant().getId().toString() : null,
                m.getProduct() != null ? m.getProduct().getId().toString() : null,
                m.getProduct() != null ? m.getProduct().getProductCode() : null,
                m.getProvider(),
                m.getExternalId(),
                m.getCreatedAt() != null ? IsoTime.format(m.getCreatedAt()) : null);
    }
}
