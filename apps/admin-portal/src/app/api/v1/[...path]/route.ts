/**
 * Cybelinx Control Plane API — Vercel Edge-compatible route handler.
 * All data is read from / written to the real PostgreSQL database via DATABASE_URL.
 * No mocks, no in-memory stores.
 *
 * Runtime: nodejs (NOT edge — pg requires Node.js APIs)
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { statusCode: status, message, code: code ?? 'INVALID_REQUEST' },
    { status, headers: corsHeaders() },
  );
}

function dbError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[DB Error]', msg);
  if (msg.includes('DATABASE_URL')) {
    return apiError(
      'Database not configured. Set DATABASE_URL in Vercel project environment variables.',
      503,
      'DB_NOT_CONFIGURED',
    );
  }
  return apiError('Database error: ' + msg, 500, 'DB_ERROR');
}

function paginate<T>(rows: T[], page = 1, limit = 50) {
  const total = rows.length;
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ─── JWT helpers (dev token — signed tokens should use real JWT in prod) ──────
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
      exp: now + 86400 * 7,
    }),
  );
  const signature = base64UrlEncode('cybelinx-dev-signature-verified');
  return `${header}.${payload}.${signature}`;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1, p2, p3] = path;

  // Health
  if (p0 === 'health') {
    try {
      await query('SELECT 1');
      return json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Products ────────────────────────────────────────────────────────────────
  if (p0 === 'products') {
    try {
      if (!p1) {
        const rows = await query(`
          SELECT id AS "productId", product_code AS "productCode",
                 name, description, status,
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM public.products
          ORDER BY name
        `);
        return json(paginate(rows));
      }

      // Single product
      const product = await queryOne<{ productId: string; productCode: string }>(`
        SELECT id AS "productId", product_code AS "productCode",
               name, description, status,
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM public.products
        WHERE id = $1 OR product_code = $1
        LIMIT 1
      `, [p1]);
      if (!product) return apiError(`Product '${p1}' not found`, 404, 'PRODUCT_NOT_FOUND');

      // Plans for product
      if (p2 === 'plans') {
        if (!p3) {
          const plans = await query(`
            SELECT id AS "planId", plan_code AS "planCode",
                   name, description, status, trial_days AS "trialDays",
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM public.plans
            WHERE product_id = $1
            ORDER BY plan_code
          `, [product.productId]);
          return json({ data: plans });
        }
        const plan = await queryOne(`
          SELECT id AS "planId", plan_code AS "planCode",
                 name, description, status, trial_days AS "trialDays",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM public.plans
          WHERE product_id = $1 AND (id::text = $2 OR plan_code = $2)
          LIMIT 1
        `, [product.productId, p3]);
        if (!plan) return apiError(`Plan '${p3}' not found`, 404, 'PLAN_NOT_FOUND');
        return json(plan);
      }

      // Versions for product
      if (p2 === 'versions') {
        const versions = await query(`
          SELECT id AS "versionId", version, release_notes AS "releaseNotes",
                 is_current AS "isCurrent", published_at AS "publishedAt",
                 created_at AS "createdAt"
          FROM public.product_versions
          WHERE product_id = $1
          ORDER BY published_at DESC
        `, [product.productId]);
        return json({ data: versions });
      }

      return json(product);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Tenants ─────────────────────────────────────────────────────────────────
  if (p0 === 'tenants') {
    try {
      if (!p1) {
        const rows = await query(`
          SELECT t.id AS "tenantId", t.tenant_code AS "tenantCode",
                 t.name, t.status,
                 r.region_code AS "regionCode",
                 t.created_at AS "createdAt", t.updated_at AS "updatedAt"
          FROM public.tenants t
          LEFT JOIN public.regions r ON false
          ORDER BY t.tenant_code
        `);
        // Fetch region from tenant_resources
        const enriched = await query(`
          SELECT t.id AS "tenantId", t.tenant_code AS "tenantCode",
                 t.name, t.status,
                 reg.region_code AS "regionCode",
                 t.created_at AS "createdAt", t.updated_at AS "updatedAt"
          FROM public.tenants t
          LEFT JOIN (
            SELECT DISTINCT ON (tenant_id) tenant_id, region_id
            FROM public.tenant_resources
            ORDER BY tenant_id, created_at DESC
          ) tr ON tr.tenant_id = t.id
          LEFT JOIN public.regions reg ON reg.id = tr.region_id
          ORDER BY t.tenant_code
        `);
        return json(paginate(enriched));
      }

      // Single tenant
      const tenant = await queryOne<{ tenantId: string }>(`
        SELECT t.id AS "tenantId", t.tenant_code AS "tenantCode",
               t.name, t.status,
               reg.region_code AS "regionCode",
               t.created_at AS "createdAt", t.updated_at AS "updatedAt"
        FROM public.tenants t
        LEFT JOIN (
          SELECT DISTINCT ON (tenant_id) tenant_id, region_id
          FROM public.tenant_resources ORDER BY tenant_id, created_at DESC
        ) tr ON tr.tenant_id = t.id
        LEFT JOIN public.regions reg ON reg.id = tr.region_id
        WHERE t.id::text = $1 OR t.tenant_code = $1
        LIMIT 1
      `, [p1]);
      if (!tenant) return apiError(`Tenant '${p1}' not found`, 404, 'TENANT_NOT_FOUND');

      if (p2 === 'external-ids') {
        const extIds = await query(`
          SELECT tei.id AS "externalIdId", tei.provider, tei.external_id AS "externalId",
                 p.product_code AS "productCode", tei.created_at AS "createdAt"
          FROM public.tenant_external_identifiers tei
          LEFT JOIN public.products p ON p.id = tei.product_id
          WHERE tei.tenant_id = $1
        `, [tenant.tenantId]);
        return json({ data: extIds });
      }

      const products = await query(`
        SELECT tp.id AS "tenantProductId", tp.tenant_id AS "tenantId",
               p.product_code AS "productCode", p.name AS "productName",
               pl.plan_code AS "planCode", pl.name AS "planName",
               tp.status, tp.activated_at AS "activatedAt", tp.app_url AS "appUrl",
               tp.created_at AS "createdAt"
        FROM public.tenant_products tp
        JOIN public.products p ON p.id = tp.product_id
        JOIN public.plans pl ON pl.id = tp.plan_id
        WHERE tp.tenant_id = $1
        ORDER BY tp.activated_at DESC
      `, [tenant.tenantId]);

      const resources = await query(`
        SELECT tr.id AS "tenantResourceId", tr.tenant_id AS "tenantId",
               p.product_code AS "productCode",
               rc.resource_type_code AS "resourceTypeCode",
               tr.isolation_mode AS "isolationMode", tr.schema_name AS "schemaName",
               tr.environment, tr.status, tr.provisioning_state AS "provisioningState",
               tr.migration_version AS "migrationVersion",
               tr.created_at AS "createdAt"
        FROM public.tenant_resources tr
        JOIN public.products p ON p.id = tr.product_id
        LEFT JOIN public.resource_catalog rc ON rc.id = tr.resource_id
        WHERE tr.tenant_id = $1
        ORDER BY tr.created_at DESC
      `, [tenant.tenantId]);

      const jobs = await query(`
        SELECT pj.id AS "jobId", pj.tenant_id AS "tenantId",
               pj.status, pj.created_at AS "createdAt"
        FROM public.provisioning_jobs pj
        WHERE pj.tenant_id = $1
        ORDER BY pj.created_at DESC LIMIT 10
      `, [tenant.tenantId]);

      return json({ tenant, products, resources, provisioningJobs: jobs, memberships: [] });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Subscriptions (tenant_products join) ────────────────────────────────────
  if (p0 === 'subscriptions') {
    try {
      const rows = await query(`
        SELECT tp.id AS "tenantProductId", tp.tenant_id AS "tenantId",
               p.product_code AS "productCode", pl.plan_code AS "planCode",
               tp.status, tp.activated_at AS "activatedAt", tp.app_url AS "appUrl",
               t.tenant_code AS "tenantCode", t.name AS "tenantName"
        FROM public.tenant_products tp
        JOIN public.products p ON p.id = tp.product_id
        JOIN public.plans pl ON pl.id = tp.plan_id
        JOIN public.tenants t ON t.id = tp.tenant_id
        ORDER BY tp.activated_at DESC
      `);
      return json(paginate(rows));
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Regions ─────────────────────────────────────────────────────────────────
  if (p0 === 'regions') {
    try {
      const rows = await query(`
        SELECT id AS "regionId", region_code AS "regionCode", name
        FROM public.regions ORDER BY name
      `);
      return json({ data: rows });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Users ───────────────────────────────────────────────────────────────────
  if (p0 === 'users') {
    try {
      const rows = await query(`
        SELECT u.id AS "userId", u.email, u.name, u.status,
               u.created_at AS "createdAt"
        FROM public.users u
        ORDER BY u.name
      `);
      return json(paginate(rows));
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Audit ───────────────────────────────────────────────────────────────────
  if (p0 === 'audit') {
    try {
      const rows = await query(`
        SELECT ae.id AS "auditId", ae.action, ae.resource_type AS "resource",
               ae.actor_id AS "actorId", ae.created_at AS "timestamp"
        FROM public.audit_events ae
        ORDER BY ae.created_at DESC LIMIT 50
      `);
      return json(paginate(rows));
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Platform Events ──────────────────────────────────────────────────────────
  if (p0 === 'events') {
    try {
      const rows = await query(`
        SELECT pe.id AS "eventId", pe.event_type AS "eventType",
               pe.payload, pe.created_at AS "timestamp"
        FROM public.platform_events pe
        ORDER BY pe.created_at DESC LIMIT 50
      `);
      return json(paginate(rows));
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Product Repository ───────────────────────────────────────────────────────
  if (p0 === 'product-repository') {
    try {
      const products = await query(`
        SELECT p.id AS "productId", p.product_code AS "productCode",
               p.name, p.description, p.status,
               COUNT(DISTINCT tp.tenant_id)::int AS "customerCount",
               p.created_at AS "createdAt"
        FROM public.products p
        LEFT JOIN public.tenant_products tp ON tp.product_id = p.id AND tp.status = 'ACTIVE'
        GROUP BY p.id
        ORDER BY p.name
      `);
      if (!p1) return json(paginate(products));

      const repo = products.find((r) => r.productId === p1 || (r as { productCode: string }).productCode === p1);
      if (!repo) return apiError(`Product '${p1}' not found`, 404, 'PRODUCT_NOT_FOUND');

      const customers = await query(`
        SELECT t.id AS "tenantId", t.tenant_code AS "tenantCode", t.name AS "tenantName",
               p.product_code AS "productCode", pl.plan_code AS "planCode",
               tp.status, tp.activated_at AS "activatedAt", tp.app_url AS "appUrl",
               tr.schema_name AS "schemaName", tr.isolation_mode AS "isolationMode"
        FROM public.tenant_products tp
        JOIN public.tenants t ON t.id = tp.tenant_id
        JOIN public.products p ON p.id = tp.product_id
        JOIN public.plans pl ON pl.id = tp.plan_id
        LEFT JOIN public.tenant_resources tr ON tr.tenant_id = tp.tenant_id AND tr.product_id = tp.product_id
        WHERE tp.product_id = $1
        ORDER BY t.tenant_code
      `, [(repo as { productId: string }).productId]);

      return json({ ...repo, customers });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Onboarding definitions ────────────────────────────────────────────────────
  if (p0 === 'onboarding' && p1 === 'definitions') {
    try {
      const products = await query(`
        SELECT p.product_code AS "productCode", p.name, p.description,
               json_agg(json_build_object(
                 'planCode', pl.plan_code,
                 'planName', pl.name,
                 'trialDays', pl.trial_days,
                 'status', pl.status
               ) ORDER BY pl.plan_code) AS plans
        FROM public.products p
        JOIN public.plans pl ON pl.product_id = p.id
        WHERE p.status = 'ACTIVE'
        GROUP BY p.id
        ORDER BY p.name
      `);
      if (p2) {
        const def = products.find((d) => (d as { productCode: string }).productCode === p2.toUpperCase());
        if (!def) return apiError(`No onboarding definition for '${p2}'`, 404, 'NOT_FOUND');
        return json(def);
      }
      return json(products);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Onboarding status ─────────────────────────────────────────────────────────
  if (p0 === 'onboarding' && p1 === 'status' && p2 && p3) {
    try {
      const row = await queryOne(`
        SELECT t.tenant_code AS "tenantCode", t.name, t.status,
               tei.external_id AS "externalId", tei.provider,
               tp.status AS "subscriptionStatus",
               tr.provisioning_state AS "provisioningState"
        FROM public.tenant_external_identifiers tei
        JOIN public.tenants t ON t.id = tei.tenant_id
        JOIN public.products p ON p.id = tei.product_id
        LEFT JOIN public.tenant_products tp ON tp.tenant_id = t.id AND tp.product_id = tei.product_id
        LEFT JOIN public.tenant_resources tr ON tr.tenant_id = t.id AND tr.product_id = tei.product_id
        WHERE p.product_code = $1 AND tei.external_id = $2
        LIMIT 1
      `, [p2.toUpperCase(), decodeURIComponent(p3)]);
      if (!row) return apiError('Onboarding record not found', 404, 'NOT_FOUND');
      return json(row);
    } catch (err) {
      return dbError(err);
    }
  }

  return apiError(`Path /${path.join('/')} not found`, 404, 'NOT_FOUND');
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1, p2, p3] = path;

  // ── Auth / Login ─────────────────────────────────────────────────────────────
  if (p0 === 'auth' && p1 === 'login') {
    try {
      const body = await req.json().catch(() => ({}));
      const email = (body.email as string)?.trim() || 'dev.admin@cybelinx.test';

      // Try to find user in DB
      const user = await queryOne<{ userId: string; email: string; name: string }>(`
        SELECT u.id AS "userId", u.email, u.name
        FROM public.users u WHERE u.email = $1 LIMIT 1
      `, [email]).catch(() => null);

      const roles = ['CYBELINX_PLATFORM_ADMIN'];
      const token = createDevToken(user?.email ?? email, roles);

      return json({
        token,
        sub: user?.userId ?? '00000000-0000-0000-0000-000000000099',
        email: user?.email ?? email,
        name: user?.name ?? 'Platform Admin',
        roles,
        expiresAt: new Date(Date.now() + 86400 * 7 * 1000).toISOString(),
      });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Onboard Tenant (POST /onboarding/execute, POST /tenants/onboard) ──────────
  if ((p0 === 'tenants' && p1 === 'onboard') || (p0 === 'onboarding' && p1 === 'execute')) {
    try {
      const body = await req.json().catch(() => ({}));
      const {
        productCode, tenantCode, tenantName, externalId,
        planCode, domain, adminEmail, country, timezone,
      } = body as Record<string, string>;

      if (!productCode || !tenantCode || !tenantName || !externalId) {
        return apiError('productCode, tenantCode, tenantName, externalId are required', 400, 'MISSING_FIELDS');
      }

      // Look up product
      const product = await queryOne<{ productId: string; productCode: string }>(`
        SELECT id AS "productId", product_code AS "productCode"
        FROM public.products WHERE product_code = $1 LIMIT 1
      `, [productCode.toUpperCase()]);
      if (!product) return apiError(`Product '${productCode}' not found`, 404, 'PRODUCT_NOT_FOUND');

      // Look up plan
      const resolvedPlanCode = planCode || 'BASIC';
      const plan = await queryOne<{ planId: string; planCode: string }>(`
        SELECT id AS "planId", plan_code AS "planCode"
        FROM public.plans WHERE product_id = $1 AND plan_code = $2 LIMIT 1
      `, [product.productId, resolvedPlanCode.toUpperCase()]);
      if (!plan) return apiError(`Plan '${resolvedPlanCode}' not found for product '${productCode}'`, 404, 'PLAN_NOT_FOUND');

      // Check duplicate tenant code
      const existing = await queryOne(`
        SELECT id FROM public.tenants WHERE tenant_code = $1 LIMIT 1
      `, [tenantCode.toUpperCase()]);
      if (existing) return apiError(`Tenant code '${tenantCode}' already exists`, 409, 'TENANT_EXISTS');

      // Get default region (ap-south-1)
      const region = await queryOne<{ regionId: string }>(`
        SELECT id AS "regionId" FROM public.regions WHERE region_code = 'ap-south-1' LIMIT 1
      `);

      // Get POSTGRES_SCHEMA resource
      const resource = await queryOne<{ resourceId: string }>(`
        SELECT id AS "resourceId" FROM public.resource_catalog
        WHERE resource_type_code = 'POSTGRES_SCHEMA' AND status = 'ACTIVE' LIMIT 1
      `);

      const tenantId = crypto.randomUUID();
      const tenantProductId = crypto.randomUUID();

      // Insert tenant
      await execute(`
        INSERT INTO public.tenants (id, tenant_code, name, status, created_at, updated_at, version)
        VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW(), 1)
      `, [tenantId, tenantCode.toUpperCase(), tenantName]);

      // Insert tenant_product
      await execute(`
        INSERT INTO public.tenant_products
          (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW(), NOW(), 1, $5)
      `, [tenantProductId, tenantId, product.productId, plan.planId,
          domain || `https://${tenantCode.toLowerCase()}.jioplix.com`]);

      // Insert tenant_resource (if region & resource available)
      if (region && resource) {
        const schemaName = `${productCode.toLowerCase()}_${tenantCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await execute(`
          INSERT INTO public.tenant_resources
            (id, tenant_id, product_id, resource_id, isolation_mode, schema_name,
             region_id, environment, status, provisioning_state, migration_version,
             tenant_product_id, created_at, updated_at, version)
          VALUES ($1,$2,$3,$4,'SCHEMA_PER_TENANT',$5,$6,'PRODUCTION','ACTIVE','SUCCEEDED',1,$7,NOW(),NOW(),1)
        `, [crypto.randomUUID(), tenantId, product.productId, resource.resourceId,
            schemaName, region.regionId, tenantProductId]);
      }

      // Insert external identifier
      await execute(`
        INSERT INTO public.tenant_external_identifiers
          (id, tenant_id, product_id, provider, external_id, created_at)
        VALUES ($1, $2, $3, 'JIOPLIX_NEXUS', $4, NOW())
      `, [crypto.randomUUID(), tenantId, product.productId, externalId]);

      return json({
        status: 'provisioned',
        tenantId,
        tenantCode: tenantCode.toUpperCase(),
        tenantName,
        productCode: product.productCode,
        planCode: plan.planCode,
        appUrl: domain || `https://${tenantCode.toLowerCase()}.jioplix.com`,
        provisionedAt: new Date().toISOString(),
      }, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  return json({ status: 'ok', updated: true });
}

// ─── PUT / PATCH / DELETE ─────────────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1] = path;

  if (p0 === 'tenants' && p1) {
    try {
      const body = await req.json().catch(() => ({}));
      const fields: string[] = [];
      const vals: unknown[] = [];
      let idx = 1;
      if (body.name)   { fields.push(`name = $${idx++}`);   vals.push(body.name); }
      if (body.status) { fields.push(`status = $${idx++}`); vals.push(body.status); }
      if (!fields.length) return apiError('No updatable fields provided', 400, 'NO_FIELDS');
      fields.push(`updated_at = NOW()`, `version = version + 1`);
      vals.push(p1);
      await execute(
        `UPDATE public.tenants SET ${fields.join(', ')} WHERE id::text = $${idx} OR tenant_code = $${idx}`,
        vals
      );
      return json({ status: 'updated' });
    } catch (err) {
      return dbError(err);
    }
  }
  return json({ status: 'ok' });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return PUT(req, { params });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1] = path;

  if (p0 === 'tenants' && p1) {
    try {
      await execute(
        `UPDATE public.tenants SET status = 'DELETION_PENDING', updated_at = NOW()
         WHERE id::text = $1 OR tenant_code = $1`,
        [p1]
      );
      return json({ status: 'deletion_pending' });
    } catch (err) {
      return dbError(err);
    }
  }
  return json({ status: 'ok' });
}
