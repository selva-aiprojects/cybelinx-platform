import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthPrincipal } from '../identity-provider.adapter';

export const CurrentPrincipal = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthPrincipal | undefined => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as AuthPrincipal | undefined;
});