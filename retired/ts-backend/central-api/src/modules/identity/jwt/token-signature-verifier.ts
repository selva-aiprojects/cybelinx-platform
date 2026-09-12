import crypto, { type JsonWebKey } from 'crypto';
import { JwtVerificationError } from './jwt-errors';

export interface JwtHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

export interface JwtParts {
  header: JwtHeader;
  payload: unknown;
  signingInput: string;
  signatureB64: string;
}

export type TokenSignatureVerifierKind = 'hmac' | 'jwks' | 'unconfigured';

export interface TokenSignatureVerifier {
  readonly algorithm: 'HS256' | 'RS256';
  readonly kind: TokenSignatureVerifierKind;
  verify(parts: JwtParts): Promise<boolean>;
}

export class HmacTokenSignatureVerifier implements TokenSignatureVerifier {
  readonly algorithm = 'HS256' as const;
  readonly kind = 'hmac' as const;

  constructor(private readonly secret: string) {}

  async verify(parts: JwtParts): Promise<boolean> {
    const computed = crypto.createHmac('sha256', this.secret).update(parts.signingInput).digest();
    const provided = Buffer.from(parts.signatureB64, 'base64url');
    return provided.length === computed.length && crypto.timingSafeEqual(computed, provided);
  }
}

export interface JwksResponse {
  keys: JsonWebKey[];
}

export interface JwksTokenSignatureVerifierOptions {
  jwksUri: string;
  fetcher?: (uri: string) => Promise<JwksResponse>;
}

export class JwksTokenSignatureVerifier implements TokenSignatureVerifier {
  readonly algorithm = 'RS256' as const;
  readonly kind = 'jwks' as const;

  private keys: JsonWebKey[] | undefined;
  private loadedAt = 0;

  constructor(private readonly options: JwksTokenSignatureVerifierOptions) {}

  private async loadKeys(): Promise<JsonWebKey[]> {
    const ttlMs = 5 * 60 * 1000;
    if (this.keys && Date.now() - this.loadedAt < ttlMs) {
      return this.keys;
    }
    const fetcher =
      this.options.fetcher ??
      (async (uri: string): Promise<JwksResponse> => {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`JWKS fetch failed: ${response.status}`);
        }
        return (await response.json()) as JwksResponse;
      });
    const jwks = await fetcher(this.options.jwksUri);
    this.keys = jwks.keys;
    this.loadedAt = Date.now();
    return this.keys;
  }

  async verify(parts: JwtParts): Promise<boolean> {
    let keys: JsonWebKey[];
    try {
      keys = await this.loadKeys();
    } catch {
      throw new JwtVerificationError('SIGNATURE_INVALID', 'Unable to load JWKS keys');
    }

    const kid = parts.header.kid;
    const key = kid ? keys.find((candidate) => candidate.kid === kid) : keys.length === 1 ? keys[0] : undefined;
    if (!key || key.kty !== 'RSA' || typeof key.n !== 'string' || typeof key.e !== 'string') {
      return false;
    }

    const publicKey = crypto.createPublicKey({ key: { kty: 'RSA', n: key.n, e: key.e }, format: 'jwk' });
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(parts.signingInput);
    return verifier.verify(publicKey, Buffer.from(parts.signatureB64, 'base64url'));
  }
}

export class UnconfiguredTokenSignatureVerifier implements TokenSignatureVerifier {
  readonly algorithm = 'HS256' as const;
  readonly kind = 'unconfigured' as const;

  async verify(): Promise<boolean> {
    throw new JwtVerificationError('NOT_CONFIGURED', 'JWT signature verification is not configured');
  }
}