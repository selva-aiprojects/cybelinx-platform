import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthorizationService } from './authorization.service';
import { IDENTITY_PROVIDER } from './identity-provider.adapter';
import { IdentityService } from './identity.service';
import { JwtVerifier } from './jwt/jwt-verifier';
import {
  HmacTokenSignatureVerifier,
  JwksTokenSignatureVerifier,
  type TokenSignatureVerifier,
  UnconfiguredTokenSignatureVerifier,
} from './jwt/token-signature-verifier';
import { ExternalIdentityProvider } from './providers/external-identity.provider';
import { UserMappingService } from './user-mapping.service';
import { AuthenticationGuard } from './guards/authentication.guard';
import { AuthorizationGuard } from './guards/authorization.guard';

function createSignatureVerifier(config: ConfigService): TokenSignatureVerifier {
  const secret = config.get<string | undefined>('IDP_JWT_SECRET', undefined);
  if (secret) {
    return new HmacTokenSignatureVerifier(secret);
  }
  const jwksUri = config.get<string | undefined>('IDP_JWKS_URI', undefined);
  if (jwksUri) {
    return new JwksTokenSignatureVerifier({ jwksUri });
  }
  return new UnconfiguredTokenSignatureVerifier();
}

@Module({
  providers: [
    {
      provide: JwtVerifier,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new JwtVerifier({
          issuer: config.get<string | undefined>('IDP_ISSUER', undefined),
          audience: config.get<string | undefined>('IDP_AUDIENCE', undefined),
          clockSkewSeconds: config.get<number>('IDP_JWT_CLOCK_SKEW_SECONDS', 0),
          signatureVerifier: createSignatureVerifier(config),
        }),
    },
    UserMappingService,
    {
      provide: IDENTITY_PROVIDER,
      inject: [ConfigService, JwtVerifier, UserMappingService],
      useFactory: (
        config: ConfigService,
        verifier: JwtVerifier,
        mapping: UserMappingService,
      ) => {
        const name = config.get<string>('IDP_PROVIDER', 'generic');
        if (name === 'generic') {
          const issuer = config.get<string | undefined>('IDP_ISSUER', undefined);
          const audienceValue = config.get<string | undefined>('IDP_AUDIENCE', undefined);
          return new ExternalIdentityProvider({
            name,
            issuer,
            audience: audienceValue ? [audienceValue] : undefined,
            verifier,
            mapping,
          });
        }
        throw new Error(`Unsupported IDP_PROVIDER: ${name}`);
      },
    },
    IdentityService,
    AuthorizationService,
    AuthenticationGuard,
    AuthorizationGuard,
  ],
  exports: [
    IDENTITY_PROVIDER,
    IdentityService,
    AuthorizationService,
    AuthenticationGuard,
    AuthorizationGuard,
    JwtVerifier,
    UserMappingService,
  ],
})
export class IdentityModule {}