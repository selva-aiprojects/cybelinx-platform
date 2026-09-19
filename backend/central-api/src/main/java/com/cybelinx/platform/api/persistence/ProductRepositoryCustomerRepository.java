package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.ProductRepositoryCustomer;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data access for {@code product_repository_customers}. */
public interface ProductRepositoryCustomerRepository
        extends JpaRepository<ProductRepositoryCustomer, UUID> {

    Optional<ProductRepositoryCustomer> findByProductIdAndTenantId(UUID productId, UUID tenantId);
}