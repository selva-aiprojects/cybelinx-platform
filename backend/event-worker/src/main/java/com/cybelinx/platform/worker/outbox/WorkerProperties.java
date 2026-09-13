package com.cybelinx.platform.worker.outbox;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Tuning knobs for the outbox polling loop ({@code cybelinx.worker.*}). */
@ConfigurationProperties(prefix = "cybelinx.worker")
public class WorkerProperties {

    private long pollIntervalMs = 5000;

    private int batchSize = 50;

    private int maxAttempts = 5;

    private int leaseSeconds = 300;

    private String consumerName = "outbox-worker";

    public long getPollIntervalMs() {
        return pollIntervalMs;
    }

    public void setPollIntervalMs(long pollIntervalMs) {
        this.pollIntervalMs = pollIntervalMs;
    }

    public int getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(int batchSize) {
        this.batchSize = batchSize;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
        this.maxAttempts = maxAttempts;
    }

    public int getLeaseSeconds() {
        return leaseSeconds;
    }

    public void setLeaseSeconds(int leaseSeconds) {
        this.leaseSeconds = leaseSeconds;
    }

    public String getConsumerName() {
        return consumerName;
    }

    public void setConsumerName(String consumerName) {
        this.consumerName = consumerName;
    }
}