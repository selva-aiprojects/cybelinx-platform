package com.cybelinx.platform.api.productrepository;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.ProductRepositoryCustomerRepository;
import com.cybelinx.platform.api.persistence.TenantProductRepository;
import com.cybelinx.platform.api.persistence.TenantResourceRepository;
import com.cybelinx.platform.api.persistence.TenantRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.persistence.entity.ProductRepositoryCustomer;
import com.cybelinx.platform.api.persistence.entity.Tenant;
import com.cybelinx.platform.api.persistence.entity.TenantProduct;
import com.cybelinx.platform.api.persistence.entity.TenantResource;
import com.cybelinx.platform.api.productrepository.ProductRepositoryViews.ProductRepositoryCustomerView;
import com.cybelinx.platform.api.productrepository.ProductRepositoryViews.ProductRepositoryDetail;
import com.cybelinx.platform.api.productrepository.ProductRepositoryViews.ProductRepositoryListResponse;
import com.cybelinx.platform.api.productrepository.ProductRepositoryViews.ProductRepositoryView;
import com.cybelinx.platform.api.productrepository.dto.UpdateProductRepositoryCustomerRequest;
import com.cybelinx.platform.api.productrepository.dto.UpdateProductRepositoryRequest;
import com.cybelinx.platform.api.products.ProductConstants;
import com.cybelinx.platform.api.products.ProductViews.Meta;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.security.AuthPrincipal;
import com.cybelinx.platform.api.subscriptions.SubscriptionViews.SubscriptionMasterView;
import com.cybelinx.platform.api.subscriptions.SubscriptionsService;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Product repository registry: deployment metadata, customers and subscriptions per product. */
@Service
public class ProductRepositoryService {

    private final ProductRepository products;
    private final TenantProductRepository tenantProducts;
    private final TenantResourceRepository tenantResources;
    private final ProductRepositoryCustomerRepository customers;
    private final TenantRepository tenants;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final AuthorizationService authorization;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    private static final String[] SORT_KEYS = {
        "createdAt", "-createdAt", "name", "-name", "productCode", "-productCode"
    };

    private static final String DEFAULT_SORT = "-createdAt";

    public ProductRepositoryService(
            ProductRepository products,
            TenantProductRepository tenantProducts,
            TenantResourceRepository tenantResources,
            ProductRepositoryCustomerRepository customers,
            TenantRepository tenants,
            UserRepository users,
            AuditEventRepository auditEvents,
            AuthorizationService authorization) {
        this.products = products;
        this.tenantProducts = tenantProducts;
        this.tenantResources = tenantResources;
        this.customers = customers;
        this.tenants = tenants;
        this.users = users;
        this.auditEvents = auditEvents;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public ProductRepositoryListResponse list(AuthPrincipal principal, ProductRepositoryListQuery query) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);

        int page = query.page() != null ? query.page() : 1;
        int limit = query.limit() != null ? query.limit() : 20;
        if (page < 1) {
            throw ApiHttpException.badRequest("page must not be less than 1");
        }
        if (limit < 1) {
            throw ApiHttpException.badRequest("limit must not be less than 1");
        }
        if (limit > 100) {
            throw ApiHttpException.badRequest("limit must not be greater than 100");
        }
        if (query.search() != null && query.search().length() > 100) {
            throw ApiHttpException.badRequest("search must not exceed 100 characters");
        }

        String sort = query.sort() != null ? query.sort() : DEFAULT_SORT;
        if (!List.of(SORT_KEYS).contains(sort)) {
            throw ApiHttpException.badRequest(
                    "sort must be one of the following values: createdAt, -createdAt, name, -name, productCode, -productCode");
        }

