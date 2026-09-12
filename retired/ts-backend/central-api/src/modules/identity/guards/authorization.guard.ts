import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from '../authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthPrincipal } from '../identity-provider.adapter';
import type { Request } from 'express';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const principal = (request as unknown as Record<string, unknown>).user as AuthPrincipal | undefined;

    if (!principal) {
      throw new UnauthorizedException('Authentication required');
    }

    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ??
      [];

    if (required.length === 0) {
      return true;
    }

    for (const permission of required) {
      const granted = await this.authorization.hasPermission(principal.user.id, permission);
      if (granted) {
        return true;
      }
    }

    throw new ForbiddenException(`Missing required permission(s): ${required.join(', ')}`);
  }
}