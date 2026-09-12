import type { JwtHeader, TokenSignatureVerifier } from './token-signature-verifier';
import { JwtVerificationError } from './jwt-errors';

export interface VerifiedJwtClaims {
  sub: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  email?: string;
  name?: string;
  [claim: string]: unknown;
}

export interface VerifiedJwt {
  token: string;
  header: JwtHeader;
  claims: VerifiedJwtClaims;
}

export interface JwtVerifierOptions {
  issuer?: string;
  audience?: string;
  clockSkewSeconds?: number;
  signatureVerifier: TokenSignatureVerifier;
}

interface ParsedJwt {
  header: JwtHeader;
  payload: unknown;
  signingInput: string;
  signatureB64: string;
}

export class JwtVerifier {
  constructor(private readonly options: JwtVerifierOptions) {}

  get algorithm(): 'HS256' | 'RS256' {
    return this.options.signatureVerifier.algorithm;
  }

  get kind(): 'hmac' | 'jwks' | 'unconfigured' {
    return this.options.signatureVerifier.kind;
  }

  async verify(token: string): Promise<VerifiedJwt> {
    if (typeof token !== 'string' || token.length === 0) {
      throw new JwtVerificationError('MALFORMED_TOKEN');
    }

    const parts = this.parse(token);
    if (parts.header.alg !== this.options.signatureVerifier.algorithm) {
      throw new JwtVerificationError('UNSUPPORTED_ALGORITHM', `Unsupported JWT algorithm: ${parts.header.alg}`);
    }

    const signatureValid = await this.options.signatureVerifier.verify(parts);
    if (!signatureValid) {
      throw new JwtVerificationError('SIGNATURE_INVALID');
    }

    const claims = this.validateClaims(parts.payload);

    return {
      token,
      header: { alg: parts.header.alg, kid: parts.header.kid },
      claims,
    };
  }

  private parse(token: string): ParsedJwt {
    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new JwtVerificationError('MALFORMED_TOKEN');
    }

    const [headerB64, payloadB64, signatureB64] = segments;

    const header = this.decodeJson<JwtHeader>(headerB64, 'MALFORMED_TOKEN');
    const payload = this.decodeJson<unknown>(payloadB64, 'MALFORMED_TOKEN');

    return {
      header,
      payload,
      signingInput: `${headerB64}.${payloadB64}`,
      signatureB64,
    };
  }

  private decodeJson<T>(segment: string, reason: 'MALFORMED_TOKEN' | 'MISSING_SUBJECT' = 'MALFORMED_TOKEN'): T {
    try {
      const decoded = Buffer.from(segment, 'base64url').toString('utf8');
      return JSON.parse(decoded) as T;
    } catch (error) {
      throw new JwtVerificationError(reason, `Unable to decode JWT segment: ${String(error)}`);
    }
  }

  private validateClaims(payload: unknown): VerifiedJwtClaims {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      throw new JwtVerificationError('MISSING_SUBJECT');
    }

    const claims = payload as Record<string, unknown>;

    if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
      throw new JwtVerificationError('MISSING_SUBJECT');
    }

    if (this.options.issuer && claims.iss !== this.options.issuer) {
      throw new JwtVerificationError('INVALID_ISSUER');
    }

    if (this.options.audience) {
      const expected = this.options.audience;
      const audienceMatches =
        typeof claims.aud === 'string'
          ? claims.aud === expected
          : Array.isArray(claims.aud) && claims.aud.includes(expected);
      if (!audienceMatches) {
        throw new JwtVerificationError('INVALID_AUDIENCE');
      }
    }

    const now = Math.floor(Date.now() / 1000) - (this.options.clockSkewSeconds ?? 0);

    if (typeof claims.exp === 'number' && claims.exp <= now) {
      throw new JwtVerificationError('EXPIRED_TOKEN');
    }

    if (typeof claims.nbf === 'number' && claims.nbf > now) {
      throw new JwtVerificationError('TOKEN_NOT_YET_VALID');
    }

    return claims as VerifiedJwtClaims;
  }
}