        Specification<Product> where = buildListWhere(query.search());
        boolean desc = sort.startsWith("-");
        String key = desc ? sort.substring(1) : sort;
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, key));

        Page<Product> result = products.findAll(where, pageable);
        List<ProductRepositoryView> data = result.getContent().stream().map(ProductRepositoryService::toView).toList();
        return new ProductRepositoryListResponse(data, new Meta(page, limit, result.getTotalElements(), result.getTotalPages()));
    }

    @Transactional(readOnly = true)
    public ProductRepositoryDetail get(AuthPrincipal principal, UUID productId) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);

        Product product = requireProduct(productId);
        List<TenantProduct> subscriptions = tenantProducts.listByProductId(productId);

        List<ProductRepositoryCustomerView> customerViews = subscriptions.stream()
                .map(tp -> toCustomerView(tp, product))
                .toList();
        List<SubscriptionMasterView> subscriptionViews =
                subscriptions.stream().map(SubscriptionsService::toMasterView).toList();

        return new ProductRepositoryDetail(
                toView(product).repositoryId(),
                product.getId().toString(),
                product.getProductCode(),
                product.getDomain(),
                product.getDatabaseLocation(),
                product.getDatabaseConnectionString(),
                product.getConfigurationLocation(),
                IsoTime.format(product.getUpdatedAt()),
                customerViews,
                subscriptionViews);
    }

    @Transactional
    public ProductRepositoryView update(AuthPrincipal principal, UUID productId, UpdateProductRepositoryRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        Product product = requireProduct(productId);
        List<String> fields = new ArrayList<>();
        if (request.getDomain() != null) {
            product.setDomain(request.getDomain());
            fields.add("domain");
        }
        if (request.getDatabaseLocation() != null) {
            product.setDatabaseLocation(request.getDatabaseLocation());
            fields.add("databaseLocation");
        }
        if (request.getDatabaseConnectionString() != null) {
            product.setDatabaseConnectionString(request.getDatabaseConnectionString());
            fields.add("databaseConnectionString");
        }
        if (request.getConfigurationLocation() != null) {
            product.setConfigurationLocation(request.getConfigurationLocation());
            fields.add("configurationLocation");
        }
        if (!fields.isEmpty()) {
            products.save(product);
            writeAudit(principal, product.getId(), "product_repository.updated", Map.of("fields", fields));
        }

        return toView(product);
    }

    @Transactional
    public ProductRepositoryCustomerView updateCustomer(
            AuthPrincipal principal, UUID productId, UUID tenantId, UpdateProductRepositoryCustomerRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        Product product = requireProduct(productId);
        Tenant tenant = requireTenant(tenantId);

        ProductRepositoryCustomer customer =
                customers.findByProductIdAndTenantId(productId, tenantId).orElseGet(() -> {
                    ProductRepositoryCustomer created = new ProductRepositoryCustomer();
                    created.setProduct(product);
                    created.setTenant(tenant);
                    return created;
                });
        List<String> fields = new ArrayList<>();
        if (request.getTenantSchema() != null) {
            customer.setTenantSchema(request.getTenantSchema());
            fields.add("tenantSchema");
        }
        if (request.getDatabaseName() != null) {
            customer.setDatabaseName(request.getDatabaseName());
            fields.add("databaseName");
        }
        if (request.getContactPerson() != null) {
            customer.setContactPerson(request.getContactPerson());
            fields.add("contactPerson");
        }
        if (request.getContactEmail() != null) {
            customer.setContactEmail(request.getContactEmail());
            fields.add("contactEmail");
        }
        customers.save(customer);

        writeAudit(
                principal,
                product.getId(),
                "product_repository.customer_updated",
                Map.of("tenantId", tenantId.toString(), "fields", fields));

        return buildCustomerView(product, product.getProductCode(), tenant, customer);
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

    private Tenant requireTenant(UUID tenantId) {
        return tenants.findById(tenantId)
                .orElseThrow(() -> new ApiError(
                        ErrorCode.TENANT_NOT_FOUND,
                        "Tenant \"" + tenantId + "\" does not exist",
                        Map.of("tenantId", tenantId.toString())));
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

    private static ProductRepositoryView toView(Product product) {
        return new ProductRepositoryView(
                product.getId().toString(),
                product.getId().toString(),
                product.getProductCode(),
                product.getDomain(),
                product.getDatabaseLocation(),
                product.getDatabaseConnectionString(),
                product.getConfigurationLocation(),
                IsoTime.format(product.getUpdatedAt()));
    }

    private ProductRepositoryCustomerView toCustomerView(TenantProduct tp, Product product) {
        ProductRepositoryCustomer override =
                customers.findByProductIdAndTenantId(product.getId(), tp.getTenant().getId()).orElse(null);
        return buildCustomerView(product, product.getProductCode(), tp.getTenant(), override);
    }

    private ProductRepositoryCustomerView buildCustomerView(
            Product product, String productCode, Tenant tenant, ProductRepositoryCustomer override) {
        String tenantSchema = override != null ? override.getTenantSchema() : null;
        String databaseName = override != null ? override.getDatabaseName() : null;
        if (tenantSchema == null || databaseName == null) {
            TenantResource resource = resolvePrimaryResource(tenant.getId(), product.getId());
            if (resource != null) {
                if (tenantSchema == null) {
                    tenantSchema = resource.getSchemaName();
                }
                if (databaseName == null && resource.getDatabase() != null) {
                    databaseName = resource.getDatabase().getName();
                }
            }
        }
        String contactPerson = override != null ? override.getContactPerson() : null;
        String contactEmail = override != null ? override.getContactEmail() : null;

        return new ProductRepositoryCustomerView(
                tenant.getId().toString(),
                tenant.getTenantCode(),
                tenant.getName(),
                productCode,
                tenantSchema,
                databaseName,
                contactPerson,
                contactEmail);
    }

    private TenantResource resolvePrimaryResource(UUID tenantId, UUID productId) {
        List<TenantResource> production =
                tenantResources.resolveFor(tenantId, productId, Environment.PRODUCTION);
        if (!production.isEmpty()) {
            return production.get(0);
        }
        List<TenantResource> development =
                tenantResources.resolveFor(tenantId, productId, Environment.DEVELOPMENT);
        return development.isEmpty() ? null : development.get(0);
    }

    private void writeAudit(AuthPrincipal principal, UUID productId, String action, Object metadata) {
        AuditEvent audit = new AuditEvent();
        audit.setProduct(products.getReferenceById(productId));
        audit.setUser(users.getReferenceById(principal.user().id()));
        audit.setActorType("USER");
        audit.setAction(action);
        audit.setEntityType("product");
        audit.setEntityId(productId);
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

    private static Specification<Product> buildListWhere(String search) {
        return (root, query, cb) -> {
            if (search == null || search.isEmpty()) {
                return cb.conjunction();
            }
            String like = "%" + search.toLowerCase() + "%";
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("productCode")), like)));
            if (root.get("domain") != null) {
                predicates.add(cb.like(cb.lower(root.get("domain")), like));
            }
            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    /** Query params for {@code GET /product-repository}. */
    public record ProductRepositoryListQuery(Integer page, Integer limit, String search, String sort) {}
}