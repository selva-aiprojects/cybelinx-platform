import { Module, ValidationPipe, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { parseEnv } from '@cybelinx/config';
import { ApiErrorFilter } from './common/filters/api-error.filter';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { TenantsModule } from './modules/tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => parseEnv(config),
    }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    TenantsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApiErrorFilter,
    },
    {
      provide: APP_PIPE,
      useFactory: () => {
        Logger.log('ValidationPipe: whitelist=true, transform=true', 'AppModule');
        return new ValidationPipe({
          whitelist: true,
          transform: true,
          forbidNonWhitelisted: true,
        });
      },
    },
  ],
})
export class AppModule {}