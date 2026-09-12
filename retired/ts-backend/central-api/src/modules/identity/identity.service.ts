import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtVerificationError } from './jwt/jwt-errors';
import {
  IDENTITY_PROVIDER,
  type AuthPrincipal,
  type IdentityProviderAdapter,
  type ProviderMetadata,
  type ValidatedToken,
} from './identity-provider.adapter';

@Injectable()
export class IdentityService {
  constructor(@Inject(IDENTITY_PROVIDER) private readonly provider: IdentityProviderAdapter) {}

  getProvider(): ProviderMetadata {
    return this.provider.getProviderMetadata();
  }

  async validateToken(accessToken: string): Promise<ValidatedToken> {
    try {
      return await this.provider.validateToken(accessToken);
    } catch (error) {
      if (error instanceof JwtVerificationError) {
        throw new UnauthorizedException(`Invalid access token: ${error.reason}`);
      }
      throw error;
    }
  }

  async resolvePrincipal(accessToken: string): Promise<AuthPrincipal> {
    const validated = await this.validateToken(accessToken);
    const identity = await this.provider.getUserIdentity(validated);
    const user = await this.provider.mapExternalUser(identity);

    if (!user) {
      throw new UnauthorizedException('Access token is valid but the user is not mapped to the platform');
    }

    return { user, identity };
  }
}