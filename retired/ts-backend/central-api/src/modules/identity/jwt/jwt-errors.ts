export type JwtVerificationReason =
  | 'MALFORMED_TOKEN'
  | 'UNSUPPORTED_ALGORITHM'
  | 'SIGNATURE_INVALID'
  | 'MISSING_SUBJECT'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'EXPIRED_TOKEN'
  | 'TOKEN_NOT_YET_VALID'
  | 'NOT_CONFIGURED';

export class JwtVerificationError extends Error {
  constructor(
    public readonly reason: JwtVerificationReason,
    message?: string,
  ) {
    super(message ?? `JWT verification failed: ${reason}`);
    this.name = 'JwtVerificationError';
  }
}