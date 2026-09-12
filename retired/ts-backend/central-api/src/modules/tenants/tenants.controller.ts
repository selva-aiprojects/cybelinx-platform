import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../identity/decorators/current-principal.decorator';
import { RequirePermissions } from '../identity/decorators/require-permissions.decorator';
import { AuthenticationGuard } from '../identity/guards/authentication.guard';
import { AuthorizationGuard } from '../identity/guards/authorization.guard';
import type { AuthPrincipal } from '../identity/identity-provider.adapter';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantListQueryDto } from './dto/tenant-list-query.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantPermissions } from './tenant.constants';
import type {
  CreateTenantResponse,
  TenantActionResponse,
  TenantDetailResponse,
  TenantListResponse,
} from './tenant.response';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(TenantPermissions.write)
  @ApiOperation({ summary: 'Create a tenant with its initial membership, platform role and products' })
  createTenant(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body() dto: CreateTenantDto,
  ): Promise<CreateTenantResponse> {
    return this.tenantsService.createTenant(principal, dto);
  }

  @Get()
  @RequirePermissions(TenantPermissions.read)
  @ApiOperation({ summary: 'List tenants with pagination and filtering' })
  listTenants(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query() query: TenantListQueryDto,
  ): Promise<TenantListResponse> {
    return this.tenantsService.listTenants(principal, query);
  }

  @Get(':tenantId')
  @RequirePermissions(TenantPermissions.read)
  @ApiOperation({ summary: 'Get a tenant with products, resources and provisioning jobs' })
  getTenant(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantDetailResponse> {
    return this.tenantsService.getTenant(principal, tenantId);
  }

  @Patch(':tenantId')
  @RequirePermissions(TenantPermissions.write)
  @ApiOperation({ summary: 'Update tenant profile fields' })
  updateTenant(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantDetailResponse> {
    return this.tenantsService.updateTenant(principal, tenantId, dto);
  }

  @Post(':tenantId/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(TenantPermissions.write)
  @ApiOperation({ summary: 'Suspend a tenant (and its products)' })
  suspendTenant(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantActionResponse> {
    return this.tenantsService.suspendTenant(principal, tenantId);
  }

  @Post(':tenantId/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(TenantPermissions.write)
  @ApiOperation({ summary: 'Resume a suspended tenant' })
  activateTenant(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantActionResponse> {
    return this.tenantsService.activateTenant(principal, tenantId);
  }

  @Delete(':tenantId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(TenantPermissions.write)
  @ApiOperation({
    summary: 'Request deferred deletion (tenant → DELETION_PENDING; rows are retained)',
  })
  requestDeletion(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantActionResponse> {
    return this.tenantsService.requestDeletion(principal, tenantId);
  }
}