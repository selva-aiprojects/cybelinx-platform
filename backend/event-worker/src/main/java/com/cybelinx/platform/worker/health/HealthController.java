package com.cybelinx.platform.worker.health;

import com.cybelinx.platform.shared.PlatformConstants;
import com.cybelinx.platform.worker.WorkerState;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Port of the NestJS event-worker {@code HealthController} — {@code /health} carries service
 * metadata and {@code /health/ready} reports worker state (up only while {@code RUNNING}).
 */
@RestController
public class HealthController {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_INSTANT;

    private final WorkerState workerState;

    public HealthController(WorkerState workerState) {
        this.workerState = workerState;
    }

    @GetMapping("/health")
    public Map<String, Object> root() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("service", PlatformConstants.APP_NAME);
        body.put("module", "event-worker");
        body.put("timestamp", ISO.format(OffsetDateTime.now(ZoneOffset.UTC)));
        return body;
    }

    @GetMapping("/health/live")
    public Map<String, Object> live() {
        Map<String, Object> indicator = new LinkedHashMap<>();
        indicator.put("status", "up");

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("liveness", indicator);

        return terminusBody("ok", info, new LinkedHashMap<String, Object>());
    }

    @GetMapping("/health/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        WorkerState.WorkerSnapshot snapshot = workerState.snapshot();
        boolean healthy = "RUNNING".equals(snapshot.status());

        Map<String, Object> indicator = new LinkedHashMap<>();
        indicator.put("status", healthy ? "up" : "down");
        indicator.put("workerStatus", snapshot.status());
        indicator.put("heartbeatCount", snapshot.heartbeatCount());

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("worker", indicator);

        if (healthy) {
            return ResponseEntity.ok(terminusBody("ok", info, new LinkedHashMap<String, Object>()));
        }

        Map<String, Object> error = new LinkedHashMap<>();
        error.put("worker", indicator);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(terminusBody("error", new LinkedHashMap<String, Object>(), error));
    }

    private Map<String, Object> terminusBody(
            String status, Map<String, Object> info, Map<String, Object> error) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status);
        body.put("info", info);
        body.put("error", error);
        Map<String, Object> details = new LinkedHashMap<>();
        details.putAll(info);
        details.putAll(error);
        body.put("details", details);
        return body;
    }
}