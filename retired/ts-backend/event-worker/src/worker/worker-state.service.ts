import { Injectable } from '@nestjs/common';

export type WorkerStatus = 'STARTING' | 'RUNNING' | 'STOPPED';

export interface WorkerSnapshot {
  status: WorkerStatus;
  startedAt?: string;
  lastHeartbeatAt?: string;
  heartbeatCount: number;
}

@Injectable()
export class WorkerStateService {
  private status: WorkerStatus = 'STARTING';
  private startedAt?: Date;
  private lastHeartbeatAt?: Date;
  private heartbeatCount = 0;

  start(): void {
    this.status = 'RUNNING';
    this.startedAt = new Date();
    this.lastHeartbeatAt = new Date();
  }

  heartbeat(): void {
    this.lastHeartbeatAt = new Date();
    this.heartbeatCount += 1;
  }

  stop(): void {
    this.status = 'STOPPED';
  }

  snapshot(): WorkerSnapshot {
    return {
      status: this.status,
      startedAt: this.startedAt?.toISOString(),
      lastHeartbeatAt: this.lastHeartbeatAt?.toISOString(),
      heartbeatCount: this.heartbeatCount,
    };
  }
}