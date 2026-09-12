export type PlatformUserStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';

export interface PlatformUser {
  id: string;
  email: string;
  displayName: string;
  status: PlatformUserStatus;
  locale: string | null;
  timezone: string | null;
}

export interface PlatformUserIdentity {
  id: string;
  userId: string;
  identityProvider: string;
  externalSubject: string;
  email: string | null;
  isPrimary: boolean;
}

export interface AuthPrincipal {
  user: PlatformUser;
  identity: ExternalUserIdentity;
}

export interface ExternalUserIdentity {
  provider: string;
  subject: string;
  email?: string;
  name?: string;
}

export interface ProviderMetadata {
  provider: string;
  issuer?: string;
  audience?: string[];
  supportedAlgorithms: string[];
  supportsJwks: boolean;
}

export interface ValidatedToken {
  token: string;
  provider: string;
  header: { alg: string; kid?: string };
  claims: { sub: string; [claim: string]: unknown };
}

export interface IdentityProviderAdapter {
  getProviderMetadata(): ProviderMetadata;
  validateToken(accessToken: string): Promise<ValidatedToken>;
  getUserIdentity(validatedToken: ValidatedToken): Promise<ExternalUserIdentity>;
  mapExternalUser(identity: ExternalUserIdentity): Promise<PlatformUser | null>;
  createUserMapping(identity: ExternalUserIdentity): Promise<{ user: PlatformUser; identity: PlatformUserIdentity }>;
}

export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');