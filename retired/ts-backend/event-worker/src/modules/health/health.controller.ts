import { Controller, Get } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { APP_NAME } from '@cybelinx/shared';
import { LivenessIndicator, WorkerIndicator } from './health-indicators';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly liveness: LivenessIndicator,
    private readonly worker: WorkerIndicator,
  ) {}

  @Get('health')
  root() {
    return {
      status: 'ok',
      service: APP_NAME,
      module: 'event-worker',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/live')
  live() {
    return this.health.check([() => this.liveness.isHealthy('liveness')]);
  }

  @Get('health/ready')
  ready() {
    return this.health.check([() => this.worker.isHealthy('worker')]);
  }
}