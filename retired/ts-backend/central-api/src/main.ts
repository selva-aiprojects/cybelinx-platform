import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, APP_NAME } from '@cybelinx/shared';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);

  const origins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: origins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription('Control Plane API for the Cybelinx Central SaaS Platform')
    .setVersion('0.1.0')
    .addTag('health', 'Service health and readiness')
    .addTag('tenants', 'Tenant registry and lifecycle management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document);

  const port = configService.get<number>('API_PORT', 3001);
  await app.listen(port);

  Logger.log(
    `${APP_NAME} API running on http://localhost:${port}${API_PREFIX}`,
    'Bootstrap',
  );
  Logger.log(
    `${APP_NAME} API docs at http://localhost:${port}${API_PREFIX}/docs`,
    'Bootstrap',
  );
}

void bootstrap();