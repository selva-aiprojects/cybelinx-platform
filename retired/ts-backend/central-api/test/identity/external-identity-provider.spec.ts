import crypto from 'crypto';
import { JwtVerifier } from '../../src/modules/identity/jwt/jwt-verifier';
import { JwtVerificationError } from '../../src/modules/identity/jwt/jwt-errors';
import { HmacTokenSignatureVerifier } from '../../src/modules/identity/jwt/token-signature-verifier';
import { ExternalIdentityProvider } from '../../src/modules/identity/providers/external-identity.provider';
import { UserMappingService } from '../../src/modules/identity/user-mapping.service';
import type { ExternalUserIdentity } from '../../src/modules/identity/identity-provider.adapter';

const SECRET = 'provider-test-secret';
const ISSUER = 'https://idp.provider-test';
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

interface StoredIdentity {
  id: string;
  userId: string;
  identityProvider: string;
  externalSubject: string;
  email: string | null;
  isPrimary: boolean;
}

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  status: string;
  locale: string | null;
  timezone: string | null;
}

function createFakePrisma(): {
  users: StoredUser[];
  identities: StoredIdentity[];
  userIdentity: {
    findUnique: jest.Mock;
    upsert: jest.Mock;
  };
} {
  const identities: StoredIdentity[] = [];
  const users: StoredUser[] = [];
  let nextId = 1;

  const findUnique = jest.fn(async ({ where, include }: { where: Record<string, unknown>; include?: Record<string, boolean> }) => {
    const unique = where.user_identities_provider_subject_unique as { identityProvider: string; externalSubject: string } | undefined;
    if (!unique) return null;
    const identity = identities.find(
      (i) => i.identityProvider === unique.identityProvider && i.externalSubject === unique.externalSubject,
    );
    if (!identity) return null;
    const user = include?.user ? users.find((u) => u.id === identity.userId) ?? null : null;
    return user ? { ...identity, user } : identity;
  });

  const upsert = jest.fn(
    async ({ where, create, update }: { where: Record<string, unknown>; create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const unique = where.user_identities_provider_subject_unique as { identityProvider: string; externalSubject: string };
      const existing = identities.find(
        (i) => i.identityProvider === unique.identityProvider && i.externalSubject === unique.externalSubject,
      );
      if (existing) {
        if (typeof update.email === 'string') {
          existing.email = update.email;
        }
        const user = users.find((u) => u.id === existing.userId) ?? null;
        return { ...existing, user };
      }
      const userCreate = create.user as { create: Record<string, unknown> };
      const userId = `usr-${nextId++}`;
      const email = userCreate.create.email as string;
      const displayName = userCreate.create.displayName as string;
      const newUser: StoredUser = {
        id: userId,
        email,
        displayName,
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
    },
  );

  return { users, identities, userIdentity: { findUnique, upsert } };
}

function buildProvider(fakePrisma: ReturnType<typeof createFakePrisma>): ExternalIdentityProvider {
  const verifier = new JwtVerifier({
    issuer: ISSUER,
    audience: AUDIENCE,
    clockSkewSeconds: 0,
    signatureVerifier: new HmacTokenSignatureVerifier(SECRET),
  });
  const mapping = new UserMappingService(fakePrisma as never);
  return new ExternalIdentityProvider({ name: PROVIDER_NAME, issuer: ISSUER, audience: [AUDIENCE], verifier, mapping });
}

describe('ExternalIdentityProvider', () => {
  const identity: ExternalUserIdentity = {
    provider: PROVIDER_NAME,
    subject: 'sub-abc-123',
    email: 'alice@test.com',
    name: 'Alice',
  };

  describe('validateToken', () => {
    it('returns validated claims for a valid token', async () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);
      const token = signToken({
        sub: identity.subject,
        iss: ISSUER,
        aud: AUDIENCE,
        email: identity.email,
        name: identity.name,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const validated = await provider.validateToken(token);

      expect(validated.provider).toBe(PROVIDER_NAME);
      expect(validated.token).toBe(token);
      expect(validated.header.alg).toBe('HS256');
      expect(validated.claims.sub).toBe(identity.subject);
      expect(validated.claims.email).toBe(identity.email);
    });

    it('throws on an expired token', async () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);
      const token = signToken({
        sub: identity.subject,
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) - 60,
      });

      await expect(provider.validateToken(token)).rejects.toThrow(JwtVerificationError);
      await expect(provider.validateToken(token)).rejects.toMatchObject({ reason: 'EXPIRED_TOKEN' });
    });
  });

  describe('getUserIdentity', () => {
    it('extracts external identity from validated claims', async () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);
      const token = signToken({
        sub: identity.subject,
        iss: ISSUER,
        aud: AUDIENCE,
        email: identity.email,
        name: identity.name,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const validated = await provider.validateToken(token);
      const externalUser = await provider.getUserIdentity(validated);

      expect(externalUser.provider).toBe(PROVIDER_NAME);
      expect(externalUser.subject).toBe(identity.subject);
      expect(externalUser.email).toBe(identity.email);
      expect(externalUser.name).toBe(identity.name);
    });

    it('omits email and name when not present in claims', async () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);
      const token = signToken({
        sub: identity.subject,
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const validated = await provider.validateToken(token);
      const externalUser = await provider.getUserIdentity(validated);

      expect(externalUser.email).toBeUndefined();
      expect(externalUser.name).toBeUndefined();
    });
  });

  describe('mapExternalUser (unknown user)', () => {
    it('returns null when the identity is not mapped to any platform user', async () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);
      const result = await provider.mapExternalUser(identity);

      expect(result).toBeNull();
    });
  });

  describe('createUserMapping', () => {
    it('creates a platform user and identity record, then returns the mapped user', async () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);

      const mapped = await provider.createUserMapping(identity);

      expect(mapped.user.email).toBe(identity.email);
      expect(mapped.user.displayName).toBe(identity.name);
      expect(mapped.user.status).toBe('ACTIVE');
      expect(mapped.identity.identityProvider).toBe(PROVIDER_NAME);
      expect(mapped.identity.externalSubject).toBe(identity.subject);
      expect(mapped.identity.isPrimary).toBe(true);
    });

    it('creates a synthetic email when no email is provided', async () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);
      const noEmail: ExternalUserIdentity = { provider: PROVIDER_NAME, subject: 'no-email-sub' };

      const mapped = await provider.createUserMapping(noEmail);

      expect(mapped.user.email).toBe('no-email-sub@test-idp.invalid');
      expect(mapped.user.displayName).toBe('New User');
    });
  });

  describe('mapExternalUser (mapped user)', () => {
    it('returns the platform user after createUserMapping has been called', async () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);

      await provider.createUserMapping(identity);
      const user = await provider.mapExternalUser(identity);

      expect(user).not.toBeNull();
      expect(user!.email).toBe(identity.email);
      expect(user!.displayName).toBe(identity.name);
    });
  });

  describe('getProviderMetadata', () => {
    it('returns the provider name, supported algorithms and audience', () => {
      const fake = createFakePrisma();
      const provider = buildProvider(fake);
      const meta = provider.getProviderMetadata();

      expect(meta.provider).toBe(PROVIDER_NAME);
      expect(meta.issuer).toBe(ISSUER);
      expect(meta.audience).toEqual([AUDIENCE]);
      expect(meta.supportedAlgorithms).toContain('HS256');
      expect(meta.supportsJwks).toBe(false);
    });
  });
});