import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';
import { ENVIRONMENTS, ISOLATION_MODES, PRODUCT_CODES } from '@cybelinx/types';

export class TenantResourceRequestDto {
  @ApiProperty({ description: 'Resource type code from the platform catalog (e.g. POSTGRES_SCHEMA)' })
  @IsString()
  @MaxLength(64)
  resourceTypeCode: string;

  @ApiPropertyOptional({ enum: ISOLATION_MODES, default: 'SHARED_POOL' })
  @IsOptional()
  @IsIn(ISOLATION_MODES)
  isolationMode?: (typeof ISOLATION_MODES)[number];

  @ApiPropertyOptional({ enum: ENVIRONMENTS, default: 'DEVELOPMENT' })
  @IsOptional()
  @IsIn(ENVIRONMENTS)
  environment?: (typeof ENVIRONMENTS)[number];
}

export class TenantProductRequestDto {
  @ApiProperty({ enum: PRODUCT_CODES })
  @IsString()
  @IsIn(PRODUCT_CODES)
  productCode: (typeof PRODUCT_CODES)[number];

  @ApiPropertyOptional({ description: 'Plan code; defaults to the product default plan when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  planCode?: string;

  @ApiPropertyOptional({ description: 'When set, a provisionable resource is requested (kicks off provisioning)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantResourceRequestDto)
  resource?: TenantResourceRequestDto;
}

export class CreateTenantDto {
  @ApiProperty({ description: 'Unique, uppercase alpha-numeric tenant code' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]{1,63}$/, { message: 'tenantCode must be 2-64 chars, uppercase letters, digits or "_"' })
  tenantCode: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Region code as registered in the platform catalog' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  regionCode?: string;

  @ApiPropertyOptional({ example: 'NG' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'country must be a two-letter ISO-3166 code' })
  country?: string;

  @ApiPropertyOptional({ example: 'Africa/Lagos' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ type: [TenantProductRequestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TenantProductRequestDto)
  products?: TenantProductRequestDto[];
}