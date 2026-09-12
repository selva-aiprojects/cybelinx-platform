import { Module } from '@nestjs/common';
import { WorkerStateService } from './worker-state.service';
import { HeartbeatService } from './heartbeat.service';

@Module({
  providers: [WorkerStateService, HeartbeatService],
  exports: [WorkerStateService],
})
export class WorkerModule {}