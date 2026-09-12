import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LivenessIndicator extends HealthIndicator {
  isHealthy(key: string): HealthIndicatorResult {
    return this.getStatus(key, true);
  }
}

@Injectable()
export class DatabaseIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return this.getStatus(key, true);
    } catch {
      return this.getStatus(key, false, { message: 'database unreachable' });
    }
  }
}