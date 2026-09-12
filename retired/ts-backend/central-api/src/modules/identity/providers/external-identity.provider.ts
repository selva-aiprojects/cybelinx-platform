import { JwtVerifier } from '../jwt/jwt-verifier';
import { JwtVerificationError } from '../jwt/jwt-errors';
import { UserMappingService } from '../user-mapping.service';
import type {
  ExternalUserIdentity,
  IdentityProviderAdapter,
  PlatformUser,
  PlatformUserIdentity,
  ProviderMetadata,
  ValidatedToken,
} from '../identity-provider.adapter';

export interface ExternalIdentityProviderOptions {
  name: string;
  issuer?: string;
  audience?: string[];
  verifier: JwtVerifier;
  mapping: UserMappingService;
}

export class ExternalIdentityProvider implements IdentityProviderAdapter {
  constructor(private readonly options: ExternalIdentityProviderOptions) {}

  getProviderMetadata(): ProviderMetadata {
    return {
      provider: this.options.name,
      issuer: this.options.issuer,
      audience: this.options.audience,
      supportedAlgorithms: [this.options.verifier.algorithm],
      supportsJwks: this.options.verifier.kind === 'jwks',
    };
  }

  async validateToken(accessToken: string): Promise<ValidatedToken> {
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new JwtVerificationError('MALFORMED_TOKEN');
    }

    const verified = await this.options.verifier.verify(accessToken);
    return {
      token: accessToken,
      provider: this.options.name,
      header: { alg: verified.header.alg, kid: verified.header.kid },
      claims: verified.claims,
    };
  }

  async getUserIdentity(validatedToken: ValidatedToken): Promise<ExternalUserIdentity> {
    const claims = validatedToken.claims;
    const email = typeof claims.email === 'string' ? claims.email : undefined;
    const name = typeof claims.name === 'string' ? claims.name : undefined;

    return {
      provider: validatedToken.provider,
      subject: claims.sub,
      email,
      name,
    };
  }

  async mapExternalUser(identity: ExternalUserIdentity): Promise<PlatformUser | null> {
    const mapped = await this.options.mapping.lookup(identity);
    return mapped ? mapped.user : null;
  }

  async createUserMapping(identity: ExternalUserIdentity): Promise<{
    user: PlatformUser;
    identity: PlatformUserIdentity;
  }> {
    return this.options.mapping.createMapping(identity);
  }
}