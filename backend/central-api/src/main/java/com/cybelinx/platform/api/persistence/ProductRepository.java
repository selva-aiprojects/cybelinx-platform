package com.cybelinx.platform.api.persistence;

import com.cybelinx.platform.api.persistence.entity.Product;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Spring Data port of the {@code product} Prisma queries. */
public interface ProductRepository extends JpaRepository<Product, UUID> {

    Optional<Product> findByProductCode(String productCode);
}