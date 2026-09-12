import crypto from 'crypto';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtVerifier } from '../../src/modules/identity/jwt/jwt-verifier';
import { HmacTokenSignatureVerifier } from '../../src/modules/identity/jwt/token-signature-verifier';
import { UserMappingService } from '../../src/modules/identity/user-mapping.service';
import { IdentityService } from '../../src/modules/identity/identity.service';
import { AuthenticationGuard } from '../../src/modules/identity/guards/authentication.guard';
import { IDENTITY_PROVIDER } from '../../src/modules/identity/identity-provider.adapter';
import { ExternalIdentityProvider } from '../../src/modules/identity/providers/external-identity.provider';
import type { AuthPrincipal } from '../../src/modules/identity/identity-provider.adapter';

const SECRET = 'guard-test-secret';
const ISSUER = 'https://idp.guard-test';
const AUDIENCE = 'cybelinx-platform';
const PROVIDER_NAME = 'test-idp';

function b64url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function signToken(payload: Record<string, unknown>): string {
  const headerB64 = b64url({ alg: 'HS256', typ: 'JWT' });
  const payloadB64 = b64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', SECRET).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  status: string;
  locale: string | null;
  timezone: string | null;
}

interface StoredIdentity {
  id: string;
  userId: string;
  identityProvider: string;
  externalSubject: string;
  email: string | null;
  isPrimary: boolean;
}

function createFakePrisma() {
  const users: StoredUser[] = [];
  const identities: StoredIdentity[] = [];
  let nextId = 1;

  return {
    users,
    identities,
    userIdentity: {
      findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        const unique = where.user_identities_provider_subject_unique as { identityProvider: string; externalSubject: string } | undefined;
        if (!unique) return null;
        const identity = identities.find(
          (i) => i.identityProvider === unique.identityProvider && i.externalSubject === unique.externalSubject,
        );
        if (!identity) return null;
        const user = users.find((u) => u.id === identity.userId) ?? null;
        return user ? { ...identity, user } : null;
      }),
      upsert: jest.fn(async ({ where, create }: { where: Record<string, unknown>; create: Record<string, unknown> }) => {
        const unique = where.user_identities_provider_subject_unique as { identityProvider: string; externalSubject: string };
        const existing = identities.find(
          (i) => i.identityProvider === unique.identityProvider && i.externalSubject === unique.externalSubject,
        );
        if (existing) {
          const user = users.find((u) => u.id === existing.userId);
          return { ...existing, user };
        }
        const userCreate = create.user as { create: Record<string, unknown> };
        const userId = `usr-${nextId++}`;
        const newUser: StoredUser = {
          id: userId,
          email: userCreate.create.email as string,
          displayName: userCreate.create.displayName as string,
          status: userCreate.create.status as string,
          locale: null,
          timezone: null,
        };
        users.push(newUser);
        const identityRecord: StoredIdentity = {
          id: `id-${nextId++}`,
          userId,
          identityProvider: create.identityProvider as string,
          externalSubject: create.externalSubject as string,
          email: create.email as string | null,
          isPrimary: true,
        };
        identities.push(identityRecord);
        return { ...identityRecord, user: newUser };
      }),
    },
  };
}

