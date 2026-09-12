import crypto from 'crypto';
import { JwtVerifier } from '../../src/modules/identity/jwt/jwt-verifier';
import { JwtVerificationError } from '../../src/modules/identity/jwt/jwt-errors';
import { HmacTokenSignatureVerifier } from '../../src/modules/identity/jwt/token-signature-verifier';

const SECRET = 'test-secret';
const ISSUER = 'https://idp.test';
const AUDIENCE = 'cybelinx-platform';

function b64url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function signToken(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }): string {
  const headerB64 = b64url({ ...header });
  const payloadB64 = b64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', SECRET).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

function makeVerifier(overrides: Partial<{ issuer: string; audience: string; clockSkewSeconds: number }> = {}): JwtVerifier {
  return new JwtVerifier({
    issuer: overrides.issuer ?? ISSUER,
    audience: overrides.audience ?? AUDIENCE,
    clockSkewSeconds: overrides.clockSkewSeconds ?? 0,
    signatureVerifier: new HmacTokenSignatureVerifier(SECRET),
  });
}

describe('JwtVerifier', () => {
  describe('valid token', () => {
    it('decodes a properly signed token with valid claims', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: 'user-123',
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
        nbf: Math.floor(Date.now() / 1000) - 10,
        email: 'alice@test.com',
        name: 'Alice',
      });

      const verified = await verifier.verify(token);

      expect(verified.header.alg).toBe('HS256');
      expect(verified.claims.sub).toBe('user-123');
      expect(verified.claims.email).toBe('alice@test.com');
      expect(verified.claims.name).toBe('Alice');
      expect(verified.token).toBe(token);
    });
  });

  describe('expired token', () => {
    it('rejects a token whose exp is in the past', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: 'user-123',
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) - 60,
        nbf: Math.floor(Date.now() / 1000) - 3600,
      });

      await expect(verifier.verify(token)).rejects.toThrow(JwtVerificationError);
      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'EXPIRED_TOKEN' });
    });
  });

  describe('invalid issuer', () => {
    it('rejects a token with a different issuer than configured', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: 'user-123',
        iss: 'https://wrong-issuer.test',
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'INVALID_ISSUER' });
    });

    it('rejects a token with no issuer when one is configured', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: 'user-123',
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'INVALID_ISSUER' });
    });
  });

  describe('invalid audience', () => {
    it('rejects a token with a different audience', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: 'user-123',
        iss: ISSUER,
        aud: 'wrong-audience',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'INVALID_AUDIENCE' });
    });

    it('rejects a token with no audience when one is configured', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: 'user-123',
        iss: ISSUER,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'INVALID_AUDIENCE' });
    });

    it('accepts a token whose aud array contains the expected audience', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: 'user-123',
        iss: ISSUER,
        aud: ['other', AUDIENCE],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      const verified = await verifier.verify(token);
      expect(verified.claims.sub).toBe('user-123');
    });
  });

  describe('missing subject', () => {
    it('rejects a token with no sub claim', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'MISSING_SUBJECT' });
    });

    it('rejects a token with an empty string sub', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: '',
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'MISSING_SUBJECT' });
    });
  });

  describe('signature validation', () => {
    it('rejects a token signed with a different secret', async () => {
      const verifier = makeVerifier();
      const wrongToken = signTokenWithSecret('wrong-secret', {
        sub: 'user-123',
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(verifier.verify(wrongToken)).rejects.toMatchObject({ reason: 'SIGNATURE_INVALID' });
    });

    it('rejects a token with a truncated signature', async () => {
      const verifier = makeVerifier();
      const valid = signToken({
        sub: 'user-123',
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const tampered = valid.slice(0, -4);

      await expect(verifier.verify(tampered)).rejects.toMatchObject({ reason: 'SIGNATURE_INVALID' });
    });
  });

  describe('malformed token', () => {
    it('rejects an empty string', async () => {
      const verifier = makeVerifier();
      await expect(verifier.verify('')).rejects.toMatchObject({ reason: 'MALFORMED_TOKEN' });
    });

    it('rejects a token with only two segments', async () => {
      const verifier = makeVerifier();
      await expect(verifier.verify('header.payload')).rejects.toMatchObject({ reason: 'MALFORMED_TOKEN' });
    });
  });

  describe('not yet valid token', () => {
    it('rejects a token whose nbf is in the future', async () => {
      const verifier = makeVerifier();
      const token = signToken({
        sub: 'user-123',
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) + 7200,
        nbf: Math.floor(Date.now() / 1000) + 3600,
      });

      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'TOKEN_NOT_YET_VALID' });
    });
  });

  describe('clock skew tolerance', () => {
    it('accepts a recently expired token when clockSkewSeconds is configured', async () => {
      const verifier = makeVerifier({ clockSkewSeconds: 30 });
      const token = signToken({
        sub: 'user-123',
        iss: ISSUER,
        aud: AUDIENCE,
        exp: Math.floor(Date.now() / 1000) - 5,
      });

      const verified = await verifier.verify(token);
      expect(verified.claims.sub).toBe('user-123');
    });
  });

  describe('algorithm mismatch', () => {
    it('rejects a token with an unsupported algorithm', async () => {
      const verifier = makeVerifier();
      const token = signToken(
        { sub: 'user-123', iss: ISSUER, aud: AUDIENCE, exp: Math.floor(Date.now() / 1000) + 3600 },
        { alg: 'none', typ: 'JWT' },
      );

      await expect(verifier.verify(token)).rejects.toMatchObject({ reason: 'UNSUPPORTED_ALGORITHM' });
    });
  });
});

function signTokenWithSecret(secret: string, payload: Record<string, unknown>): string {
  const headerB64 = b64url({ alg: 'HS256', typ: 'JWT' });
  const payloadB64 = b64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}