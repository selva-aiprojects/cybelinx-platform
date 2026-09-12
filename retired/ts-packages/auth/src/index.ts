export interface JwtClaims {
  sub: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  email?: string;
  name?: string;
}

export const REQUIRED_JWT_CLAIMS = ['sub'] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isJwtClaims = (claims: unknown): claims is JwtClaims =>
  isPlainObject(claims) && typeof claims.sub === 'string' && claims.sub.length > 0;

export const validateJwtClaims = (claims: unknown): JwtClaims => {
  if (!isJwtClaims(claims)) {
    throw new Error('Invalid JWT claims: missing or empty sub claim');
  }
  return claims;
};