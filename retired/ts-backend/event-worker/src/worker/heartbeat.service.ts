import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { WorkerStateService } from './worker-state.service';

const HEARTBEAT_INTERVAL_MS = 30_000;

@Injectable()
export class HeartbeatService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(HeartbeatService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly state: WorkerStateService) {}

  onApplicationBootstrap(): void {
    this.state.start();
    this.logger.log(
      'Event outbox polling is not implemented yet — heartbeat service running (scaffold)',
    );

    this.timer = setInterval(() => {
      this.state.heartbeat();
      this.logger.log(`Worker heartbeat #${this.state.snapshot().heartbeatCount}`);
    }, HEARTBEAT_INTERVAL_MS);

    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.state.stop();
  }
}