import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

/**
 * Development-only token mint for local previews. In any non-development
 * environment this endpoint refuses to issue tokens unless a real admin
 * session verifies via Supabase (see SupabaseAuthWidget). Never sign with a
 * fallback secret in production.
 */
export function GET() {
  const isDev = process.env.NODE_ENV !== 'production';
  const verifiedAdmin = process.env.IDP_ADMIN_SESSION === 'verified';
  if (!isDev && !verifiedAdmin) {
    return NextResponse.json(
      { statusCode: 403, code: 'FORBIDDEN', message: 'Token minting is disabled outside development.' },
      { status: 403 },
    );
  }

  const secret = process.env.IDP_JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { statusCode: 500, code: 'SERVER_ERROR', message: 'IDP_JWT_SECRET is not configured.' },
      { status: 500 },
    );
  }

  const sub = 'seed-dev-admin-0001';
  const email = 'dev.admin@cybelinx.test';
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (isDev ? 7 * 24 * 3600 : 3600); // dev: 7 days, prod: 1 hour

  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      sub,
      email,
      roles: ['CYBELINX_PLATFORM_ADMIN', 'TENANT_ADMIN'],
      iat: now,
      exp,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest('base64url');
  const token = `${signingInput}.${signature}`;

  return NextResponse.json({
    token,
    sub,
    email,
    roles: ['CYBELINX_PLATFORM_ADMIN', 'TENANT_ADMIN'],
    expiresAt: new Date(exp * 1000).toISOString(),
    isProductionSecret: Boolean(secret),
  });
}
