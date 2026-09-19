import { NextRequest, NextResponse } from 'next/server';
import { mockStore, INITIAL_TENANTS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

function error(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { statusCode: status, message, code: code ?? 'INVALID_REQUEST' },
    { status, headers: corsHeaders() },
  );
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function createDevToken(email: string, roles: string[]): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: '00000000-0000-0000-0000-000000000099',
      iss: 'cybelinx-control-plane',
      aud: 'cybelinx-admin-portal',
      email,
      roles,
      iat: now,
      exp: now + 86400 * 7, // 7 days
    }),
  );
  const signature = base64UrlEncode('cybelinx-dev-signature-verified');
  return `${header}.${payload}.${signature}`;
}

async function tryProxy(req: NextRequest, path: string[]) {
  const upstreamBase = process.env.CENTRAL_API_URL;
  if (!upstreamBase) return null;

  const targetUrl = `${upstreamBase.replace(/\/$/, '')}/${path.join('/')}${req.nextUrl.search}`;
  try {
    const headers = new Headers(req.headers);
    headers.delete('host');
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined;
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });

    if (upstreamRes.status >= 500) {
      console.warn(`Upstream ${targetUrl} returned ${upstreamRes.status}, falling back to edge store`);
      return null;
    }

    const resData = await upstreamRes.text();
    const responseHeaders = new Headers(upstreamRes.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('connection');

    return new NextResponse(resData, {
      status: upstreamRes.status,
      headers: {
        ...Object.fromEntries(responseHeaders.entries()),
        ...corsHeaders(),
      },
    });
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const proxyResponse = await tryProxy(req, path);
  if (proxyResponse) return proxyResponse;

  const [p0, p1, p2, p3, p4] = path;

  // 1. Health check
  if (p0 === 'health') {
    return json({
      status: 'ok',
      service: 'Cybelinx Central SaaS Platform',
      module: 'control-plane-api',
      mode: 'edge-gateway',
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Products
  if (p0 === 'products') {
    if (!p1) {
      return json({
        data: mockStore.products,
        meta: {
          page: 1,
          limit: 50,
          total: mockStore.products.length,
          totalPages: 1,
        },
      });
    }

    const product = mockStore.products.find((p) => p.productId === p1 || p.productCode === p1);
    if (!product) return error(`Product ${p1} not found`, 404, 'PRODUCT_NOT_FOUND');

    if (p2 === 'plans') {
      if (!p3) {
        return json({ data: mockStore.plans[product.productId] ?? [] });
      }
      const plan = (mockStore.plans[product.productId] ?? []).find((pl) => pl.planId === p3 || pl.planCode === p3);
      if (!plan) return error(`Plan ${p3} not found`, 404, 'PLAN_NOT_FOUND');

      if (p4 === 'entitlements') {
        return json({ data: mockStore.entitlements[plan.planId] ?? [] });
      }
      return json(plan);
    }

    if (p2 === 'versions') {
      return json({ data: mockStore.productVersions[product.productId] ?? [] });
    }

    return json(product);
  }

  // 3. Product Repository
  if (p0 === 'product-repository') {
    if (!p1) {
      return json({
        data: mockStore.repositories,
        meta: { page: 1, limit: 50, total: mockStore.repositories.length, totalPages: 1 },
      });
    }

    const repo = mockStore.repositories.find((r) => r.productId === p1 || r.productCode === p1);
    if (!repo) return error(`Product repository ${p1} not found`, 404, 'REPOSITORY_NOT_FOUND');

    const customers = mockStore.tenants.map((t) => ({
      tenantId: t.tenantId,
      tenantCode: t.tenantCode,
      tenantName: t.name,
      productCode: repo.productCode,
      tenantSchema: `tenant_${t.tenantCode}_${repo.productCode.toLowerCase()}`,
      databaseName: 'cybelinx_platform',
      contactPerson: t.contactEmail ? t.contactEmail.split('@')[0] : 'Admin',
      contactEmail: t.contactEmail ?? 'admin@cybelinx.test',
    }));

    return json({
      ...repo,
      customers,
      subscriptions: mockStore.subscriptions.filter((s) => s.productCode === repo.productCode),
    });
  }

  // 4. Tenants
  if (p0 === 'tenants') {
    if (!p1) {
      return json({
        data: mockStore.tenants,
        meta: { page: 1, limit: 50, total: mockStore.tenants.length, totalPages: 1 },
      });
    }

    const tenant = mockStore.tenants.find((t) => t.tenantId === p1 || t.tenantCode === p1);
    if (!tenant) return error(`Tenant ${p1} not found`, 404, 'TENANT_NOT_FOUND');

    if (p2 === 'external-ids') {
      return json({ data: [] });
    }

    if (p2 === 'usage') {
      return json({ data: [] });
    }

    return json({
      tenant,
      products: mockStore.tenantProducts[tenant.tenantId] ?? [],
      resources: mockStore.tenantResources[tenant.tenantId] ?? [],
      provisioningJobs: mockStore.provisioningJobs[tenant.tenantId] ?? [],
      memberships: mockStore.memberships[tenant.tenantId] ?? [],
    });
  }

  // 5. Subscriptions
  if (p0 === 'subscriptions') {
    return json({ data: mockStore.subscriptions });
  }

  // 6. Regions
  if (p0 === 'regions') {
    return json({
      data: [
        { regionCode: 'in-south-1', name: 'India (Mumbai)' },
        { regionCode: 'us-east-1', name: 'US East (N. Virginia)' },
        { regionCode: 'eu-central-1', name: 'Europe (Frankfurt)' },
        { regionCode: 'ap-southeast-1', name: 'Asia Pacific (Singapore)' },
      ],
    });
  }

  // 7. Users
  if (p0 === 'users') {
    return json({
      data: [
        {
          userId: '00000000-0000-0000-0000-000000000099',
          email: 'dev.admin@cybelinx.test',
          name: 'Platform Administrator',
          roles: ['CYBELINX_PLATFORM_ADMIN'],
          status: 'ACTIVE',
        },
      ],
    });
  }

  // 8. Audit Log
  if (p0 === 'audit') {
    return json({
      data: [
        {
          auditId: 'aud-001',
          action: 'DEPLOYMENT_ACTIVE',
          resource: 'CONTROL_PLANE',
          actor: 'dev.admin@cybelinx.test',
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  // 9. Platform Events
  if (p0 === 'events') {
    return json({
      data: [
        {
          eventId: 'evt-001',
          eventType: 'SUBSCRIPTION_PROVISIONED',
          payload: { productCode: 'JIOPLIX', planCode: 'JIOPLIX_ENTERPRISE' },
          timestamp: new Date().toISOString(),
        },
      ],
    });
  }

  return error(`Path /${path.join('/')} not found`, 404, 'NOT_FOUND');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const proxyResponse = await tryProxy(req, path);
  if (proxyResponse) return proxyResponse;

  const [p0, p1, p2, p3] = path;

  // Login
  if (p0 === 'auth' && p1 === 'login') {
    const body = await req.json().catch(() => ({}));
    const email = (body.email as string)?.trim() || 'dev.admin@cybelinx.test';
    const roles = ['CYBELINX_PLATFORM_ADMIN'];
    const token = createDevToken(email, roles);
    const expiresAt = new Date(Date.now() + 86400 * 7 * 1000).toISOString();

    return json({
      token,
      sub: '00000000-0000-0000-0000-000000000099',
      email,
      roles,
      expiresAt,
      isProductionSecret: false,
    });
  }

  // Create Product
  if (p0 === 'products' && !p1) {
    const body = await req.json().catch(() => ({}));
    const newProduct = {
      productId: `prod-${Date.now()}`,
      productCode: body.productCode || 'CUSTOM_PROD',
      name: body.name || 'Custom Product',
      description: body.description || '',
      baseUrl: body.baseUrl || '',
      status: 'ACTIVE' as const,
      currentVersionId: null,
      createdAt: new Date().toISOString(),
    };
    mockStore.products.push(newProduct);
    return json(newProduct, 201);
  }

  // Create Plan
  if (p0 === 'products' && p1 && p2 === 'plans' && !p3) {
    const body = await req.json().catch(() => ({}));
    const newPlan = {
      planId: `plan-${Date.now()}`,
      planCode: body.planCode || 'NEW_PLAN',
      name: body.name || 'New Plan',
      description: body.description || '',
      status: 'ACTIVE' as const,
      trialDays: body.trialDays ?? 14,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!mockStore.plans[p1]) mockStore.plans[p1] = [];
    mockStore.plans[p1].push(newPlan);
    return json(newPlan, 201);
  }

  // Create Tenant
  if (p0 === 'tenants' && !p1) {
    const body = await req.json().catch(() => ({}));
    const newTenant = {
      tenantId: `ten-${Date.now()}`,
      tenantCode: body.tenantCode || `tenant-${Date.now()}`,
      name: body.name || 'New Tenant',
      status: 'ACTIVE' as const,
      regionCode: body.regionCode || 'in-south-1',
      country: body.country || 'IND',
      timezone: body.timezone || 'Asia/Kolkata',
      contactEmail: body.contactEmail || 'contact@tenant.test',
      createdAt: new Date().toISOString(),
    };
    mockStore.tenants.push(newTenant);
    return json({ tenant: newTenant }, 201);
  }

  // Create Subscription
  if (p0 === 'subscriptions') {
    const body = await req.json().catch(() => ({}));
    const tenant = mockStore.tenants.find((t) => t.tenantId === body.tenantId) || INITIAL_TENANTS[0];
    const newSub = {
      tenantProductId: `sub-${Date.now()}`,
      tenantId: tenant.tenantId,
      productCode: body.productCode || 'JIOPLIX',
      planCode: body.planCode || 'JIOPLIX_ENTERPRISE',
      status: 'ACTIVE' as const,
      activatedAt: new Date().toISOString(),
      appUrl: body.appUrl || `https://${tenant.tenantCode}.jioplix.com`,
      tenant,
    };
    mockStore.subscriptions.push(newSub);
    return json({ subscription: newSub }, 201);
  }

  return json({ status: 'ok', updated: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const proxyResponse = await tryProxy(req, path);
  if (proxyResponse) return proxyResponse;

  return json({ status: 'ok', updated: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const proxyResponse = await tryProxy(req, path);
  if (proxyResponse) return proxyResponse;

  return json({ status: 'ok', updated: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const proxyResponse = await tryProxy(req, path);
  if (proxyResponse) return proxyResponse;

  return json({ status: 'ok', deleted: true });
}
