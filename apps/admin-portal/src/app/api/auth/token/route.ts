import { createHmac } from 'node:crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

export function GET() {
  const secret = process.env.IDP_JWT_SECRET || 'change-me-development-secret-key-1234-fallback';
  const sub = 'seed-dev-admin-0001';
  const email = 'dev.admin@cybelinx.test';
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 3600; // 7 days

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
    isProductionSecret: Boolean(process.env.IDP_JWT_SECRET),
  });
}
