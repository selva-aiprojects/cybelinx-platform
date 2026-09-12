import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TENANT_STATUSES, TenantStatus } from '@cybelinx/types';

const SORT_KEYS = ['createdAt', 'name', 'tenantCode'] as const;

export class TenantListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TENANT_STATUSES })
  @IsOptional()
  @IsIn(TENANT_STATUSES)
  status?: TenantStatus;

  @ApiPropertyOptional({ description: 'Matches name or tenant code, case-insensitively' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort key, optionally prefixed with "-" for descending (default: -createdAt)',
    enum: ['createdAt', '-createdAt', 'name', '-name', 'tenantCode', '-tenantCode'],
  })
  @IsOptional()
  @IsIn([
    'createdAt',
    '-createdAt',
    'name',
    '-name',
    'tenantCode',
    '-tenantCode',
  ])
  sort?: string;
}

export const DEFAULT_SORT = '-createdAt' as const;

export interface ParsedSort {
  key: string;
  direction: 'asc' | 'desc';
}

export const parseSort = (sort: string | undefined): ParsedSort[] => {
  const value = sort ?? DEFAULT_SORT;
  const key = value.startsWith('-') ? value.slice(1) : value;
  const direction = value.startsWith('-') ? ('desc' as const) : ('asc' as const);
  if ((SORT_KEYS as readonly string[]).includes(key)) {
    return [{ key, direction }];
  }
  return [{ key: 'createdAt', direction: 'desc' }];
};