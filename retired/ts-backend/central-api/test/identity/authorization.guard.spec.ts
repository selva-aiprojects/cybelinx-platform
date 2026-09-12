import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from '../../src/modules/identity/guards/authorization.guard';
import { AuthorizationService } from '../../src/modules/identity/authorization.service';
import { REQUIRED_PERMISSIONS_KEY } from '../../src/modules/identity/decorators/require-permissions.decorator';
import { RequirePermissions } from '../../src/modules/identity/decorators/require-permissions.decorator';
import type { AuthPrincipal } from '../../src/modules/identity/identity-provider.adapter';

function mockRequest(user?: AuthPrincipal) {
  return { user } as Record<string, unknown>;
}

function mockContext(
  request: Record<string, unknown>,
  handler: () => void = () => {},
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

const principal: AuthPrincipal = {
  user: {
    id: 'usr-001',
    email: 'bob@test.com',
    displayName: 'Bob',
    status: 'ACTIVE',
    locale: null,
    timezone: null,
  },
  identity: {
    provider: 'test-idp',
    subject: 'sub-001',
    email: 'bob@test.com',
  },
};

function requirePermission(...perms: string[]) {
  const handler = jest.fn();
  Reflect.defineMetadata(REQUIRED_PERMISSIONS_KEY, perms, handler);
  return handler;
}

describe('AuthorizationGuard', () => {
  describe('missing principal', () => {
    it('throws UnauthorizedException when request.user is not set', async () => {
      const authz = { hasPermission: jest.fn(), listAccess: jest.fn(), isPlatformAdmin: jest.fn() };
      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthorizationGuard,
          { provide: AuthorizationService, useValue: authz },
          Reflector,
        ],
      }).compile();

      const guard = moduleRef.get(AuthorizationGuard);
      await expect(guard.canActivate(mockContext(mockRequest()))).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('no permissions required', () => {
    it('allows an authenticated request when no permissions are specified', async () => {
      const authz = { hasPermission: jest.fn(), listAccess: jest.fn(), isPlatformAdmin: jest.fn() };
      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthorizationGuard,
          { provide: AuthorizationService, useValue: authz },
          Reflector,
        ],
      }).compile();

      const guard = moduleRef.get(AuthorizationGuard);
      const result = await guard.canActivate(mockContext(mockRequest(principal)));

      expect(result).toBe(true);
      expect(authz.hasPermission).not.toHaveBeenCalled();
    });
  });

  describe('permission missing', () => {
    it('throws ForbiddenException when the principal lacks the required permission', async () => {
      const authz = {
        hasPermission: jest.fn().mockResolvedValue(false),
        listAccess: jest.fn(),
        isPlatformAdmin: jest.fn(),
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthorizationGuard,
          { provide: AuthorizationService, useValue: authz },
          Reflector,
        ],
      }).compile();

      const guard = moduleRef.get(AuthorizationGuard);
      const handler = requirePermission('tenant:read');
      const context = mockContext(mockRequest(principal), handler);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(authz.hasPermission).toHaveBeenCalledWith(principal.user.id, 'tenant:read');
    });
  });

  describe('permission granted', () => {
    it('allows an authenticated request when the required permission is granted', async () => {
      const authz = {
        hasPermission: jest.fn().mockResolvedValue(true),
        listAccess: jest.fn(),
        isPlatformAdmin: jest.fn(),
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthorizationGuard,
          { provide: AuthorizationService, useValue: authz },
          Reflector,
        ],
      }).compile();

      const guard = moduleRef.get(AuthorizationGuard);
      const handler = requirePermission('tenant:read');
      const context = mockContext(mockRequest(principal), handler);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('grants access when any one of multiple required permissions is satisfied', async () => {
      const authz = {
        hasPermission: jest.fn().mockImplementation(async (_userId: string, perm: string) => perm === 'product:read'),
        listAccess: jest.fn(),
        isPlatformAdmin: jest.fn(),
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthorizationGuard,
          { provide: AuthorizationService, useValue: authz },
          Reflector,
        ],
      }).compile();

      const guard = moduleRef.get(AuthorizationGuard);
      const handler = requirePermission('tenant:write', 'product:read');
      const context = mockContext(mockRequest(principal), handler);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(authz.hasPermission).toHaveBeenCalledWith(principal.user.id, 'tenant:write');
      expect(authz.hasPermission).toHaveBeenCalledWith(principal.user.id, 'product:read');
    });
  });

  describe('decorator usage', () => {
    it('requires a permission via @RequirePermissions decorator metadata', async () => {
      const authz = {
        hasPermission: jest.fn().mockResolvedValue(false),
        listAccess: jest.fn(),
        isPlatformAdmin: jest.fn(),
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          AuthorizationGuard,
          { provide: AuthorizationService, useValue: authz },
          Reflector,
        ],
      }).compile();

      const guard = moduleRef.get(AuthorizationGuard);

      class TestController {
        @RequirePermissions('audit:read')
        viewAudit() {}
      }

      const handler = TestController.prototype.viewAudit;
      const context = mockContext(mockRequest(principal), handler);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(authz.hasPermission).toHaveBeenCalledWith(principal.user.id, 'audit:read');
    });
  });
});