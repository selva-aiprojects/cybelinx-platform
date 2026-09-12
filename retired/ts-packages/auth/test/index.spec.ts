import { REQUIRED_JWT_CLAIMS, isJwtClaims, validateJwtClaims } from '../src';

describe('@cybelinx/auth', () => {
  it('parses the required claims constant', () => {
    expect(REQUIRED_JWT_CLAIMS).toEqual(['sub']);
  });

  it('accepts valid JWT claims', () => {
    const claims = { sub: 'user-123', iss: 'https://idp.example.com', email: 'a@b.co' };
    expect(isJwtClaims(claims)).toBe(true);
    expect(validateJwtClaims(claims)).toEqual(claims);
  });

  it('rejects claims without a subject', () => {
    expect(isJwtClaims(null)).toBe(false);
    expect(isJwtClaims({})).toBe(false);
    expect(isJwtClaims({ sub: '' })).toBe(false);
    expect(() => validateJwtClaims({ exp: 9999 })).toThrow('missing or empty sub');
  });
});