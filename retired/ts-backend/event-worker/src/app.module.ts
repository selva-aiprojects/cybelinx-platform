import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { parseEnv } from '@cybelinx/config';
import { WorkerModule } from './worker/worker.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => parseEnv(config),
    }),
    WorkerModule,
    HealthModule,
  ],
})
export class AppModule {}