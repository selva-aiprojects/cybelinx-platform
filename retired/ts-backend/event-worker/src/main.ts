import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { API_PREFIX, APP_NAME } from '@cybelinx/shared';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('WORKER_PORT', 3002);

  await app.listen(port);

  Logger.log(
    `${APP_NAME} event worker running on http://localhost:${port}${API_PREFIX}`,
    'Bootstrap',
  );
}

void bootstrap();