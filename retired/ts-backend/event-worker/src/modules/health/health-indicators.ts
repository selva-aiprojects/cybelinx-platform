import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { WorkerStateService } from '../../worker/worker-state.service';

@Injectable()
export class LivenessIndicator extends HealthIndicator {
  isHealthy(key: string): HealthIndicatorResult {
    return this.getStatus(key, true);
  }
}

@Injectable()
export class WorkerIndicator extends HealthIndicator {
  constructor(private readonly state: WorkerStateService) {
    super();
  }

  isHealthy(key: string): HealthIndicatorResult {
    const snapshot = this.state.snapshot();
    return this.getStatus(key, snapshot.status === 'RUNNING', {
      workerStatus: snapshot.status,
      heartbeatCount: snapshot.heartbeatCount,
    });
  }
}