package com.cybelinx.platform.worker.outbox;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnSingleCandidate;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * Drives {@link OutboxPollingService} on a fixed-delay daemon thread after the application is
 * ready. Starts only when a real {@link DataSource} is present, so lean contexts (health checks
 * without the outbox config) never spin the poller.
 */
@Component
@ConditionalOnSingleCandidate(DataSource.class)
public class OutboxWorker {

    private static final Logger LOG = LoggerFactory.getLogger(OutboxWorker.class);

    private final OutboxPollingService pollingService;

    private final WorkerProperties properties;

    private final ScheduledExecutorService scheduler;

    private ScheduledFuture<?> timer;

    public OutboxWorker(OutboxPollingService pollingService, WorkerProperties properties) {
        this.pollingService = pollingService;
        this.properties = properties;
        this.scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "event-worker-outbox");
            thread.setDaemon(true);
            return thread;
        });
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        LOG.info(
                "Event outbox polling active (consumer={}, batch={}, interval={}ms)",
                properties.getConsumerName(),
                properties.getBatchSize(),
                properties.getPollIntervalMs());

        this.timer = scheduler.scheduleWithFixedDelay(
                schedulingSafeRun(),
                properties.getPollIntervalMs(),
                properties.getPollIntervalMs(),
                TimeUnit.MILLISECONDS);
    }

    private Runnable schedulingSafeRun() {
        return () -> {
            try {
                pollingService.pollOnce();
            } catch (RuntimeException ex) {
                LOG.error("Outbox poll cycle failed: {}", ex.getMessage(), ex);
            }
        };
    }

    @PreDestroy
    public void onShutdown() {
        if (timer != null) {
            timer.cancel(false);
            timer = null;
        }
        scheduler.shutdownNow();
    }
}