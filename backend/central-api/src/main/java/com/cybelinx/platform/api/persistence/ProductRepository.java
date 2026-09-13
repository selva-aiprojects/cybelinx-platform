package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.Product;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Spring Data port of the {@code product} Prisma queries. */
public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    Optional<Product> findByProductCode(String productCode);
}