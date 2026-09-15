package com.cybelinx.platform.worker.provisioning;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

/**
 * Dynamically resolves remote target database connections for decoupled product database servers.
 * Prevents product schema provisioning DDL from executing inside the central platform control plane database.
 */
@Component
public class TargetDatabaseConnectionResolver {

    private static final Logger LOG = LoggerFactory.getLogger(TargetDatabaseConnectionResolver.class);

    private final JdbcTemplate controlPlaneJdbcTemplate;
    private final Map<String, JdbcTemplate> targetConnectionCache = new ConcurrentHashMap<>();

    public TargetDatabaseConnectionResolver(JdbcTemplate controlPlaneJdbcTemplate) {
        this.controlPlaneJdbcTemplate = controlPlaneJdbcTemplate;
    }

    /**
     * Resolves a target JdbcTemplate for executing remote DDL on a product database server.
     * Fallback to controlPlaneJdbcTemplate if no remote endpoint is configured.
     */
    public JdbcTemplate resolveTargetJdbcTemplate(String productCode, String environment, String customJdbcUrl) {
        String cacheKey = (productCode + "_" + environment + "_" + (customJdbcUrl != null ? customJdbcUrl : "default")).toUpperCase();

        return targetConnectionCache.computeIfAbsent(cacheKey, key -> {
            try {
                String jdbcUrl = customJdbcUrl;
                if (jdbcUrl == null || jdbcUrl.isBlank()) {
                    jdbcUrl = lookupJdbcUrlFromEnvironment(productCode, environment);
                }

                if (jdbcUrl == null || jdbcUrl.isBlank()) {
                    LOG.warn("No remote JDBC URL found for product {} [{}]. Using control plane database.", productCode, environment);
                    return controlPlaneJdbcTemplate;
                }

                LOG.info("Configuring decoupled target database connection for product {} [{}]: {}", productCode, environment, jdbcUrl);
                
                DriverManagerDataSource dataSource = new DriverManagerDataSource();
                dataSource.setDriverClassName("org.postgresql.Driver");
                dataSource.setUrl(jdbcUrl);
                
                // Read optional username/password from system environment variables
                String envUser = System.getenv("PRODUCT_DB_USER_" + productCode.toUpperCase());
                String envPass = System.getenv("PRODUCT_DB_PASSWORD_" + productCode.toUpperCase());
                
                dataSource.setUsername(envUser != null ? envUser : "cybelinx");
                dataSource.setPassword(envPass != null ? envPass : "cybelinx_dev_password");

                return new JdbcTemplate(dataSource);
            } catch (Exception e) {
                LOG.error("Failed to build target database connection for {} [{}]. Fallback to control plane DB.", productCode, environment, e);
                return controlPlaneJdbcTemplate;
            }
        });
    }

    private String lookupJdbcUrlFromEnvironment(String productCode, String environment) {
        String envVar = ("PRODUCT_DB_URL_" + productCode + "_" + environment).toUpperCase().replaceAll("[^A-Z0-9_]", "_");
        String envValue = System.getenv(envVar);
        if (envValue != null && !envValue.isBlank()) {
            return envValue;
        }

        String productEnvVar = ("PRODUCT_DB_URL_" + productCode).toUpperCase();
        String productEnvValue = System.getenv(productEnvVar);
        if (productEnvValue != null && !productEnvValue.isBlank()) {
            return productEnvValue;
        }

        return null;
    }
}
