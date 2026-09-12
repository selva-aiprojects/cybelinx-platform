package com.cybelinx.platform.worker;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Port of the NestJS {@code HeartbeatService}: on bootstrap it flips worker state to
 * {@code RUNNING} and then emits a heartbeat every 30 seconds. The scheduler runs on daemon
 * threads (the TS timer is {@code unref()'d}) so it never keeps the JVM alive.
 */
@Component
public class HeartbeatService {

    private static final Logger LOG = LoggerFactory.getLogger(HeartbeatService.class);

    private static final long HEARTBEAT_INTERVAL_MS = 30_000;

    private final WorkerState state;
    private final ScheduledExecutorService scheduler;
    private ScheduledFuture<?> timer;

    public HeartbeatService(WorkerState state) {
        this.state = state;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "event-worker-heartbeat");
            thread.setDaemon(true);
            return thread;
        });
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        state.start();
        LOG.info("Event outbox polling is not implemented yet — heartbeat service running (scaffold)");

        this.timer = scheduler.scheduleWithFixedDelay(
                () -> {
                    state.heartbeat();
                    LOG.info("Worker heartbeat #{}", state.snapshot().heartbeatCount());
                },
                HEARTBEAT_INTERVAL_MS,
                HEARTBEAT_INTERVAL_MS,
                TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    public void onApplicationShutdown() {
        if (timer != null) {
            timer.cancel(false);
            timer = null;
        }
        scheduler.shutdownNow();
        state.stop();
    }
}