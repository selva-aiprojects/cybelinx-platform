import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TenantsController } from './tenants.controller';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';

@Module({
  imports: [IdentityModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantsRepository],
})
export class TenantsModule {}