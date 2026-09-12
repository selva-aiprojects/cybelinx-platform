import { WorkerStateService } from '../src/worker/worker-state.service';

describe('WorkerStateService', () => {
  let state: WorkerStateService;

  beforeEach(() => {
    state = new WorkerStateService();
  });

  it('starts in STARTING state', () => {
    expect(state.snapshot().status).toBe('STARTING');
    expect(state.snapshot().heartbeatCount).toBe(0);
  });

  it('transitions to RUNNING on start', () => {
    state.start();
    const snapshot = state.snapshot();
    expect(snapshot.status).toBe('RUNNING');
    expect(snapshot.startedAt).toBeDefined();
    expect(snapshot.lastHeartbeatAt).toBeDefined();
  });

  it('counts heartbeats', () => {
    state.start();
    state.heartbeat();
    state.heartbeat();
    expect(state.snapshot().heartbeatCount).toBe(2);
  });

  it('transitions to STOPPED on stop', () => {
    state.start();
    state.stop();
    expect(state.snapshot().status).toBe('STOPPED');
  });

  it('does not heartbeat while STOPPED', () => {
    state.start();
    state.stop();
    state.heartbeat();
    expect(state.snapshot().heartbeatCount).toBe(1);
  });
});