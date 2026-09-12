package com.cybelinx.platform.worker;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Port of {@code worker-state.service.spec.ts}. */
class WorkerStateTest {

    @Test
    void startsInStartingState() {
        WorkerState state = new WorkerState();

        WorkerState.WorkerSnapshot snapshot = state.snapshot();
        assertThat(snapshot.status()).isEqualTo("STARTING");
        assertThat(snapshot.heartbeatCount()).isZero();
    }

    @Test
    void transitionsToRunningOnStart() {
        WorkerState state = new WorkerState();
        state.start();

        WorkerState.WorkerSnapshot snapshot = state.snapshot();
        assertThat(snapshot.status()).isEqualTo("RUNNING");
        assertThat(snapshot.startedAt()).isNotBlank();
        assertThat(snapshot.lastHeartbeatAt()).isNotBlank();
    }

    @Test
    void countsHeartbeats() {
        WorkerState state = new WorkerState();
        state.start();
        state.heartbeat();
        state.heartbeat();

        assertThat(state.snapshot().heartbeatCount()).isEqualTo(2);
    }

    @Test
    void transitionsToStoppedOnStop() {
        WorkerState state = new WorkerState();
        state.start();
        state.stop();

        assertThat(state.snapshot().status()).isEqualTo("STOPPED");
    }

    @Test
    void heartbeatStillCountsWhileStopped() {
        WorkerState state = new WorkerState();
        state.start();
        state.stop();
        state.heartbeat();

        assertThat(state.snapshot().heartbeatCount()).isEqualTo(1);
    }
}