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

  // GET /broker/status
  if (p === 'broker/status') {
    return json({
      status: 'UP',
      brokerMode: 'IN_MEMORY',
      activeTopics: ['cybelinx.events.TENANT_CREATED', 'cybelinx.events.SUBSCRIPTION_ATTACHED'],
      publishedCount: 42,
    });
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
    const newTenant: TenantView = {
      tenantId: crypto.randomUUID(),
      tenantCode: String(body.tenantCode || '').trim().toLowerCase(),
      name: String(body.name || '').trim(),
      status: 'ACTIVE',
      regionCode: body.regionCode || 'eu-west-1',
      country: body.country || null,
      timezone: body.timezone || 'UTC',
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

    return json(
      {
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
          'MAP_EXTERNAL_ID',
          'ATTACH_SUBSCRIPTION',
          'PROVISION_SCHEMA',
          'EMIT_OUTBOX_EVENT',
        ],
      },
      201,
    );
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
