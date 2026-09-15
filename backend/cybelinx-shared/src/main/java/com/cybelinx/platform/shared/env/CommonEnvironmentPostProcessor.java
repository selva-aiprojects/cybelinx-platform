package com.cybelinx.platform.shared.env;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.util.StringUtils;

/**
 * Port of the {@code @cybelinx/config} env schema contract for Spring Boot.
 *
 * <p>Derives Spring datasource properties from the {@code DATABASE_URL} value
 * (matching {@code parseEnv}) and maps {@code LOG_LEVEL} onto the root logging
 * level so the runtime honors the platform env schema like NestJS does.
 */
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class CommonEnvironmentPostProcessor implements EnvironmentPostProcessor {

    public static final String DEFAULT_DATABASE_URL =
            "postgresql://cybelinx:cybelinx_dev_password@localhost:5432/cybelinx_platform";

    private static final Map<String, String> LOG_LEVELS =
            Map.of(
                    "error", "ERROR",
                    "warn", "WARN",
                    "info", "INFO",
                    "debug", "DEBUG",
                    "verbose", "TRACE");

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> derived = new HashMap<>();

        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (StringUtils.hasText(databaseUrl)) {
            applyDatabaseUrl(databaseUrl, derived);
        } else if (!environment.containsProperty("spring.datasource.url")
                && !StringUtils.hasText(environment.getProperty("SPRING_DATASOURCE_URL"))) {
            applyDatabaseUrl(DEFAULT_DATABASE_URL, derived);
        }

        String logLevel = environment.getProperty("LOG_LEVEL");
        if (StringUtils.hasText(logLevel)) {
            String mapped = LOG_LEVELS.getOrDefault(logLevel.trim().toLowerCase(), "INFO");
            derived.put("logging.level.root", mapped);
        }

        if (!derived.isEmpty()) {
            environment.getPropertySources().addFirst(
                    new MapPropertySource("cybelinx.platform.env", derived));
        }
    }

    private void applyDatabaseUrl(String raw, Map<String, Object> target) {
        String url = raw;
        if (url.startsWith("postgres://")) {
            url = "postgresql://" + url.substring("postgres://".length());
        }
        if (!url.startsWith("postgresql://")) {
            throw new IllegalStateException("Invalid DATABASE_URL: expected a postgresql:// connection string");
        }

        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            if (!StringUtils.hasText(host)) {
                throw new IllegalStateException("Invalid DATABASE_URL: missing host");
            }
            int port = uri.getPort();
            if (port < 0) {
                port = 5432;
            }
            String path = uri.getPath();
            String database = path != null && path.length() > 1 ? path.substring(1) : null;
            if (!StringUtils.hasText(database)) {
                throw new IllegalStateException("Invalid DATABASE_URL: missing database name");
            }

            String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + database;
            if (StringUtils.hasText(uri.getQuery())) {
                jdbcUrl += "?" + uri.getQuery();
            }
            target.put("spring.datasource.url", jdbcUrl);

            if (StringUtils.hasText(uri.getUserInfo())) {
                String[] parts = uri.getRawUserInfo().split(":", 2);
                if (parts.length > 0) {
                    target.put("spring.datasource.username", decode(parts[0]));
                }
                if (parts.length > 1) {
                    target.put("spring.datasource.password", decode(parts[1]));
                }
            }
        } catch (Exception e) {
            if (e instanceof IllegalStateException ise) {
                throw ise;
            }
            throw new IllegalStateException("Invalid DATABASE_URL: " + e.getMessage(), e);
        }
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }
}