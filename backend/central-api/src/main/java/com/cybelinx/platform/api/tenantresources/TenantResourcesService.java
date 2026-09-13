package com.cybelinx.platform.api.tenantresources;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.IsolationMode;
import com.cybelinx.platform.api.domain.ProvisioningState;
import com.cybelinx.platform.api.domain.TenantProductStatus;
import com.cybelinx.platform.api.domain.TenantResourceStatus;
import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.ResourceCatalogRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.Resource;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.resourceresolver.ResolvedTenantResource;
import com.cybelinx.platform.api.resourceresolver.TenantResourceResolver;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.tenants.TenantConstants;
import com.cybelinx.platform.api.tenants.TenantViews;
import com.cybelinx.platform.api.tenants.TenantViews.TenantResourceActionResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantResourceListResponse;
import com.cybelinx.platform.api.tenants.TenantViews.TenantResourceView;
import com.cybelinx.platform.api.tenantresources.dto.RegisterTenantResourceRequest;
import com.cybelinx.platform.api.tenantresources.dto.UpdateTenantResourceRequest;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Tenant resource registry — register/inspect/update/detach tenant-scoped resources. */
@Service
public class TenantResourcesService {

    private final TenantResourceRepository tenantResources;
    private final TenantRepository tenants;
    private final ProductRepository products;
    private final ResourceCatalogRepository catalog;
    private final TenantProductRepository tenantProducts;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final AuthorizationService authorization;
    private final TenantResourceResolver resourceResolver;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    public TenantResourcesService(
            TenantResourceRepository tenantResources,
            TenantRepository tenants,
            ProductRepository products,
            ResourceCatalogRepository catalog,
            TenantProductRepository tenantProducts,
            UserRepository users,
            AuditEventRepository auditEvents,
            AuthorizationService authorization,
            TenantResourceResolver resourceResolver) {
        this.tenantResources = tenantResources;
        this.tenants = tenants;
        this.products = products;
        this.catalog = catalog;
        this.tenantProducts = tenantProducts;
        this.users = users;
        this.auditEvents = auditEvents;
        this.authorization = authorization;
        this.resourceResolver = resourceResolver;
    }

    @Transactional(readOnly = true)
    public TenantResourceListResponse listResources(AuthPrincipal principal, UUID tenantId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);

