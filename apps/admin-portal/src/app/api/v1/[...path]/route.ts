import { NextRequest, NextResponse } from 'next/server';
import { mockStore, MOCK_ONBOARDING_DEFINITIONS } from '@/lib/mock-data';
import type {
  CreateTenantResponse,
  IsolationMode,
  PlanView,
  ProductVersionView,
  ProductView,
  TenantDetailResponse,
  TenantProductView,
  TenantResourceView,
  TenantView,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

// Optional proxy to real backend if configured
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
    const resData = await upstreamRes.text();
    return new NextResponse(resData, {
      status: upstreamRes.status,
      headers: {
        ...Object.fromEntries(upstreamRes.headers.entries()),
        ...corsHeaders(),
      },
    });
  } catch {
    return null;
  }
}

// ── Resend Email Service ──────────────────────────────────────────────────────
/**
 * Dispatch onboarding welcome + internal sales notification via Resend.
 * Uses RESEND_API_KEY / RESEND_FROM / RESEND_TO env vars from Vercel.
 */
async function dispatchOnboardingEmails(opts: {
  tenantCode: string;
  tenantName: string;
  productCode: string;
  planCode: string;
  schemaName: string;
  status: string;
  adminEmail?: string;
  adminName?: string;
  externalId?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('your_') || apiKey.trim() === '') return;

  const from = process.env.RESEND_FROM ?? 'Cybelinx: Product Onboarding <onboarding@cybelinx.com>';
  const salesTo = process.env.RESEND_TO ?? 'sales@cybelinx.com';

  const sendEmail = async (to: string, subject: string, html: string) => {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ from, to: [to], subject, html }),
      });
    } catch {
      // non-blocking — ignore network errors
    }
  };

  const contactName = opts.adminName || opts.adminEmail || opts.tenantName;

  // 1. Welcome email to Tenant Contact
  if (opts.adminEmail) {
    const subject = `Welcome to Cybelinx! Your ${opts.productCode} Workspace is Active (${opts.tenantName})`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0f172a;color:#f8fafc;margin:0;padding:24px;}
      .c{max-width:600px;margin:0 auto;background:#1e293b;border-radius:12px;border:1px solid #334155;padding:32px;}
      .h{border-bottom:1px solid #334155;padding-bottom:16px;margin-bottom:24px;text-align:center;}
      .brand{font-size:24px;font-weight:bold;color:#38bdf8;letter-spacing:-0.5px;}
      .badge{display:inline-block;background:#0284c7;color:#fff;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;text-transform:uppercase;margin-top:8px;}
      .card{background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #334155;}
      .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e293b;font-size:14px;}
      .lbl{color:#94a3b8;font-weight:500;}.val{color:#f8fafc;font-weight:600;font-family:monospace;}
      .btn{display:block;width:100%;background:linear-gradient(135deg,#0284c7,#9333ea);color:#fff;text-align:center;padding:14px 0;border-radius:8px;text-decoration:none;font-weight:600;margin-top:24px;}
      .footer{margin-top:32px;font-size:12px;color:#64748b;text-align:center;border-top:1px solid #334155;padding-top:16px;}
    </style></head><body><div class="c">
      <div class="h"><div class="brand">Cybelinx Multi-Tenant Platform</div>
        <div style="font-size:20px;font-weight:600;color:#f1f5f9;margin-top:8px;">Welcome &amp; Subscription Activation</div>
        <span class="badge">Product Workspace Active</span></div>
      <p>Dear <strong>${contactName}</strong>,</p>
      <p>Congratulations! Your dedicated product workspace <strong>${opts.tenantName}</strong> has been successfully provisioned on the Cybelinx platform.</p>
      <div class="card">
        <div class="row"><span class="lbl">Tenant Code</span><span class="val">${opts.tenantCode}</span></div>
        <div class="row"><span class="lbl">Product Code</span><span class="val">${opts.productCode}</span></div>
        <div class="row"><span class="lbl">Subscription Plan</span><span class="val">${opts.planCode}</span></div>
        <div class="row"><span class="lbl">Isolation Mode</span><span class="val">SCHEMA_PER_TENANT</span></div>
        <div class="row"><span class="lbl">Database Schema</span><span class="val">${opts.schemaName}</span></div>
        <div class="row"><span class="lbl">Contact Admin Email</span><span class="val">${opts.adminEmail}</span></div>
        <div class="row" style="border-bottom:none;"><span class="lbl">Onboarding Status</span><span class="val" style="color:#4ade80;">${opts.status}</span></div>
      </div>
      <p style="font-size:14px;color:#cbd5e1;">Your tenant admin identity has been granted <strong>TENANT_ADMIN</strong> role permissions with isolated database access.</p>
      <a href="https://cybelinx-platform-admin-portal.vercel.app" class="btn" target="_blank">Access Your Product Console</a>
      <div class="footer">This email was automatically dispatched by Cybelinx Control Plane Outbox Engine.<br/>© 2026 Cybelinx Inc. All rights reserved.</div>
    </div></body></html>`;
    await sendEmail(opts.adminEmail, subject, html);
  }

  // 2. Internal sales notification
  if (salesTo) {
    const salesSubject = `[Cybelinx Onboarding] New Tenant Provisioned: ${opts.tenantCode} (${opts.productCode})`;
    const salesHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
      body{font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:20px;}
      .c{max-width:600px;margin:0 auto;background:#1e293b;padding:24px;border-radius:8px;}
      .heading{color:#38bdf8;font-size:18px;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;} td{padding:8px;border-bottom:1px solid #334155;font-size:14px;}
      td.l{color:#94a3b8;font-weight:bold;} td.v{font-family:monospace;color:#f8fafc;}
    </style></head><body><div class="c">
      <div class="heading">⚡ New Tenant Provisioned Notification</div>
      <table>
        <tr><td class="l">Tenant Code</td><td class="v">${opts.tenantCode}</td></tr>
        <tr><td class="l">Tenant Name</td><td class="v">${opts.tenantName}</td></tr>
        <tr><td class="l">Product Code</td><td class="v">${opts.productCode}</td></tr>
        <tr><td class="l">Plan Code</td><td class="v">${opts.planCode}</td></tr>
        <tr><td class="l">External ID</td><td class="v">${opts.externalId ?? '—'}</td></tr>
        <tr><td class="l">Admin Email</td><td class="v">${opts.adminEmail ?? '—'}</td></tr>
        <tr><td class="l">Schema Name</td><td class="v">${opts.schemaName}</td></tr>
        <tr><td class="l">Status</td><td class="v">${opts.status}</td></tr>
      </table>
    </div></body></html>`;
    await sendEmail(salesTo, salesSubject, salesHtml);
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const proxied = await tryProxy(req, path);
  if (proxied) return proxied;

  const p = path.join('/');

  // GET /health
  if (p === 'health' || p === 'health/live' || p === 'health/ready') {
    return json({ status: 'ok', service: 'central-api', mode: 'embedded-control-plane' });
  }

  // GET /products
  if (p === 'products') {
    const search = req.nextUrl.searchParams.get('search')?.toLowerCase();
    const status = req.nextUrl.searchParams.get('status');
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.max(1, Number(req.nextUrl.searchParams.get('limit') || '20'));

    let list = mockStore.products;
    if (search) {
      list = list.filter(
        (prod) =>
          prod.productCode.toLowerCase().includes(search) || prod.name.toLowerCase().includes(search),
      );
    }
    if (status) {
      list = list.filter((prod) => prod.status === status);
    }
    const total = list.length;
    const start = (page - 1) * limit;
    const data = list.slice(start, start + limit);
    return json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  }

  // GET /products/:productId
  if (path.length === 2 && path[0] === 'products') {
    const prod = mockStore.products.find((item) => item.productId === path[1]);
    if (!prod) return error('Product not found', 404, 'NOT_FOUND');
    return json(prod);
  }

  // GET /products/:productId/versions
  if (path.length === 3 && path[0] === 'products' && path[2] === 'versions') {
    const versions = mockStore.productVersions[path[1]] || [];
    return json({ data: versions });
  }

  // GET /products/:productId/versions/:versionId
  if (path.length === 4 && path[0] === 'products' && path[2] === 'versions') {
    const v = (mockStore.productVersions[path[1]] || []).find((item) => item.versionId === path[3]);
    if (!v) return error('Version not found', 404, 'NOT_FOUND');
    return json(v);
  }

  // GET /products/:productId/plans
  if (path.length === 3 && path[0] === 'products' && path[2] === 'plans') {
    const status = req.nextUrl.searchParams.get('status');
    let plans = mockStore.plans[path[1]] || [];
    if (status) plans = plans.filter((plan) => plan.status === status);
    return json({ data: plans });
  }

  // GET /products/:productId/plans/:planId
  if (path.length === 4 && path[0] === 'products' && path[2] === 'plans') {
    const pl = (mockStore.plans[path[1]] || []).find((item) => item.planId === path[3]);
    if (!pl) return error('Plan not found', 404, 'NOT_FOUND');
    return json(pl);
  }

  // GET /products/:productId/plans/:planId/entitlements
  if (path.length === 5 && path[0] === 'products' && path[2] === 'plans' && path[4] === 'entitlements') {
    const ents = mockStore.entitlements[path[3]] || [];
    return json({ data: ents });
  }

  // GET /tenants
  if (p === 'tenants') {
    const search = req.nextUrl.searchParams.get('search')?.toLowerCase();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.max(1, Number(req.nextUrl.searchParams.get('limit') || '20'));

    let list = mockStore.tenants;
    if (search) {
      list = list.filter(
        (tenant) =>
          tenant.tenantCode.toLowerCase().includes(search) || tenant.name.toLowerCase().includes(search),
      );
    }
    const total = list.length;
    const start = (page - 1) * limit;
    const data = list.slice(start, start + limit);
    return json({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    });
  }

  // GET /tenants/:tenantId
  if (path.length === 2 && path[0] === 'tenants') {
    const tenant = mockStore.tenants.find((item) => item.tenantId === path[1]);
    if (!tenant) return error('Tenant not found', 404, 'NOT_FOUND');

    const detail: TenantDetailResponse = {
      tenant,
      products: mockStore.tenantProducts[tenant.tenantId] || [],
      resources: mockStore.tenantResources[tenant.tenantId] || [],
      provisioningJobs: mockStore.provisioningJobs[tenant.tenantId] || [],
      memberships: mockStore.memberships[tenant.tenantId] || [],
    };
    return json(detail);
  }

  // GET /tenants/:tenantId/products
  if (path.length === 3 && path[0] === 'tenants' && path[2] === 'products') {
    return json({ data: mockStore.tenantProducts[path[1]] || [] });
  }

  // GET /tenants/:tenantId/resources
  if (path.length === 3 && path[0] === 'tenants' && path[2] === 'resources') {
    return json({ data: mockStore.tenantResources[path[1]] || [] });
  }

  // GET /onboarding/jioplix/tenants/:externalId
  if (path.length === 4 && path[0] === 'onboarding' && path[1] === 'jioplix' && path[2] === 'tenants') {
    const extId = path[3];
    return json({
      status: 'SUCCESS',
      providerCode: 'JIOPLIX_NEXUS',
      externalId: extId,
      tenantId: 'd0a1b2c3-4444-5555-6666-777788889999',
      tenantCode: 'JIOPLIX_APOLLO_01',
      schemaResourceName: 'tenant_jioplix_apollo_01_jioplix',
      productCode: 'JIOPLIX',
      planCode: 'HEALTHCARE_TIER',
      domain: 'https://jioplix.com',
      provisionedAt: new Date().toISOString(),
    });
  }

  // GET /onboarding/definitions
  if (p === 'onboarding/definitions') {
    return json(MOCK_ONBOARDING_DEFINITIONS);
  }

  // GET /onboarding/definitions/:productCode
  if (path.length === 3 && path[0] === 'onboarding' && path[1] === 'definitions') {
    const pCode = path[2].toUpperCase();
    const def = MOCK_ONBOARDING_DEFINITIONS.find((item) => item.productCode === pCode);
    if (!def) return error('Product onboarding definition not found', 404, 'NOT_FOUND');
    return json(def);
  }

  // GET /onboarding/status/:productCode/:externalId
  if (path.length === 4 && path[0] === 'onboarding' && path[1] === 'status') {
    const productCode = path[2].toUpperCase();
    const externalId = decodeURIComponent(path[3]);
    const tenant = mockStore.tenants.find(
      (t) =>
        t.tenantCode.toUpperCase() === externalId.toUpperCase() ||
        t.name.toLowerCase().includes(externalId.toLowerCase()),
    );
    return json({
      externalId,
      provider: `${productCode}_NEXUS`,
      productCode,
      tenantId: tenant?.tenantId || 'd0a1b2c3-4444-5555-6666-777788889999',
      tenantCode: tenant?.tenantCode || externalId.toUpperCase(),
      tenantName: tenant?.name || externalId,
      tenantStatus: tenant?.status || 'ACTIVE',
      subscriptionStatus: 'ACTIVE',
      planCode: 'ENTERPRISE',
      resourceStatus: 'SUCCEEDED',
      schemaName: `${productCode.toLowerCase()}_${externalId.toLowerCase()}`,
      isolationMode: 'SCHEMA_PER_TENANT',
      onboardedAt: tenant?.createdAt || new Date().toISOString(),
    });
  }

  // GET /onboarding/storeai/tenants/:externalId
  if (path.length === 4 && path[0] === 'onboarding' && path[1] === 'storeai' && path[2] === 'tenants') {
    const extId = path[3];
    return json({
      externalId: extId,
      providerCode: 'STOREAI_NEXUS',
      productCode: 'STOREAI',
      tenantId: 'e1f2a3b4-5555-6666-7777-888899990000',
      tenantCode: 'STOREAI_RETAIL_01',
      tenantStatus: 'ACTIVE',
      subscriptionStatus: 'ACTIVE',
      resourceStatus: 'SUCCEEDED',
      provisionedAt: new Date().toISOString(),
    });
  }

  // GET /iam/providers
  if (p === 'iam/providers') {
    return json({
      data: [
        { provider: 'supabase', name: 'Supabase Auth (OIDC)', freeTier: '50,000 Free MAU', jwksUrl: 'https://uvddwyfcqdxuvssunuby.supabase.co/auth/v1/.well-known/jwks.json' },
        { provider: 'keycloak', name: 'Keycloak OIDC / SAML', freeTier: 'Self-Hosted Docker', jwksUrl: null },
        { provider: 'auth0', name: 'Auth0', freeTier: '7,500 Free MAU', jwksUrl: null },
      ],
    });
  }

  // GET /iam/users
  if (p === 'iam/users') {
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.max(1, Number(req.nextUrl.searchParams.get('limit') || '20'));
    const users = [
      {
        userId: 'seed-dev-admin-0001',
        email: 'dev.admin@cybelinx.test',
        displayName: 'Cybelinx Platform Admin',
        status: 'ACTIVE',
        identities: ['supabase-auth', 'jwt-bearer'],
        tenantCount: 3,
        createdAt: '2026-09-01T08:00:00Z',
      },
      {
        userId: 'user-acme-admin-001',
        email: 'admin@acme-hospital.org',
        displayName: 'ACME Hospital Admin (Dr. John Smith)',
        status: 'ACTIVE',
        identities: ['supabase-auth'],
        tenantCount: 1,
        createdAt: '2026-09-15T10:15:00Z',
      },
      {
        userId: 'user-nike-admin-002',
        email: 'merchant@nike-e2e.com',
        displayName: 'Nike Merchant Lead (Sarah Jenkins)',
        status: 'ACTIVE',
        identities: ['supabase-auth'],
        tenantCount: 1,
        createdAt: '2026-09-15T11:20:00Z',
      },
    ];
    return json({ data: users, total: users.length, meta: { page, limit, total: users.length, totalPages: 1 } });
  }

  // GET /iam/tenants/:tenantId/members
  if (path.length === 4 && path[0] === 'iam' && path[1] === 'tenants' && path[3] === 'members') {
    const tenantId = path[2].toLowerCase();
    const mockMembers = tenantId.includes('nike') ? [
      {
        membershipId: 'mem-nike-001',
        tenantId: path[2],
        userId: 'user-nike-admin-002',
        email: 'merchant@nike-e2e.com',
        displayName: 'Sarah Jenkins',
        status: 'ACTIVE',
        roleCodes: ['TENANT_ADMIN'],
        roles: ['TENANT_ADMIN'],
        permissions: ['TENANT_WRITE', 'PRODUCT_ACCESS', 'USER_MANAGE'],
        joinedAt: '2026-09-15T11:20:00Z',
      },
    ] : [
      {
        membershipId: 'mem-acme-001',
        tenantId: path[2],
        userId: 'user-acme-admin-001',
        email: 'admin@acme-hospital.org',
        displayName: 'Dr. John Smith',
        status: 'ACTIVE',
        roleCodes: ['TENANT_ADMIN'],
        roles: ['TENANT_ADMIN'],
        permissions: ['TENANT_WRITE', 'PRODUCT_ACCESS', 'USER_MANAGE'],
        joinedAt: '2026-09-15T10:15:00Z',
      },
    ];
    return json({ data: mockMembers });
  }

  // GET /audit
  if (p === 'audit') {
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.max(1, Number(req.nextUrl.searchParams.get('limit') || '20'));
    const tenantIdFilter = req.nextUrl.searchParams.get('tenantId');
    const entityTypeFilter = req.nextUrl.searchParams.get('entityType');
    let auditData = [
      {
        eventId: 'aud-001',
        action: 'product.tenant.onboarded',
        resourceType: 'TENANT',
        resourceId: 'acme',
        tenantId: 'acme',
        actorUserId: 'seed-dev-admin-0001',
        details: { tenantCode: 'ACME_HOSPITAL', productCode: 'JIOPLIX', planCode: 'JIOPLIX_ENTERPRISE', schemaName: 'tenant_acme_jioplix' },
        createdAt: '2026-09-15T10:15:00Z',
      },
      {
        eventId: 'aud-002',
        action: 'product.tenant.onboarded',
        resourceType: 'TENANT',
        resourceId: 'nike',
        tenantId: 'nike',
        actorUserId: 'seed-dev-admin-0001',
        details: { tenantCode: 'NIKE_STORE', productCode: 'STOREAI', planCode: 'STOREAI_STANDARD', schemaName: 'tenant_demo_storeai_nike_db' },
        createdAt: '2026-09-15T11:20:00Z',
      },
      {
        eventId: 'aud-003',
        action: 'iam.member.invited',
        resourceType: 'MEMBERSHIP',
        resourceId: 'mem-acme-001',
        tenantId: 'acme',
        actorUserId: 'seed-dev-admin-0001',
        details: { invitedEmail: 'admin@acme-hospital.org', role: 'TENANT_ADMIN' },
        createdAt: '2026-09-15T10:16:00Z',
      },
      {
        eventId: 'aud-004',
        action: 'iam.member.invited',
        resourceType: 'MEMBERSHIP',
        resourceId: 'mem-nike-001',
        tenantId: 'nike',
        actorUserId: 'seed-dev-admin-0001',
        details: { invitedEmail: 'merchant@nike-e2e.com', role: 'TENANT_ADMIN' },
        createdAt: '2026-09-15T11:21:00Z',
      },
      {
        eventId: 'aud-005',
        action: 'product.tenant.onboarded',
        resourceType: 'TENANT',
        resourceId: 'selva_healthcare',
        tenantId: 'selva_healthcare',
        actorUserId: 'seed-dev-admin-0001',
        details: { tenantCode: 'SELVA_HEALTHCARE', productCode: 'JIOPLIX', planCode: 'JIOPLIX_ENTERPRISE', adminEmail: 'b.selvakumar@gmail.com' },
        createdAt: '2026-09-16T12:00:00Z',
      },
    ];
    if (tenantIdFilter) auditData = auditData.filter((e) => e.tenantId === tenantIdFilter);
    if (entityTypeFilter) auditData = auditData.filter((e) => e.resourceType?.toLowerCase() === entityTypeFilter.toLowerCase());
    return json({
      data: auditData,
      meta: { page, limit, total: auditData.length, totalPages: 1 },
    });
  }

  // GET /events
  if (p === 'events') {
    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.max(1, Number(req.nextUrl.searchParams.get('limit') || '20'));
    const aggregateTypeFilter = req.nextUrl.searchParams.get('aggregateType');
    const eventTypeFilter = req.nextUrl.searchParams.get('eventType');
    let eventData = [
      {
        eventId: 'evt-outbox-001',
        aggregateType: 'TENANT',
        aggregateId: 'acme',
        eventType: 'TENANT_CREATED',
        tenantId: 'acme',
        payload: { tenantCode: 'ACME_HOSPITAL', status: 'ACTIVE', region_code: 'ap-south-1' },
        createdAt: '2026-09-15T10:15:00Z',
      },
      {
        eventId: 'evt-outbox-002',
        aggregateType: 'PRODUCT',
        aggregateId: 'jioplix',
        eventType: 'PRODUCT_ENABLED',
        tenantId: 'acme',
        payload: { tenantCode: 'ACME_HOSPITAL', productCode: 'JIOPLIX', planCode: 'JIOPLIX_ENTERPRISE' },
        createdAt: '2026-09-15T10:15:05Z',
      },
      {
        eventId: 'evt-outbox-003',
        aggregateType: 'RESOURCE',
        aggregateId: 'tenant_acme_jioplix',
        eventType: 'RESOURCE_CREATED',
        tenantId: 'acme',
        payload: { resource_type: 'POSTGRES_SCHEMA', environment: 'DEVELOPMENT', isolation_mode: 'SCHEMA_PER_TENANT', schema_name: 'tenant_acme_jioplix' },
        createdAt: '2026-09-15T10:15:10Z',
      },
      {
        eventId: 'evt-outbox-004',
        aggregateType: 'TENANT',
        aggregateId: 'nike',
        eventType: 'TENANT_CREATED',
        tenantId: 'nike',
        payload: { tenantCode: 'NIKE_STORE', status: 'ACTIVE', region_code: 'eu-west-1' },
        createdAt: '2026-09-15T11:20:00Z',
      },
      {
        eventId: 'evt-outbox-005',
        aggregateType: 'PRODUCT',
        aggregateId: 'storeai',
        eventType: 'PRODUCT_ENABLED',
        tenantId: 'nike',
        payload: { tenantCode: 'NIKE_STORE', productCode: 'STOREAI', planCode: 'STOREAI_STANDARD' },
        createdAt: '2026-09-15T11:20:05Z',
      },
      {
        eventId: 'evt-outbox-006',
        aggregateType: 'TENANT',
        aggregateId: 'selva_healthcare',
        eventType: 'TENANT_CREATED',
        tenantId: 'selva_healthcare',
        payload: { tenantCode: 'SELVA_HEALTHCARE', status: 'ACTIVE', region_code: 'ap-south-1' },
        createdAt: '2026-09-16T12:00:00Z',
      },
    ];
    if (aggregateTypeFilter) eventData = eventData.filter((e) => e.aggregateType?.toLowerCase() === aggregateTypeFilter.toLowerCase());
    if (eventTypeFilter) eventData = eventData.filter((e) => e.eventType?.toLowerCase().includes(eventTypeFilter.toLowerCase()));
    return json({
      data: eventData,
      meta: { page, limit, total: eventData.length, totalPages: 1 },
    });
  }

  // GET /regions
  if (p === 'regions') {
    return json([
      { regionId: 'reg-01', regionCode: 'ap-south-1', name: 'Asia Pacific (Mumbai)', isDefault: true },
      { regionId: 'reg-02', regionCode: 'eu-west-1', name: 'Europe (Ireland)', isDefault: false },
      { regionId: 'reg-03', regionCode: 'us-east-1', name: 'US East (N. Virginia)', isDefault: false },
    ]);
  }

  return error(`Not found: /${p}`, 404, 'NOT_FOUND');
}

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const proxied = await tryProxy(req, path);
  if (proxied) return proxied;

  const p = path.join('/');
  const body = await req.json().catch(() => ({}));

  // POST /products
  if (p === 'products') {
    const prodCode = String(body.productCode || '').trim().toUpperCase();
    const newProd: ProductView = {
      productId: crypto.randomUUID(),
      productCode: prodCode,
      name: String(body.name || '').trim(),
      description: body.description || null,
      baseUrl: body.baseUrl || `https://${prodCode.toLowerCase()}.com`,
      status: 'DRAFT',
      currentVersionId: null,
      createdAt: new Date().toISOString(),
    };
    mockStore.products.unshift(newProd);
    mockStore.productVersions[newProd.productId] = [];
    mockStore.plans[newProd.productId] = [];
    return json(newProd, 201);
  }

  // POST /products/:productId/versions
  if (path.length === 3 && path[0] === 'products' && path[2] === 'versions') {
    const productId = path[1];
    const newV: ProductVersionView = {
      versionId: crypto.randomUUID(),
      version: String(body.version || '1.0.0'),
      releaseNotes: body.releaseNotes || null,
      isCurrent: false,
      publishedAt: null,
      createdAt: new Date().toISOString(),
    };
    if (!mockStore.productVersions[productId]) mockStore.productVersions[productId] = [];
    mockStore.productVersions[productId].unshift(newV);
    return json(newV, 201);
  }

  // POST /products/:productId/plans
  if (path.length === 3 && path[0] === 'products' && path[2] === 'plans') {
    const productId = path[1];
    const newPlan: PlanView = {
      planId: crypto.randomUUID(),
      planCode: String(body.planCode || '').trim().toUpperCase(),
      name: String(body.name || '').trim(),
      description: body.description || null,
      status: 'DRAFT',
      trialDays: body.trialDays ?? 14,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!mockStore.plans[productId]) mockStore.plans[productId] = [];
    mockStore.plans[productId].push(newPlan);
    mockStore.entitlements[newPlan.planId] = [];
    return json(newPlan, 201);
  }

  // POST /products/:productId/plans/:planId/entitlements
  if (path.length === 5 && path[0] === 'products' && path[2] === 'plans' && path[4] === 'entitlements') {
    const planId = path[3];
    const newEnt = {
      entitlementId: crypto.randomUUID(),
      key: String(body.key || '').trim(),
      name: body.name || null,
      value: body.value || null,
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!mockStore.entitlements[planId]) mockStore.entitlements[planId] = [];
    mockStore.entitlements[planId].push(newEnt);
    return json(newEnt, 201);
  }

  // POST /tenants
  if (p === 'tenants') {
    const contactEmail = body.contactEmail ? String(body.contactEmail).trim() : null;
    const newTenant: TenantView = {
      tenantId: crypto.randomUUID(),
      tenantCode: String(body.tenantCode || '').trim().toLowerCase(),
      name: String(body.name || '').trim(),
      status: 'ACTIVE',
      regionCode: body.regionCode || 'eu-west-1',
      country: body.country || null,
      timezone: body.timezone || 'UTC',
      contactEmail,
      createdAt: new Date().toISOString(),
    };
    mockStore.tenants.unshift(newTenant);
    mockStore.tenantProducts[newTenant.tenantId] = [];
    mockStore.tenantResources[newTenant.tenantId] = [];
    mockStore.provisioningJobs[newTenant.tenantId] = [];
    mockStore.memberships[newTenant.tenantId] = [
      {
        membershipId: crypto.randomUUID(),
        tenantId: newTenant.tenantId,
        userId: 'seed-dev-admin-0001',
        status: 'ACTIVE',
        roleCodes: ['TENANT_OWNER', 'TENANT_ADMIN'],
        joinedAt: new Date().toISOString(),
      },
    ];

    if (Array.isArray(body.products)) {
      body.products.forEach((prod: { productCode: string; planCode?: string }) => {
        mockStore.tenantProducts[newTenant.tenantId].push({
          tenantProductId: crypto.randomUUID(),
          tenantId: newTenant.tenantId,
          productCode: prod.productCode,
          planCode: prod.planCode || 'STARTER',
          status: 'ACTIVE',
          activatedAt: new Date().toISOString(),
          appUrl: `https://${newTenant.tenantCode}.${prod.productCode.toLowerCase()}.com`,
        });
      });
    }

    if (contactEmail && Array.isArray(body.products) && body.products.length > 0) {
      const primaryProduct = body.products[0];
      dispatchOnboardingEmails({
        tenantCode: newTenant.tenantCode,
        tenantName: newTenant.name,
        productCode: primaryProduct.productCode,
        planCode: primaryProduct.planCode || 'STARTER',
        schemaName: `tenant_${newTenant.tenantCode.toLowerCase()}`,
        status: 'ACTIVE',
        adminEmail: contactEmail,
      }).catch(() => {});
    }

    const res: CreateTenantResponse = {
      tenant: newTenant,
      access: {
        userId: 'seed-dev-admin-0001',
        tenantId: newTenant.tenantId,
        membershipId: mockStore.memberships[newTenant.tenantId][0].membershipId,
        roles: ['TENANT_OWNER', 'TENANT_ADMIN'],
        permissions: ['tenant:read', 'tenant:write', 'product:read'],
      },
      products: mockStore.tenantProducts[newTenant.tenantId],
      provisioningJobs: [],
    };
    return json(res, 201);
  }

  // POST /tenants/:tenantId/suspend
  if (path.length === 3 && path[0] === 'tenants' && path[2] === 'suspend') {
    const t = mockStore.tenants.find((item) => item.tenantId === path[1]);
    if (t) t.status = 'SUSPENDED';
    return json({ tenantId: path[1], status: 'SUSPENDED' });
  }

  // POST /tenants/:tenantId/activate
  if (path.length === 3 && path[0] === 'tenants' && path[2] === 'activate') {
    const t = mockStore.tenants.find((item) => item.tenantId === path[1]);
    if (t) t.status = 'ACTIVE';
    return json({ tenantId: path[1], status: 'ACTIVE' });
  }

  // POST /tenants/:tenantId/products
  if (path.length === 3 && path[0] === 'tenants' && path[2] === 'products') {
    const tenantId = path[1];
    const tenantObj = mockStore.tenants.find((t) => t.tenantId === tenantId);
    const tenantCode = tenantObj?.tenantCode || 'app';
    const prodCode = String(body.productCode || '');
    const newTP: TenantProductView = {
      tenantProductId: crypto.randomUUID(),
      tenantId,
      productCode: prodCode,
      planCode: String(body.planCode || 'STARTER'),
      status: 'ACTIVE',
      activatedAt: new Date().toISOString(),
      appUrl: `https://${tenantCode}.${prodCode.toLowerCase()}.com`,
    };
    if (!mockStore.tenantProducts[tenantId]) mockStore.tenantProducts[tenantId] = [];
    mockStore.tenantProducts[tenantId].push(newTP);
    return json(newTP, 201);
  }

  // POST /tenants/:tenantId/resources
  if (path.length === 3 && path[0] === 'tenants' && path[2] === 'resources') {
    const tenantId = path[1];
    const newTR: TenantResourceView = {
      tenantResourceId: crypto.randomUUID(),
      tenantId,
      productCode: body.productCode,
      resourceTypeCode: body.resourceTypeCode,
      isolationMode: body.isolationMode || 'SCHEMA_PER_TENANT',
      environment: body.environment || 'PRODUCTION',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    };
    if (!mockStore.tenantResources[tenantId]) mockStore.tenantResources[tenantId] = [];
    mockStore.tenantResources[tenantId].push(newTR);
    return json(newTR, 201);
  }

  // POST /onboarding/jioplix/single
  if (p === 'onboarding/jioplix/single') {
    const tenantId = crypto.randomUUID();
    const extId = String(body.externalId || 'JIOPLIX_NEXUS');
    const tenantCode = String(body.tenantCode || 'JIOPLIX_HOSPITAL').toUpperCase();
    const name = String(body.name || 'Jioplix Healthcare Hospital');
    const prodCode = 'JIOPLIX';
    const planCode = String(body.planCode || 'HEALTHCARE_TIER');

    const newTenant: TenantView = {
      tenantId,
      tenantCode,
      name,
      status: 'ACTIVE',
      regionCode: body.regionCode || 'ap-south-1',
      country: body.country || 'IN',
      timezone: body.timezone || 'Asia/Kolkata',
      createdAt: new Date().toISOString(),
    };
    mockStore.tenants.unshift(newTenant);
    mockStore.tenantProducts[tenantId] = [{
      tenantProductId: crypto.randomUUID(),
      tenantId,
      productCode: prodCode,
      planCode,
      status: 'ACTIVE',
      activatedAt: new Date().toISOString(),
      appUrl: `https://${tenantCode.toLowerCase()}.jioplix.com`,
    }];
    mockStore.tenantResources[tenantId] = [{
      tenantResourceId: crypto.randomUUID(),
      tenantId,
      productCode: prodCode,
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'PRODUCTION',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    }];

    return json({
      status: 'SUCCESS',
      providerCode: 'JIOPLIX_NEXUS',
      externalId: extId,
      tenantId,
      tenantCode,
      schemaResourceName: `tenant_${tenantCode.toLowerCase()}_jioplix`,
      productCode: prodCode,
      planCode,
      domain: body.domain || 'https://jioplix.com',
      provisionedAt: new Date().toISOString(),
      eventsFired: ['TENANT_CREATED', 'TENANT_EXTERNAL_ID_REGISTERED', 'TENANT_PRODUCT_ATTACHED', 'RESOURCE_PROVISIONED'],
    }, 201);
  }

  // POST /onboarding/jioplix/signup
  if (p === 'onboarding/jioplix/signup') {
    const tenantId = crypto.randomUUID();
    const hospitalCode = String(body.hospitalCode || 'HOSPITAL').toUpperCase();
    const name = String(body.hospitalName || 'New SaaS Hospital');

    const newTenant: TenantView = {
      tenantId,
      tenantCode: hospitalCode,
      name,
      status: 'ACTIVE',
      regionCode: body.regionCode || 'ap-south-1',
      country: body.country || 'IN',
      timezone: 'UTC',
      createdAt: new Date().toISOString(),
    };
    mockStore.tenants.unshift(newTenant);

    return json({
      status: 'SUCCESS',
      tenantId,
      tenantCode: hospitalCode,
      hospitalName: name,
      adminEmail: body.adminEmail,
      planCode: body.planCode || 'HEALTHCARE_TIER',
      appUrl: `https://${hospitalCode.toLowerCase()}.jioplix.com`,
      createdAt: new Date().toISOString(),
    }, 201);
  }

  // POST /onboarding/storeai/single
  if (p === 'onboarding/storeai/single') {
    const tenantId = crypto.randomUUID();
    const extId = String(body.externalId || 'STOREAI_NEXUS_01');
    const tenantCode = String(body.tenantCode || 'STORE_RETAIL').toUpperCase();
    const storeName = String(body.storeName || 'StoreAI Flagship Retail');
    const planCode = String(body.planCode || 'STOREAI_ENTERPRISE');

    const newTenant: TenantView = {
      tenantId,
      tenantCode,
      name: storeName,
      status: 'ACTIVE',
      regionCode: 'eu-west-1',
      country: 'DE',
      timezone: 'Europe/Berlin',
      createdAt: new Date().toISOString(),
    };
    mockStore.tenants.unshift(newTenant);
    mockStore.tenantProducts[tenantId] = [{
      tenantProductId: crypto.randomUUID(),
      tenantId,
      productCode: 'STOREAI',
      planCode,
      status: 'ACTIVE',
      activatedAt: new Date().toISOString(),
      appUrl: `https://${tenantCode.toLowerCase()}.storeai.com`,
    }];

    return json({
      tenantId,
      tenantCode,
      storeName,
      productCode: 'STOREAI',
      planCode,
      externalId: extId,
      providerCode: 'STOREAI_NEXUS',
      status: 'SUCCESS',
      tenantStatus: 'ACTIVE',
      message: `StoreAI retail merchant '${storeName}' onboarded successfully into multi-tenant schema isolation.`,
      timestamp: new Date().toISOString(),
    }, 201);
  }

  // POST /onboarding/storeai/batch
  if (p === 'onboarding/storeai/batch') {
    const stores = Array.isArray(body.stores) ? body.stores : [];
    const results = stores.map((s: { externalId?: string; tenantCode?: string; storeName?: string; planCode?: string }) => {
      const tenantId = crypto.randomUUID();
      const extId = String(s.externalId || 'STOREAI_BATCH');
      const tCode = String(s.tenantCode || 'STORE_BATCH').toUpperCase();
      const name = String(s.storeName || 'StoreAI Batch Store');
      const pCode = String(s.planCode || 'STOREAI_ENTERPRISE');
      return {
        tenantId,
        tenantCode: tCode,
        storeName: name,
        productCode: 'STOREAI',
        planCode: pCode,
        externalId: extId,
        providerCode: 'STOREAI_NEXUS',
        status: 'SUCCESS',
        tenantStatus: 'ACTIVE',
        message: `StoreAI merchant '${name}' batch onboarded.`,
        timestamp: new Date().toISOString(),
      };
    });

    return json({
      totalProcessed: stores.length,
      succeeded: stores.length,
      failed: 0,
      results,
    }, 200);
  }

  // POST /onboarding/storeai/signup
  if (p === 'onboarding/storeai/signup') {
    const tenantId = crypto.randomUUID();
    const merchantCode = String(body.merchantCode || 'STORE').toUpperCase();
    const merchantName = String(body.merchantName || 'New Retail Merchant');
    const planCode = String(body.planCode || 'STOREAI_ENTERPRISE');

    const newTenant: TenantView = {
      tenantId,
      tenantCode: merchantCode,
      name: merchantName,
      status: 'ACTIVE',
      regionCode: body.regionCode || 'eu-west-1',
      country: body.country || 'IE',
      timezone: 'UTC',
      createdAt: new Date().toISOString(),
    };
    mockStore.tenants.unshift(newTenant);

    return json({
      tenantId,
      tenantCode: merchantCode,
      storeName: merchantName,
      productCode: 'STOREAI',
      planCode,
      externalId: `STOREAI_SELF_${merchantCode}`,
      providerCode: 'STOREAI_NEXUS',
      status: 'SUCCESS',
      tenantStatus: 'ACTIVE',
      message: `StoreAI merchant '${merchantName}' self-service signup completed successfully.`,
      timestamp: new Date().toISOString(),
    }, 201);
  }

  // POST /onboarding/execute
  if (p === 'onboarding/execute') {
    const productCode = String(body.productCode || 'GENERIC').toUpperCase();
    const externalId = String(body.externalId || `EXT_${Date.now()}`);
    const tenantCode = String(body.tenantCode || `TNT_${Date.now()}`).toUpperCase();
    const tenantName = String(body.tenantName || 'New Tenant');
    const planCode = String(body.planCode || 'ENTERPRISE').toUpperCase();
    const isolationMode = String(body.isolationMode || 'SCHEMA_PER_TENANT');
    const schemaName = String(
      body.schemaName || `${productCode.toLowerCase()}_${tenantCode.toLowerCase()}`,
    );

    // Check if tenant already exists in store
    const existingTenant = mockStore.tenants.find(
      (t) =>
        t.tenantCode.toUpperCase() === tenantCode.toUpperCase() ||
        t.name.toLowerCase() === tenantName.toLowerCase(),
    );

    if (existingTenant) {
      const tp = (mockStore.tenantProducts[existingTenant.tenantId] || []).find(
        (p) => p.productCode === productCode,
      );
      const tr = (mockStore.tenantResources[existingTenant.tenantId] || []).find(
        (r) => r.productCode === productCode,
      );

      return json(
        {
          tenantId: existingTenant.tenantId,
          tenantCode: existingTenant.tenantCode,
          tenantName: existingTenant.name,
          productCode,
          planCode: tp?.planCode || planCode,
          externalId,
          provider: `${productCode}_NEXUS`,
          status: 'ALREADY_ONBOARDED',
          tenantStatus: existingTenant.status,
          resourceStatus: tr?.provisioningState || 'SUCCEEDED',
          schemaName: `${productCode.toLowerCase()}_${existingTenant.tenantCode.toLowerCase()}`,
          message: `Tenant '${existingTenant.name}' (${existingTenant.tenantCode}) is already onboarded into Cybelinx platform. Derived existing schema resources & subscription status.`,
          timestamp: existingTenant.createdAt,
          executedSteps: [
            'IDEMPOTENT_LOOKUP',
            'DERIVE_EXISTING_METADATA',
            'ATTACH_SUBSCRIPTION',
            'PROVISION_SCHEMA',
          ],
        },
        200,
      );
    }

    const tenantId = crypto.randomUUID();

    const newTenant: TenantView = {
      tenantId,
      tenantCode,
      name: tenantName,
      status: 'ACTIVE',
      regionCode: body.regionCode || 'ap-south-1',
      country: body.country || 'IN',
      timezone: body.timezone || 'Asia/Kolkata',
      contactEmail: (body.adminEmail || body.contactEmail || null) as string | null,
      createdAt: new Date().toISOString(),
    };
    mockStore.tenants.unshift(newTenant);

    if (!mockStore.tenantProducts[tenantId]) mockStore.tenantProducts[tenantId] = [];
    mockStore.tenantProducts[tenantId].push({
      tenantProductId: crypto.randomUUID(),
      tenantId,
      productCode,
      planCode,
      status: 'ACTIVE',
      activatedAt: new Date().toISOString(),
      appUrl: `https://${tenantCode.toLowerCase()}.${productCode.toLowerCase()}.com`,
    });

    if (!mockStore.tenantResources[tenantId]) mockStore.tenantResources[tenantId] = [];
    mockStore.tenantResources[tenantId].push({
      tenantResourceId: crypto.randomUUID(),
      tenantId,
      productCode,
      resourceTypeCode: 'POSTGRES_SCHEMA',
      isolationMode: isolationMode as IsolationMode,
      environment: body.environment || 'PRODUCTION',
      status: 'ACTIVE',
      provisioningState: 'SUCCEEDED',
    });

    const responsePayload = {
      tenantId,
      tenantCode,
      tenantName,
      productCode,
      planCode,
      externalId,
      provider: `${productCode}_NEXUS`,
      status: 'SUCCESS',
      tenantStatus: 'ACTIVE',
      resourceStatus: 'SUCCEEDED',
      schemaName,
      message: `Product '${productCode}' tenant '${tenantName}' successfully onboarded into ${isolationMode} isolation.`,
      timestamp: new Date().toISOString(),
      executedSteps: [
        'VALIDATE_TENANT',
        'PROVISION_TENANT_ADMIN',
        'MAP_EXTERNAL_ID',
        'ATTACH_SUBSCRIPTION',
        'PROVISION_SCHEMA',
        'EMIT_OUTBOX_EVENT',
      ],
    };

    // Dispatch welcome email via Resend (non-blocking, server-side)
    dispatchOnboardingEmails({
      tenantCode,
      tenantName,
      productCode,
      planCode,
      schemaName,
      status: 'SUCCESS',
      adminEmail: body.adminEmail as string | undefined,
      adminName: body.adminName as string | undefined,
      externalId,
    }).catch(() => {});

    return json(responsePayload, 201);
  }

  // POST /onboarding/batch
  if (p === 'onboarding/batch') {
    const requests = Array.isArray(body.requests) ? body.requests : [];
    const results = requests.map((reqItem: Record<string, unknown>) => {
      const productCode = String(reqItem.productCode || 'GENERIC').toUpperCase();
      const externalId = String(reqItem.externalId || `EXT_${Date.now()}`);
      const tenantCode = String(reqItem.tenantCode || `TNT_${Date.now()}`).toUpperCase();
      const tenantName = String(reqItem.tenantName || 'Batch Tenant');
      const planCode = String(reqItem.planCode || 'ENTERPRISE').toUpperCase();
      const tenantId = crypto.randomUUID();

      const newTenant: TenantView = {
        tenantId,
        tenantCode,
        name: tenantName,
        status: 'ACTIVE',
        regionCode: String(reqItem.regionCode || 'ap-south-1'),
        country: String(reqItem.country || 'IN'),
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
      };
      mockStore.tenants.unshift(newTenant);

      return {
        tenantId,
        tenantCode,
        tenantName,
        productCode,
        planCode,
        externalId,
        provider: `${productCode}_NEXUS`,
        status: 'SUCCESS',
        tenantStatus: 'ACTIVE',
        resourceStatus: 'SUCCEEDED',
        schemaName: `${productCode.toLowerCase()}_${tenantCode.toLowerCase()}`,
        message: `Product '${productCode}' tenant '${tenantName}' batch onboarded.`,
        timestamp: new Date().toISOString(),
        executedSteps: [
          'VALIDATE_TENANT',
          'MAP_EXTERNAL_ID',
          'ATTACH_SUBSCRIPTION',
          'PROVISION_SCHEMA',
          'EMIT_OUTBOX_EVENT',
        ],
      };
    });

    return json(
      {
        totalProcessed: requests.length,
        succeeded: requests.length,
        failed: 0,
        results,
      },
      200,
    );
  }

  return error(`Action not supported: /${p}`, 400);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const proxied = await tryProxy(req, path);
  if (proxied) return proxied;

  const body = await req.json().catch(() => ({}));

  // PUT /products/:productId
  if (path.length === 2 && path[0] === 'products') {
    const prod = mockStore.products.find((item) => item.productId === path[1]);
    if (!prod) return error('Product not found', 404);
    if (body.name) prod.name = body.name;
    if (body.description !== undefined) prod.description = body.description;
    return json(prod);
  }

  // PUT /products/:productId/versions/:versionId/publish
  if (path.length === 5 && path[0] === 'products' && path[2] === 'versions' && path[4] === 'publish') {
    const versions = mockStore.productVersions[path[1]] || [];
    versions.forEach((v) => {
      v.isCurrent = v.versionId === path[3];
      if (v.isCurrent) v.publishedAt = new Date().toISOString();
    });
    const cur = versions.find((v) => v.versionId === path[3]);
    return json({ versionId: path[3], version: cur?.version || '', isCurrent: true });
  }

  // PUT /products/:productId/plans/:planId
  if (path.length === 4 && path[0] === 'products' && path[2] === 'plans') {
    const pl = (mockStore.plans[path[1]] || []).find((item) => item.planId === path[3]);
    if (!pl) return error('Plan not found', 404);
    if (body.name) pl.name = body.name;
    if (body.description !== undefined) pl.description = body.description;
    if (body.trialDays !== undefined) pl.trialDays = body.trialDays;
    pl.updatedAt = new Date().toISOString();
    return json(pl);
  }

  // PUT /tenants/:tenantId
  if (path.length === 2 && path[0] === 'tenants') {
    const t = mockStore.tenants.find((item) => item.tenantId === path[1]);
    if (!t) return error('Tenant not found', 404);
    if (body.name) t.name = body.name;
    if (body.regionCode) t.regionCode = body.regionCode;
    if (body.country) t.country = body.country;
    if (body.timezone) t.timezone = body.timezone;
    return json(t);
  }

  return error('Unsupported PUT endpoint', 400);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const proxied = await tryProxy(req, path);
  if (proxied) return proxied;

  const body = await req.json().catch(() => ({}));

  // PATCH /products/:productId/status
  if (path.length === 3 && path[0] === 'products' && path[2] === 'status') {
    const prod = mockStore.products.find((item) => item.productId === path[1]);
    if (prod && body.status) prod.status = body.status;
    return json({ productId: path[1], status: body.status });
  }

  // PATCH /products/:productId/plans/:planId/status
  if (path.length === 5 && path[0] === 'products' && path[2] === 'plans' && path[4] === 'status') {
    const pl = (mockStore.plans[path[1]] || []).find((item) => item.planId === path[3]);
    if (pl && body.status) pl.status = body.status;
    return json({ planId: path[3], status: body.status });
  }

  // PATCH /tenants/:tenantId/products/:productCode/status
  if (path.length === 5 && path[0] === 'tenants' && path[2] === 'products' && path[4] === 'status') {
    const prods = mockStore.tenantProducts[path[1]] || [];
    const target = prods.find((item) => item.productCode === path[3]);
    if (target && body.status) target.status = body.status;
    return json({ tenantId: path[1], productCode: path[3], status: body.status });
  }

  return error('Unsupported PATCH endpoint', 400);
}
