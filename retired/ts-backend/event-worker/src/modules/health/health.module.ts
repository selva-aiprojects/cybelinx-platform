import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { WorkerModule } from '../../worker/worker.module';
import { HealthController } from './health.controller';
import { LivenessIndicator, WorkerIndicator } from './health-indicators';

@Module({
  imports: [TerminusModule, WorkerModule],
  controllers: [HealthController],
  providers: [LivenessIndicator, WorkerIndicator],
})
export class HealthModule {}