function mockContext(header?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: header !== undefined ? { authorization: header } : {},
      }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('AuthenticationGuard', () => {
  const userIdentity = { provider: PROVIDER_NAME, subject: 'sub-001', email: 'bob@test.com', name: 'Bob' };

  describe('missing bearer token', () => {
    it('throws UnauthorizedException when no Authorization header is present', async () => {
      const fake = createFakePrisma();
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: JwtVerifier,
            useFactory: () =>
              new JwtVerifier({ issuer: ISSUER, audience: AUDIENCE, clockSkewSeconds: 0, signatureVerifier: new HmacTokenSignatureVerifier(SECRET) }),
          },
          UserMappingService,
          {
            provide: IDENTITY_PROVIDER,
            useFactory: (v: JwtVerifier, m: UserMappingService) =>
              new ExternalIdentityProvider({ name: PROVIDER_NAME, issuer: ISSUER, audience: [AUDIENCE], verifier: v, mapping: m }),
            inject: [JwtVerifier, UserMappingService],
          },
          IdentityService,
          AuthenticationGuard,
        ],
      })
        .overrideProvider(UserMappingService)
        .useValue(new UserMappingService(fake as never))
        .compile();

      const guard = moduleRef.get(AuthenticationGuard);
      await expect(guard.canActivate(mockContext(undefined))).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when header is not Bearer scheme', async () => {
      const fake = createFakePrisma();
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: JwtVerifier,
            useFactory: () =>
              new JwtVerifier({ issuer: ISSUER, audience: AUDIENCE, clockSkewSeconds: 0, signatureVerifier: new HmacTokenSignatureVerifier(SECRET) }),
          },
          UserMappingService,
          {
            provide: IDENTITY_PROVIDER,
            useFactory: (v: JwtVerifier, m: UserMappingService) =>
              new ExternalIdentityProvider({ name: PROVIDER_NAME, issuer: ISSUER, audience: [AUDIENCE], verifier: v, mapping: m }),
            inject: [JwtVerifier, UserMappingService],
          },
          IdentityService,
          AuthenticationGuard,
        ],
      })
        .overrideProvider(UserMappingService)
        .useValue(new UserMappingService(fake as never))
        .compile();

      const guard = moduleRef.get(AuthenticationGuard);
      await expect(guard.canActivate(mockContext('Basic abc123'))).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('unknown user', () => {
    it('throws UnauthorizedException when the identity is not mapped', async () => {
      const fake = createFakePrisma();
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: JwtVerifier,
            useFactory: () =>
              new JwtVerifier({ issuer: ISSUER, audience: AUDIENCE, clockSkewSeconds: 0, signatureVerifier: new HmacTokenSignatureVerifier(SECRET) }),
          },
          UserMappingService,
          {
            provide: IDENTITY_PROVIDER,
            useFactory: (v: JwtVerifier, m: UserMappingService) =>
              new ExternalIdentityProvider({ name: PROVIDER_NAME, issuer: ISSUER, audience: [AUDIENCE], verifier: v, mapping: m }),
            inject: [JwtVerifier, UserMappingService],
          },
          IdentityService,
          AuthenticationGuard,
        ],
      })
        .overrideProvider(UserMappingService)
        .useValue(new UserMappingService(fake as never))
        .compile();

      const guard = moduleRef.get(AuthenticationGuard);
      const token = signToken({
        sub: userIdentity.subject,
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('invalid token', () => {
    it('throws UnauthorizedException when the token is expired', async () => {
      const fake = createFakePrisma();
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: JwtVerifier,
            useFactory: () =>
              new JwtVerifier({ issuer: ISSUER, audience: AUDIENCE, clockSkewSeconds: 0, signatureVerifier: new HmacTokenSignatureVerifier(SECRET) }),
          },
          UserMappingService,
          {
            provide: IDENTITY_PROVIDER,
            useFactory: (v: JwtVerifier, m: UserMappingService) =>
              new ExternalIdentityProvider({ name: PROVIDER_NAME, issuer: ISSUER, audience: [AUDIENCE], verifier: v, mapping: m }),
            inject: [JwtVerifier, UserMappingService],
          },
          IdentityService,
          AuthenticationGuard,
        ],
      })
        .overrideProvider(UserMappingService)
        .useValue(new UserMappingService(fake as never))
        .compile();

      const guard = moduleRef.get(AuthenticationGuard);
      const token = signToken({
        sub: userIdentity.subject,
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('mapped user', () => {
    it('attaches the principal to the request when the identity is mapped', async () => {
      const fake = createFakePrisma();
      const moduleRef = await Test.createTestingModule({
        providers: [
          {
            provide: JwtVerifier,
            useFactory: () =>
              new JwtVerifier({ issuer: ISSUER, audience: AUDIENCE, clockSkewSeconds: 0, signatureVerifier: new HmacTokenSignatureVerifier(SECRET) }),
          },
          UserMappingService,
          {
            provide: IDENTITY_PROVIDER,
            useFactory: (v: JwtVerifier, m: UserMappingService) =>
              new ExternalIdentityProvider({ name: PROVIDER_NAME, issuer: ISSUER, audience: [AUDIENCE], verifier: v, mapping: m }),
            inject: [JwtVerifier, UserMappingService],
          },
          IdentityService,
          AuthenticationGuard,
        ],
      })
        .overrideProvider(UserMappingService)
        .useValue(new UserMappingService(fake as never))
        .compile();

      const provider = moduleRef.get<ExternalIdentityProvider>(IDENTITY_PROVIDER);
      await provider.createUserMapping(userIdentity);

      const token = signToken({
        sub: userIdentity.subject,
        iss: ISSUER,
        aud: AUDIENCE,
        email: userIdentity.email,
        name: userIdentity.name,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const request: Record<string, unknown> = { headers: { authorization: `Bearer ${token}` }, user: undefined };
      const context = {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;

      const guard = moduleRef.get(AuthenticationGuard);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const principal = request.user as AuthPrincipal;
      expect(principal).toBeDefined();
      expect(principal.user.email).toBe(userIdentity.email);
      expect(principal.identity.subject).toBe(userIdentity.subject);
    });
  });
});