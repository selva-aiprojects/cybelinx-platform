import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'Cybelinx Central SaaS Platform — Control Plane API',
      version: 'v1',
      buildId: 'build-2026-09-20-1241',
      environment: process.env.NODE_ENV ?? 'production',
      endpoints: {
        health: '/api/v1/health',
        authLogin: '/api/v1/auth/login',
        products: '/api/v1/products',
        productRepository: '/api/v1/product-repository',
        tenants: '/api/v1/tenants',
        subscriptions: '/api/v1/subscriptions',
        regions: '/api/v1/regions',
        users: '/api/v1/users',
        audit: '/api/v1/audit',
        events: '/api/v1/events',
      },
      upstreamBackend: process.env.CENTRAL_API_URL || 'Edge Gateway (Active)',
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: corsHeaders() },
  );
}
