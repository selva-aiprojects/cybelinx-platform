package com.cybelinx.platform.worker;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

/**
 * Port of the NestJS {@code WorkerStateService}: in-memory worker lifecycle state with an ISO-8601
 * snapshot. Mirrors the TS behaviour exactly — {@link #heartbeat()} increments unconditionally
 * (even while {@code STOPPED}).
 */
@Component
public class WorkerState {

    public enum Status {
        STARTING,
        RUNNING,
        STOPPED
    }

    public record WorkerSnapshot(
            String status, String startedAt, String lastHeartbeatAt, long heartbeatCount) {}

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_INSTANT;

    private volatile Status status = Status.STARTING;
    private volatile OffsetDateTime startedAt;
    private volatile OffsetDateTime lastHeartbeatAt;
    private volatile long heartbeatCount;

    public void start() {
        this.status = Status.RUNNING;
        this.startedAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.lastHeartbeatAt = this.startedAt;
    }

    public void heartbeat() {
        this.lastHeartbeatAt = OffsetDateTime.now(ZoneOffset.UTC);
        this.heartbeatCount += 1;
    }

    public void stop() {
        this.status = Status.STOPPED;
    }

    public WorkerSnapshot snapshot() {
        return new WorkerSnapshot(
                status.name(),
                startedAt == null ? null : ISO.format(startedAt),
                lastHeartbeatAt == null ? null : ISO.format(lastHeartbeatAt),
                heartbeatCount);
    }
}