package com.cybelinx.platform.api.products;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import com.cybelinx.platform.api.common.time.IsoTime;
import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.api.persistence.AuditEventRepository;
import com.cybelinx.platform.api.persistence.ProductRepository;
import com.cybelinx.platform.api.persistence.UserRepository;
import com.cybelinx.platform.api.persistence.entity.AuditEvent;
import com.cybelinx.platform.api.persistence.entity.Product;
import com.cybelinx.platform.api.products.ProductViews.Meta;
import com.cybelinx.platform.api.products.ProductViews.ProductActionResponse;
import com.cybelinx.platform.api.products.ProductViews.ProductListResponse;
import com.cybelinx.platform.api.products.ProductViews.ProductView;
import com.cybelinx.platform.api.products.dto.CreateProductRequest;
import com.cybelinx.platform.api.products.dto.UpdateProductRequest;
import com.cybelinx.platform.api.products.dto.UpdateProductStatusRequest;
import com.cybelinx.platform.api.security.AuthorizationService;
import com.cybelinx.platform.api.security.AuthPrincipal;
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

/** Product registry: platform-scoped catalog of Cybelinx products (metadata only). */
@Service
public class ProductsService {

    private final ProductRepository products;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final AuthorizationService authorization;

    private static final ObjectMapper AUDIT_JSON = new ObjectMapper();

    public ProductsService(
            ProductRepository products,
            UserRepository users,
            AuditEventRepository auditEvents,
            AuthorizationService authorization) {
        this.products = products;
        this.users = users;
        this.auditEvents = auditEvents;
        this.authorization = authorization;
    }

    @Transactional
    public ProductView createProduct(AuthPrincipal principal, CreateProductRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        if (products.findByProductCode(request.getProductCode()).isPresent()) {
            throw new ApiError(
                    ErrorCode.PRODUCT_CODE_TAKEN,
                    "Product code \"" + request.getProductCode() + "\" is already registered",
                    Map.of("productCode", request.getProductCode()));
        }

        Product product = new Product();
        product.setProductCode(request.getProductCode());
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setStatus(ProductStatus.DRAFT);
        product = products.save(product);

        writeAudit(principal, product.getId(), "product.created", Map.of("productCode", product.getProductCode()));

        return toView(product);
    }

    @Transactional(readOnly = true)
    public ProductListResponse listProducts(AuthPrincipal principal, ProductListQuery query) {
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

        String sort = query.sort() != null ? query.sort() : ProductConstants.DEFAULT_SORT;
        if (!List.of(ProductConstants.SORT_KEYS).contains(sort)) {
            throw ApiHttpException.badRequest(
                    "sort must be one of the following values: createdAt, -createdAt, name, -name, productCode, -productCode");
        }

        Specification<Product> where = buildListWhere(query.status(), query.search());
        boolean desc = sort.startsWith("-");
        String key = desc ? sort.substring(1) : sort;
        Pageable pageable = PageRequest.of(page - 1, limit, Sort.by(desc ? Sort.Direction.DESC : Sort.Direction.ASC, key));

        Page<Product> result = products.findAll(where, pageable);
        List<ProductView> data = result.getContent().stream().map(ProductsService::toView).toList();
        return new ProductListResponse(data, new Meta(page, limit, result.getTotalElements(), result.getTotalPages()));
    }

    @Transactional(readOnly = true)
    public ProductView getProduct(AuthPrincipal principal, UUID productId) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_READ);
        return toView(requireProduct(productId));
    }

    @Transactional
    public ProductView updateProduct(AuthPrincipal principal, UUID productId, UpdateProductRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        Product product = requireProduct(productId);
        List<String> fields = new ArrayList<>();
        if (request.getName() != null) {
            product.setName(request.getName());
            fields.add("name");
        }
        if (request.getDescription() != null) {
            product.setDescription(request.getDescription());
            fields.add("description");
        }
        products.save(product);

        writeAudit(principal, product.getId(), "product.updated", Map.of("fields", fields));

        return toView(product);
    }

    @Transactional
    public ProductActionResponse updateProductStatus(
            AuthPrincipal principal, UUID productId, UpdateProductStatusRequest request) {
        assertPlatformPermission(principal.user().id(), ProductConstants.PERMISSION_PRODUCT_WRITE);

        Product product = requireProduct(productId);
        ProductStatus from = product.getStatus();
        ProductStatus next = ProductTransitions.applyTransition(from, request.getStatus());
        product.setStatus(next);
        products.save(product);

        writeAudit(principal, product.getId(), "product.status_changed", ProductTransitions.transitionDetails(from, next));

        return new ProductActionResponse(product.getId().toString(), next.name());
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

    private static ProductView toView(Product product) {
        return new ProductView(
                product.getId().toString(),
                product.getProductCode(),
                product.getName(),
                product.getDescription(),
                product.getStatus().name(),
                product.getCurrentVersion() == null ? null : product.getCurrentVersion().getId().toString(),
                IsoTime.format(product.getCreatedAt()));
    }

    private static Specification<Product> buildListWhere(ProductStatus status, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isEmpty()) {
                String like = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("productCode")), like)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /** Query params for {@code GET /products}. */
    public record ProductListQuery(Integer page, Integer limit, ProductStatus status, String search, String sort) {}
}