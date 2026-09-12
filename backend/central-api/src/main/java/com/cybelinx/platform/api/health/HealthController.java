package com.cybelinx.platform.api.health;

import com.cybelinx.platform.shared.PlatformConstants;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Port of the NestJS {@code HealthController} — {@code /health}, {@code /health/live} and
 * {@code /health/ready} reproduce the terminus wire shapes ({@code status/info/error/details}).
 */
@RestController
public class HealthController {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_INSTANT;

    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")
    public Map<String, Object> root() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("service", PlatformConstants.APP_NAME);
        body.put("module", "control-plane-api");
        body.put("timestamp", ISO.format(OffsetDateTime.now(ZoneOffset.UTC)));
        return body;
    }

    @GetMapping("/health/live")
    public Map<String, Object> live() {
        return terminusUp("liveness");
    }

    @GetMapping("/health/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        try {
            Integer one = jdbc.queryForObject("SELECT 1", Integer.class);
            if (one == null || one != 1) {
                return databaseDown();
            }
            return ResponseEntity.ok(terminusUp("database"));
        } catch (Exception ex) {
            return databaseDown();
        }
    }

    private Map<String, Object> terminusUp(String key) {
        Map<String, Object> indicator = new LinkedHashMap<>();
        indicator.put("status", "up");

        Map<String, Object> info = new LinkedHashMap<>();
        info.put(key, indicator);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("info", info);
        body.put("error", new LinkedHashMap<String, Object>());
        body.put("details", new LinkedHashMap<>(info));
        return body;
    }

    private ResponseEntity<Map<String, Object>> databaseDown() {
        Map<String, Object> indicator = new LinkedHashMap<>();
        indicator.put("status", "down");
        indicator.put("message", "database unreachable");

        Map<String, Object> error = new LinkedHashMap<>();
        error.put("database", indicator);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "error");
        body.put("info", new LinkedHashMap<String, Object>());
        body.put("error", error);
        body.put("details", new LinkedHashMap<>(error));
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
    }
}