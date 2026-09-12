import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

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
}