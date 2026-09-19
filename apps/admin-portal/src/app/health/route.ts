import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Cybelinx Central SaaS Platform',
    module: 'admin-portal',
    timestamp: new Date().toISOString(),
  });
}
