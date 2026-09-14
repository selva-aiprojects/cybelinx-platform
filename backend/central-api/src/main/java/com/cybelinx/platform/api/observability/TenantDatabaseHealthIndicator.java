package com.cybelinx.platform.api.observability;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Spring Boot Actuator custom HealthIndicator verifying PostgreSQL connectivity and tenant count telemetry.
 */
@Component
public class TenantDatabaseHealthIndicator implements HealthIndicator {

    private final JdbcTemplate jdbcTemplate;

    public TenantDatabaseHealthIndicator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Health health() {
        try {
            Integer activeTenants = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM tenants WHERE status = 'ACTIVE'", Integer.class);
            Integer registeredProducts = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'", Integer.class);

            return Health.up()
                    .withDetail("database", "PostgreSQL Connected")
                    .withDetail("active_tenants", activeTenants != null ? activeTenants : 0)
                    .withDetail("active_products", registeredProducts != null ? registeredProducts : 0)
                    .build();
        } catch (Exception e) {
            return Health.down(e)
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}
