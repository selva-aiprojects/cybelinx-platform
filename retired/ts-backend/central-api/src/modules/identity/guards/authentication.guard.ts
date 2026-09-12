import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { IdentityService } from '../identity.service';
import type { Request } from 'express';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly identity: IdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers?.authorization;
    const token = getBearerToken(header);

    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const principal = await this.identity.resolvePrincipal(token);
    (request as unknown as Record<string, unknown>).user = principal;
    return true;
  }
}

function getBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const [scheme, value] = header.split(' ');
  if (scheme !== 'Bearer' || !value) {
    return null;
  }
  return value;
}