import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../../prisma/prisma.module';
import { HealthController } from './health.controller';
import { DatabaseIndicator, LivenessIndicator } from './health-indicators';

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [LivenessIndicator, DatabaseIndicator],
})
export class HealthModule {}