        List<TenantResourceView> data =
                tenantResources.listByTenantId(tenantId).stream().map(TenantResourcesService::toView).toList();
        return new TenantResourceListResponse(data);
    }

    @Transactional(readOnly = true)
    public TenantResourceView getResource(AuthPrincipal principal, UUID tenantId, UUID resourceId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        return toView(requireTenantResource(tenantId, resourceId));
    }

    @Transactional(readOnly = true)
    public ResolvedTenantResource resolveResource(
            AuthPrincipal principal, UUID tenantId, UUID productId, Environment environment) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_READ);
        if (!products.existsById(productId)) {
            throw new ApiError(
                    ErrorCode.PRODUCT_NOT_FOUND,
                    "Product \"" + productId + "\" is not registered",
                    Map.of("productId", productId.toString()));
        }
        return resourceResolver.resolve(tenantId, productId, environment);
    }

    @Transactional
    public TenantResourceView registerResource(
            AuthPrincipal principal, UUID tenantId, RegisterTenantResourceRequest request) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        Product product = products.findByProductCode(request.getProductCode())
                .orElseThrow(() -> new ApiError(
                        ErrorCode.PRODUCT_NOT_FOUND,
                        "Product \"" + request.getProductCode() + "\" is not registered",
                        Map.of("productCode", request.getProductCode())));

        TenantProduct subscription = tenantProducts.findByTenantIdAndProductId(tenantId, product.getId())
                .orElseThrow(() -> new ApiError(
                        ErrorCode.TENANT_PRODUCT_NOT_FOUND,
                        "Tenant \"" + tenantId + "\" is not subscribed to product \""
                                + request.getProductCode() + "\"",
                        Map.of("tenantId", tenantId.toString(), "productCode", request.getProductCode())));
        if (subscription.getStatus() == TenantProductStatus.DISABLED) {
            throw new ApiError(
                    ErrorCode.TENANT_PRODUCT_NOT_FOUND,
                    "Tenant \"" + tenantId + "\" is not subscribed to product \""
                            + request.getProductCode() + "\"",
                    Map.of("tenantId", tenantId.toString(), "productCode", request.getProductCode()));
        }

        Resource catalogEntry = catalog.findByResourceTypeCode(request.getResourceTypeCode())
                .orElseThrow(() -> new ApiError(
                        ErrorCode.RESOURCE_NOT_FOUND,
                        "Resource type \"" + request.getResourceTypeCode() + "\" is not registered",
                        Map.of("resourceTypeCode", request.getResourceTypeCode())));

        Environment environment = Environment.valueOf(
                request.getEnvironment() != null ? request.getEnvironment() : Environment.DEVELOPMENT.name());
        if (tenantResources.existsByTenantIdAndProductIdAndEnvironmentAndResourceId(
                tenantId, product.getId(), environment, catalogEntry.getId())) {
            throw new ApiError(
                    ErrorCode.TENANT_RESOURCE_ALREADY_REGISTERED,
                    "Tenant \"" + tenantId + "\" already has resource \""
                            + request.getResourceTypeCode() + "\" for product \"" + request.getProductCode()
                            + "\" in environment \"" + environment + "\"",
                    Map.of(
                            "tenantId", tenantId.toString(),
                            "productCode", request.getProductCode(),
                            "resourceTypeCode", request.getResourceTypeCode(),
                            "environment", environment.name()));
        }

        TenantResource tenantResource = new TenantResource();
        tenantResource.setTenant(tenants.getReferenceById(tenantId));
        tenantResource.setProduct(product);
        tenantResource.setTenantProduct(subscription);
        tenantResource.setResource(catalogEntry);
        tenantResource.setIsolationMode(IsolationMode.valueOf(
                request.getIsolationMode() != null ? request.getIsolationMode() : IsolationMode.SHARED_POOL.name()));
        tenantResource.setEnvironment(environment);
        tenantResource.setStatus(TenantResourceStatus.PROVISIONING);
        tenantResource.setProvisioningState(ProvisioningState.IN_PROGRESS);
        tenantResource = tenantResources.save(tenantResource);

        writeAudit(
                principal,
                tenantId,
                product.getId(),
                tenantResource.getId(),
                "tenant_resource.created",
                toRegistryMetadata(request.getProductCode(), catalogEntry.getResourceTypeCode(), environment));

        return toView(tenantResource);
    }

    @Transactional
    public TenantResourceView updateResource(
            AuthPrincipal principal,
            UUID tenantId,
            UUID resourceId,
            UpdateTenantResourceRequest request) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        TenantResource tenantResource = requireTenantResource(tenantId, resourceId);

        Map<String, String> changed = new LinkedHashMap<>();
        if (request.getSchemaName() != null
                && !request.getSchemaName().equals(tenantResource.getSchemaName())) {
            tenantResource.setSchemaName(request.getSchemaName());
            changed.put("schemaName", request.getSchemaName());
        }
        if (request.getMigrationVersion() != null
                && !request.getMigrationVersion().equals(tenantResource.getMigrationVersion())) {
            tenantResource.setMigrationVersion(request.getMigrationVersion());
            changed.put("migrationVersion", request.getMigrationVersion());
        }
        if (request.getCredentialReference() != null
                && !request.getCredentialReference().equals(tenantResource.getCredentialReference())) {
            tenantResource.setCredentialReference(request.getCredentialReference());
            changed.put("credentialReference", request.getCredentialReference());
        }
        tenantResources.save(tenantResource);

        if (!changed.isEmpty()) {
            writeAudit(
                    principal,
                    tenantId,
                    tenantResource.getProduct().getId(),
                    tenantResource.getId(),
                    "tenant_resource.updated",
                    changed);
        }
        return toView(tenantResource);
    }

    @Transactional
    public TenantResourceActionResponse removeResource(AuthPrincipal principal, UUID tenantId, UUID resourceId) {
        requireTenant(tenantId);
        assertCanManageTenant(principal, tenantId, TenantConstants.PERMISSION_TENANT_WRITE);

        TenantResource tenantResource = requireTenantResource(tenantId, resourceId);
        tenantResource.setStatus(TenantResourceStatus.RETIRED);
        tenantResource.setProvisioningState(ProvisioningState.ROLLED_BACK);
        tenantResources.save(tenantResource);

        writeAudit(
                principal,
                tenantId,
                tenantResource.getProduct().getId(),
                tenantResource.getId(),
                "tenant_resource.removed",
                toRegistryMetadata(
                        tenantResource.getProduct().getProductCode(),
                        tenantResource.getResource().getResourceTypeCode(),
                        tenantResource.getEnvironment()));

        return new TenantResourceActionResponse(
                tenantId.toString(),
                tenantResource.getProduct().getProductCode(),
                tenantResource.getResource().getResourceTypeCode(),
                TenantResourceStatus.RETIRED.name());
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    private Tenant requireTenant(UUID tenantId) {
        Tenant tenant = tenants.findById(tenantId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.TENANT_NOT_FOUND,
                        "Tenant \"" + tenantId + "\" does not exist",
                        Map.of("tenantId", tenantId.toString())));
        if (tenant.getStatus() == TenantStatus.DELETED) {
            throw new ApiError(
                    ErrorCode.TENANT_NOT_FOUND,
                    "Tenant \"" + tenantId + "\" does not exist",
                    Map.of("tenantId", tenantId.toString()));
        }
        return tenant;
    }

    private TenantResource requireTenantResource(UUID tenantId, UUID resourceId) {
        return tenantResources.findByIdAndTenantId(resourceId, tenantId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.TENANT_RESOURCE_NOT_FOUND,
                        "Resource \"" + resourceId + "\" is not registered for tenant \"" + tenantId + "\"",
                        Map.of("tenantId", tenantId.toString(), "resourceId", resourceId.toString())));
    }

    private void assertCanManageTenant(AuthPrincipal principal, UUID tenantId, String permission) {
        List<AuthorizationService.PlatformAccess> access = authorization.listAccess(principal.user().id());
        boolean isPlatformAdmin = access.stream()
                .anyMatch(entry -> entry.roles().contains(TenantConstants.PLATFORM_ADMIN_ROLE));
        if (isPlatformAdmin) {
            return;
        }
        var entry = access.stream().filter(e -> e.tenantId().equals(tenantId)).findFirst().orElse(null);
        if (entry == null || !entry.permissions().contains(permission)) {
            throw new ApiError(
                    ErrorCode.TENANT_ACCESS_DENIED,
                    "You do not have \"" + permission + "\" access on tenant \"" + tenantId + "\"",
                    Map.of("tenantId", tenantId.toString(), "permission", permission));
        }
    }

    private void writeAudit(
            AuthPrincipal principal,
            UUID tenantId,
            UUID productId,
            UUID tenantResourceId,
            String action,
            Object metadata) {
        AuditEvent audit = new AuditEvent();
        audit.setTenant(tenants.getReferenceById(tenantId));
        audit.setProduct(products.getReferenceById(productId));
        audit.setUser(users.getReferenceById(principal.user().id()));
        audit.setActorType("USER");
        audit.setAction(action);
        audit.setEntityType("tenant_resource");
        audit.setEntityId(tenantResourceId);
        audit.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        audit.setMetadata(toJson(metadata));
        auditEvents.save(audit);
    }

    private static Map<String, Object> toRegistryMetadata(String productCode, String resourceTypeCode, Environment environment) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("productCode", productCode);
        value.put("resourceTypeCode", resourceTypeCode);
        value.put("environment", environment.name());
        return value;
    }

    private static String toJson(Object value) {
        try {
            return AUDIT_JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize audit metadata", e);
        }
    }

    private static TenantResourceView toView(TenantResource resource) {
        return new TenantResourceView(
                resource.getId().toString(),
                resource.getTenant().getId().toString(),
                resource.getProduct().getProductCode(),
                resource.getResource().getResourceTypeCode(),
                resource.getIsolationMode().name(),
                resource.getEnvironment().name(),
                resource.getStatus().name(),
                resource.getProvisioningState().name());
    }
}