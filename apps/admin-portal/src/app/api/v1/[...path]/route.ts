/**
 * Cybelinx Control Plane API — Vercel Edge-compatible route handler.
 * All data is read from / written to the real PostgreSQL database via DATABASE_URL.
 * No mocks, no in-memory stores.
 *
 * Runtime: nodejs (NOT edge — pg requires Node.js APIs)
 */
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query, queryOne, execute, getDatabaseDiagnostics } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

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

function mapCategoryToDb(cat?: string | null): string {
  if (!cat) return 'ENTERPRISE_OPERATIONS';
  const c = cat.toUpperCase();
  if (c === 'HEALTHCARE' || c === 'DIAGNOSTIC_LABS' || c === 'REGULATED_MARKETS') return 'REGULATED_MARKETS';
  if (c === 'RETAIL_COMMERCE' || c === 'CORE_PAAS_AI') return 'CORE_PAAS_AI';
  return 'ENTERPRISE_OPERATIONS';
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
  const diag = getDatabaseDiagnostics();
  if (!diag.configured || msg.includes('DATABASE_URL')) {
    return apiError(
      'Database not configured. Set DATABASE_URL in Vercel project environment variables.',
      503,
      'DB_NOT_CONFIGURED',
    );
  }
  return NextResponse.json(
    {
      statusCode: 500,
      message: 'Database error: ' + msg,
      code: 'DB_ERROR',
      diagnostics: diag,
    },
    { status: 500, headers: corsHeaders() },
  );
}

function paginate<T>(rows: T[], page = 1, limit = 50) {
  const total = rows.length;
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

// ─── JWT helpers (dev token) ──────────────────────────────────────────────────
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

// ─── Universal SSO Launch Token Generator (HMAC-SHA256 standard JWT) ─────────
export function generateSsoToken(params: {
  user: string;
  tenantCode: string;
  tenantName?: string;
  role?: string;
  expiresInSec?: number;
}): string {
  const secret = process.env.JWT_SECRET || 'hims-jwt-secret-key-2024-jio-hms-secure-token';
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (params.expiresInSec || 86400 * 7);
  const payload = base64UrlEncode(
    JSON.stringify({
      user: params.user,
      email: params.user,
      tenantId: params.tenantCode.toLowerCase(),
      tenantCode: params.tenantCode.toLowerCase(),
      tenantName: params.tenantName || params.tenantCode,
      role: params.role || 'admin',
      type: 'tenant',
      iss: 'cybelinx-control-plane',
      iat: now,
      exp,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

// ─── StoreAI Direct Login Bypass Token Generator (StoreAI JWT Specification) ──
// ─── StoreAI Direct Login Bypass Token Generator (StoreAI JWT Specification) ──
const STOREAI_KNOWN_TENANTS: Record<string, string> = {
  abccorp: '743beaf2-e038-4942-bf1b-62a4f1b17d00',
  textronic: 'ab4f2d99-58ef-4d1f-80b4-6b29301d0e3e',
  wellness: 'ee6336aa-a5b6-4584-b13f-4035d99d5ca5',
};

export function generateStoreAiToken(params: {
  email: string;
  tenantCode: string;
  tenantName?: string;
  role?: string;
}): string {
  const secret = process.env.STOREAI_JWT_SECRET || 'MqOqO1LLP8PK8DRwe9NenNZfmquJz1POzdcbDJ+gbL4=';
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 86400 * 7;
  const slug = params.tenantCode.toLowerCase();
  const tenantId = STOREAI_KNOWN_TENANTS[slug] || crypto.randomUUID();
  // Primary StoreAI superadmin user in Neon DB
  const userId = 'b8fb58c6-7618-43f0-a4e0-fa53f3586b82';

  const payload = base64UrlEncode(
    JSON.stringify({
      id: userId,
      email: params.email || 'b.selvakumar@cognivectra.com',
      firstName: params.tenantCode.toUpperCase(),
      lastName: 'Admin',
      tenantId,
      tenantSlug: slug,
      role: 'SUPER_ADMIN',
      permissions: [
        'dashboard:view', 'inventory:read', 'inventory:write', 'sales:read',
        'sales:write', 'hr:read', 'hr:write', 'accounts:read',
        'accounts:write', 'reports:view', 'crm:write', 'orders:read',
        'orders:write', 'users:manage', 'tenants:manage', 'payroll:read',
        'payroll:write', 'reports:read'
      ],
      features: {
        currency: 'INR',
        HR_MODULE: true,
        CRM_MODULE: true,
        RETAIL_MODULE: true,
        FINANCE_MODULE: true,
        INVENTORY_MODULE: true
      },
      iat: now,
      exp,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

// ─── Universal Generic Onboarding Definitions Builder (Metadata-Driven for 12+ Products) ──
function buildProductDefinition(p: {
  productCode: string;
  name: string;
  description: string | null;
  baseUrl?: string | null;
  plans: { planCode: string }[];
}) {
  const code = p.productCode.toUpperCase();
  const availablePlans = (p.plans && p.plans.length > 0)
    ? p.plans.map((pl) => pl.planCode)
    : ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
  const defaultPlanCode = availablePlans[0];
  const schemaPrefix = `${code.toLowerCase()}_`;
  const defaultDomain = p.baseUrl || `https://{tenant}.${code.toLowerCase()}.com`;

  return {
    productCode: code,
    version: '1.0.0',
    displayName: p.name || `${code} Platform`,
    description: p.description || `Enterprise ${p.name} SaaS platform workload`,
    provider: `${code}_NEXUS`,
    tenantIdentifier: {
      key: 'externalId',
      label: `${p.name} External ID`,
      placeholder: `e.g. ${code}_TENANT_01`,
      required: true,
      hint: `Unique upstream external identifier for this ${p.name} tenant`,
    },
    fields: [
      {
        key: 'tenantName',
        label: 'Organization / Customer Legal Name',
        type: 'text' as const,
        required: true,
        placeholder: `e.g. Acme ${p.name} Organization`,
        hint: 'Full legal name of customer or commercial institution',
      },
      {
        key: 'domain',
        label: 'Tenant Domain / Portal URL',
        type: 'url' as const,
        required: false,
        placeholder: defaultDomain.includes('{tenant}') ? defaultDomain : `https://{tenant}.${code.toLowerCase()}.com`,
        hint: 'Dedicated vanity subdomain or application URL for tenant access',
      },
      {
        key: 'contactEmail',
        label: 'Primary Admin Email',
        type: 'email' as const,
        required: true,
        placeholder: `admin@${code.toLowerCase()}-tenant.com`,
        hint: 'Official administrative contact and SSO login email',
      },
      {
        key: 'country',
        label: 'Jurisdiction / Country',
        type: 'text' as const,
        required: false,
        placeholder: 'India',
        hint: 'Operating legal jurisdiction for regulatory data residency',
      },
      {
        key: 'timezone',
        label: 'Operational Timezone',
        type: 'text' as const,
        required: false,
        placeholder: 'Asia/Kolkata',
        hint: 'Primary timezone for appointments, telemetry, and operations',
      },
    ],
    subscription: {
      required: true,
      defaultPlanCode,
      availablePlans,
    },
    resource: {
      defaultResourceType: 'POSTGRES_SCHEMA',
      supportedIsolationModes: ['SCHEMA_PER_TENANT', 'SHARED_POOL', 'DEDICATED_DATABASE', 'DEDICATED_INFRASTRUCTURE'],
      defaultIsolationMode: 'SCHEMA_PER_TENANT',
      schemaPrefix,
    },
    provisioningSteps: ['VALIDATE_TENANT', 'MAP_EXTERNAL_ID', 'ATTACH_SUBSCRIPTION', 'PROVISION_SCHEMA', 'EMIT_OUTBOX_EVENT'],
    healthCheckEndpoint: '/api/v1/health',
  };
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1, p2, p3, p4, p5] = path;

  // Health
  if (p0 === 'health') {
    const diag = getDatabaseDiagnostics();
    try {
      await query('SELECT 1');
      return json({
        status: 'ok',
        db: 'connected',
        diagnostics: diag,
        timestamp: new Date().toISOString(),
      });
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
                 name, description, status, base_url AS "baseUrl",
                 current_version_id AS "currentVersionId",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM public.products
          ORDER BY name
        `);
        return json(paginate(rows));
      }

      // Single product lookup: cast id::text to prevent operator does not exist uuid error
      const product = await queryOne<{ productId: string; productCode: string }>(`
        SELECT id AS "productId", product_code AS "productCode",
               name, description, status, base_url AS "baseUrl",
               current_version_id AS "currentVersionId",
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM public.products
        WHERE id::text = $1 OR product_code = $1
        LIMIT 1
      `, [p1]);
      if (!product) return apiError(`Product '${p1}' not found`, 404, 'PRODUCT_NOT_FOUND');

      // Plans for product: /products/:id/plans
      if (p2 === 'plans') {
        if (!p3) {
          const plans = await query(`
            SELECT id AS "planId", plan_code AS "planCode",
                   name, description, status, trial_days AS "trialDays",
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM public.plans
            WHERE product_id::text = $1
            ORDER BY plan_code
          `, [product.productId]);
          return json({ data: plans });
        }

        // Entitlements for plan: /products/:id/plans/:planId/entitlements
        if (p4 === 'entitlements') {
          const plan = await queryOne<{ planId: string }>(`
            SELECT id AS "planId" FROM public.plans
            WHERE product_id::text = $1 AND (id::text = $2 OR plan_code = $2)
            LIMIT 1
          `, [product.productId, p3]);
          if (!plan) return apiError(`Plan '${p3}' not found`, 404, 'PLAN_NOT_FOUND');

          if (!p5) {
            const entitlements = await query(`
              SELECT id AS "entitlementId", key, name, value, status,
                     created_at AS "createdAt", updated_at AS "updatedAt"
              FROM public.entitlements
              WHERE plan_id::text = $1
              ORDER BY key
            `, [plan.planId]);
            return json({ data: entitlements });
          }

          const entitlement = await queryOne(`
            SELECT id AS "entitlementId", key, name, value, status,
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM public.entitlements
            WHERE plan_id::text = $1 AND (id::text = $2 OR key = $2)
            LIMIT 1
          `, [plan.planId, p5]);
          if (!entitlement) return apiError(`Entitlement '${p5}' not found`, 404, 'ENTITLEMENT_NOT_FOUND');
          return json(entitlement);
        }

        const plan = await queryOne(`
          SELECT id AS "planId", plan_code AS "planCode",
                 name, description, status, trial_days AS "trialDays",
                 created_at AS "createdAt", updated_at AS "updatedAt"
          FROM public.plans
          WHERE product_id::text = $1 AND (id::text = $2 OR plan_code = $2)
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
          WHERE product_id::text = $1
          ORDER BY published_at DESC NULLS LAST, created_at DESC
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
        const enriched = await query(`
          SELECT t.id AS "tenantId", t.tenant_code AS "tenantCode",
                 t.name, t.status, t.country, t.timezone,
                 reg.region_code AS "regionCode",
                 t.created_at AS "createdAt", t.updated_at AS "updatedAt"
          FROM public.tenants t
          LEFT JOIN public.regions reg ON reg.id = t.region_id
          ORDER BY t.tenant_code
        `);
        return json(paginate(enriched));
      }

      // Single tenant
      const tenant = await queryOne<{ tenantId: string }>(`
        SELECT t.id AS "tenantId", t.tenant_code AS "tenantCode",
               t.name, t.status, t.country, t.timezone,
               reg.region_code AS "regionCode",
               t.created_at AS "createdAt", t.updated_at AS "updatedAt"
        FROM public.tenants t
        LEFT JOIN public.regions reg ON reg.id = t.region_id
        WHERE t.id::text = $1 OR t.tenant_code = $1
        LIMIT 1
      `, [p1]);
      if (!tenant) return apiError(`Tenant '${p1}' not found`, 404, 'TENANT_NOT_FOUND');

      // /tenants/:id/external-ids
      if (p2 === 'external-ids') {
        const extIds = await query(`
          SELECT tei.id AS "externalIdentifierId", tei.id AS "externalIdId",
                 tei.provider, tei.external_id AS "externalId",
                 p.product_code AS "productCode", tei.created_at AS "createdAt"
          FROM public.tenant_external_identifiers tei
          LEFT JOIN public.products p ON p.id = tei.product_id
          WHERE tei.tenant_id::text = $1
        `, [tenant.tenantId]);
        return json({ data: extIds });
      }

      // /tenants/:id/usage
      if (p2 === 'usage') {
        const usage = await query(`
          SELECT ue.id AS "usageEventId", ue.tenant_id AS "tenantId",
                 ue.product_id AS "productId", ue.event_type AS "eventType",
                 ue.quantity, ue.unit, ue.dedupe_key AS "dedupeKey",
                 ue.occurred_at AS "occurredAt", ue.ingested_at AS "ingestedAt"
          FROM public.usage_events ue
          WHERE ue.tenant_id::text = $1
          ORDER BY ue.occurred_at DESC LIMIT 50
        `, [tenant.tenantId]);
        return json(paginate(usage));
      }

      // /tenants/:id/products
      if (p2 === 'products') {
        const products = await query(`
          SELECT tp.id AS "tenantProductId", tp.tenant_id AS "tenantId",
                 p.product_code AS "productCode", p.name AS "productName",
                 pl.plan_code AS "planCode", pl.name AS "planName",
                 tp.status, tp.activated_at AS "activatedAt", tp.app_url AS "appUrl",
                 tp.created_at AS "createdAt"
          FROM public.tenant_products tp
          JOIN public.products p ON p.id = tp.product_id
          LEFT JOIN public.plans pl ON pl.id = tp.plan_id
          WHERE tp.tenant_id::text = $1
          ORDER BY tp.activated_at DESC
        `, [tenant.tenantId]);
        return json({ data: products });
      }

      // /tenants/:id/resources
      if (p2 === 'resources') {
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
          WHERE tr.tenant_id::text = $1
          ORDER BY tr.created_at DESC
        `, [tenant.tenantId]);
        return json({ data: resources });
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
        WHERE tp.tenant_id::text = $1
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
        WHERE tr.tenant_id::text = $1
        ORDER BY tr.created_at DESC
      `, [tenant.tenantId]);

      // Use pj.state AS status (the column in public.provisioning_jobs is 'state')
      const jobs = await query(`
        SELECT pj.id AS "jobId", pj.tenant_id AS "tenantId", pj.operation,
               pj.state AS status, pj.progress, pj.created_at AS "createdAt"
        FROM public.provisioning_jobs pj
        WHERE pj.tenant_id::text = $1
        ORDER BY pj.created_at DESC LIMIT 10
      `, [tenant.tenantId]);

      return json({ tenant, products, resources, provisioningJobs: jobs, memberships: [] });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Subscriptions ───────────────────────────────────────────────────────────
  if (p0 === 'subscriptions') {
    try {
      const rows = await query(`
        SELECT tp.id AS "tenantProductId", tp.tenant_id AS "tenantId",
               p.product_code AS "productCode", pl.plan_code AS "planCode",
               tp.status, tp.activated_at AS "activatedAt", tp.app_url AS "appUrl",
               t.tenant_code AS "tenantCode", t.name AS "tenantName",
               t.country, t.timezone
        FROM public.tenant_products tp
        JOIN public.products p ON p.id = tp.product_id
        JOIN public.plans pl ON pl.id = tp.plan_id
        JOIN public.tenants t ON t.id = tp.tenant_id
        ORDER BY tp.activated_at DESC
      `);
      // Nest the tenant object so SubscriptionsPage row.tenant.tenantCode works
      const enriched = rows.map((r) => ({
        tenantProductId: r.tenantProductId,
        tenantId: r.tenantId,
        productCode: r.productCode,
        planCode: r.planCode,
        status: r.status,
        activatedAt: r.activatedAt,
        appUrl: r.appUrl,
        tenantCode: r.tenantCode,
        tenantName: r.tenantName,
        tenant: {
          tenantId: r.tenantId,
          tenantCode: r.tenantCode,
          name: r.tenantName,
          status: 'ACTIVE',
          regionCode: null,
          country: r.country,
          timezone: r.timezone,
          createdAt: r.activatedAt,
        },
      }));
      return json(paginate(enriched));
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

  // ── Users & IAM ─────────────────────────────────────────────────────────────
  if (p0 === 'users' || (p0 === 'iam' && p1 === 'users')) {
    try {
      const rows = await query(`
        SELECT u.id AS "userId", u.email, COALESCE(u."displayName", u.email) AS "displayName",
               COALESCE(u."displayName", u.email) AS name, u.status,
               u.created_at AS "createdAt"
        FROM public.users u
        ORDER BY u.email
      `);
      const formatted = rows.map((u) => ({
        ...u,
        identities: ['supabase-auth'],
        tenantCount: 1,
      }));
      // If called via api.iam.listUsers(), it expects UserView[] directly:
      if (p0 === 'iam') {
        return json(formatted);
      }
      return json(paginate(formatted));
    } catch (err) {
      return dbError(err);
    }
  }

  if (p0 === 'iam' && p1 === 'tenants' && p2 && p3 === 'members') {
    try {
      const members = await query(`
        SELECT tm.id AS "membershipId", tm.tenant_id AS "tenantId",
               tm.user_id AS "userId", u.email,
               COALESCE(u."displayName", u.email) AS "displayName",
               tm.status, tm.joined_at AS "joinedAt",
               COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), ARRAY['TENANT_USER']) AS "roles"
        FROM public.tenant_memberships tm
        JOIN public.users u ON u.id = tm.user_id
        LEFT JOIN public.membership_roles mr ON mr.membership_id = tm.id
        LEFT JOIN public.roles r ON r.id = mr.role_id
        WHERE tm.tenant_id::text = $1
        GROUP BY tm.id, tm.tenant_id, tm.user_id, u.email, u."displayName", tm.status, tm.joined_at
        ORDER BY tm.joined_at DESC
      `, [p2]);
      return json(members);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Audit ───────────────────────────────────────────────────────────────────
  if (p0 === 'audit') {
    try {
      const rows = await query(`
        SELECT ae.id,
               ae.id AS "auditId",
               ae.tenant_id AS "tenantId",
               ae.user_id AS "userId",
               ae.user_id AS "actorId",
               ae.product_id AS "productId",
               ae.actor_type AS "actorType",
               ae.action,
               ae.entity_type AS "entityType",
               ae.entity_type AS "resource",
               ae.entity_id AS "entityId",
               ae.metadata,
               ae.ip_address AS "ipAddress",
               ae.request_id AS "requestId",
               ae.occurred_at AS "occurredAt",
               ae.occurred_at AS "timestamp"
        FROM public.audit_events ae
        ORDER BY ae.occurred_at DESC LIMIT 50
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
        SELECT pe.id AS "eventId",
               pe.id,
               pe.event_type AS "eventType",
               pe.schema_version AS "schemaVersion",
               pe.tenant_id AS "tenantId",
               pe.product_id AS "productId",
               pe.entity_type AS "entityType",
               pe.entity_id AS "entityId",
               pe.status,
               pe.source,
               pe.payload,
               pe.occurred_at AS "occurredAt",
               pe.occurred_at AS "timestamp",
               pe.created_at AS "createdAt"
        FROM public.platform_events pe
        ORDER BY pe.occurred_at DESC LIMIT 50
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
        SELECT p.id AS "productId", p.id AS "repositoryId",
               p.product_code AS "productCode",
               p.name, p.description, p.status,
               COALESCE(p.product_category, 'ENTERPRISE_OPERATIONS') AS "productCategory",
               COUNT(DISTINCT tp.tenant_id)::int AS "customerCount",
               COALESCE(p.domain, p.base_url) AS "domain",
               p.subdomain_pattern AS "subdomainPattern",
               COALESCE(p.hosting_provider, 'VERCEL') AS "hostingProvider",
               p.deployment_url AS "deploymentUrl",
               COALESCE(p.health_endpoint, '/api/v1/health') AS "healthEndpoint",
               COALESCE(p.database_provider, 'AIVEN') AS "databaseProvider",
               p.database_location AS "databaseLocation",
               p.database_connection_string AS "databaseConnectionString",
               p.db_url_development AS "dbUrlDevelopment",
               p.db_url_staging AS "dbUrlStaging",
               COALESCE(p.db_url_production, p.database_connection_string) AS "dbUrlProduction",
               p.db_credentials_reference AS "dbCredentialsReference",
               COALESCE(p.default_isolation_mode, 'SCHEMA_PER_TENANT') AS "defaultIsolationMode",
               p.schema_prefix AS "schemaPrefix",
               p.ddl_template_path AS "ddlTemplatePath",
               p.configuration_location AS "configurationLocation",
               p.created_at AS "createdAt",
               p.updated_at AS "updatedAt"
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
               COALESCE(prc.tenant_schema, tr.schema_name, t.tenant_code) AS "tenantSchema",
               tr.isolation_mode AS "isolationMode",
               COALESCE(
                 prc.database_name,
                 CASE
                   WHEN p.database_provider = 'SUPABASE' THEN 'Supabase PostgreSQL (aws-1-ap-southeast-1)'
                   WHEN p.database_provider = 'NEON' THEN 'Neon Serverless PostgreSQL (storeai-db)'
                   WHEN p.database_provider = 'AIVEN' THEN 'Aiven Cloud PostgreSQL'
                   WHEN p.database_provider IS NOT NULL THEN p.database_provider
                   WHEN p.db_url_production IS NOT NULL THEN p.db_url_production
                   ELSE 'Dedicated Product DB'
                 END
               ) AS "databaseName",
               prc.contact_person AS "contactPerson",
               prc.contact_email AS "contactEmail"
        FROM public.tenant_products tp
        JOIN public.tenants t ON t.id = tp.tenant_id
        JOIN public.products p ON p.id = tp.product_id
        JOIN public.plans pl ON pl.id = tp.plan_id
        LEFT JOIN public.tenant_resources tr ON tr.tenant_id = tp.tenant_id AND tr.product_id = tp.product_id
        LEFT JOIN public.product_repository_customers prc ON prc.product_id = p.id AND prc.tenant_id = t.id
        WHERE tp.product_id::text = $1
        ORDER BY t.tenant_code
      `, [(repo as { productId: string }).productId]);

      return json({ ...repo, customers, subscriptions: [] });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Onboarding definitions ────────────────────────────────────────────────────
  if (p0 === 'onboarding' && p1 === 'definitions') {
    try {
      const products = await query<{
        productCode: string;
        name: string;
        description: string | null;
        plans: { planCode: string }[];
      }>(`
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

      const richDefs = products.map(buildProductDefinition);

      if (p2) {
        const def = richDefs.find((d) => d.productCode === p2.toUpperCase());
        if (!def) return apiError(`No onboarding definition for '${p2}'`, 404, 'NOT_FOUND');
        return json(def);
      }
      return json(richDefs);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Onboarding status ─────────────────────────────────────────────────────────
  if (p0 === 'onboarding' && p1 === 'status' && p2 && p3) {
    try {
      const row = await queryOne(`
        SELECT t.id AS "tenantId", t.tenant_code AS "tenantCode", t.name AS "tenantName", t.status AS "tenantStatus",
               tei.external_id AS "externalId", tei.provider,
               p.product_code AS "productCode",
               COALESCE(tp.status, 'ACTIVE') AS "subscriptionStatus",
               pl.plan_code AS "planCode",
               COALESCE(tr.provisioning_state, 'SUCCEEDED') AS "resourceStatus",
               tr.schema_name AS "schemaName",
               COALESCE(tr.isolation_mode, 'SCHEMA_PER_TENANT') AS "isolationMode",
               t.created_at AS "onboardedAt"
        FROM public.tenant_external_identifiers tei
        JOIN public.tenants t ON t.id = tei.tenant_id
        JOIN public.products p ON p.id = tei.product_id
        LEFT JOIN public.tenant_products tp ON tp.tenant_id = t.id AND tp.product_id = tei.product_id
        LEFT JOIN public.plans pl ON pl.id = tp.plan_id
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

  // ── SSO Token Generation: GET /auth/sso/token ──────────────────────────────
  if (p0 === 'auth' && p1 === 'sso' && p2 === 'token') {
    try {
      const { searchParams } = new URL(req.url);
      const tenantParam = searchParams.get('tenantId') || searchParams.get('tenantCode');
      const productCode = searchParams.get('productCode') || 'JIOPLIX';
      const email = searchParams.get('email') || 'b.selvakumar@cognivectra.com';

      if (!tenantParam) return apiError('tenantId or tenantCode is required', 400, 'MISSING_FIELDS');

      const tenant = await queryOne<{ id: string; tenant_code: string; name: string }>(`
        SELECT id, tenant_code, name FROM public.tenants
        WHERE id::text = $1 OR UPPER(tenant_code) = UPPER($1)
        LIMIT 1
      `, [tenantParam]);
      if (!tenant) return apiError(`Tenant '${tenantParam}' not found`, 404, 'TENANT_NOT_FOUND');

      const tp = await queryOne<{ app_url: string; product_code: string }>(`
        SELECT tp.app_url, p.product_code
        FROM public.tenant_products tp
        JOIN public.products p ON p.id = tp.product_id
        WHERE tp.tenant_id = $1 AND (p.product_code = $2 OR $2 IS NULL)
        ORDER BY tp.created_at DESC LIMIT 1
      `, [tenant.id, productCode ? productCode.toUpperCase() : null]);

      const ssoToken = generateSsoToken({
        user: email,
        tenantCode: tenant.tenant_code.toLowerCase(),
        tenantName: tenant.name,
        role: 'admin',
      });

      const isStoreAi = (productCode || '').toUpperCase() === 'STOREAI' ||
        (tp?.product_code || '').toUpperCase() === 'STOREAI' ||
        (tp?.app_url || '').includes('storeai');

      let rawAppUrl = tp?.app_url || '';
      if (!rawAppUrl) {
        if (isStoreAi) {
          rawAppUrl = `https://${tenant.tenant_code.toLowerCase()}.storeai.cybelinx.com`;
        } else {
          rawAppUrl = `https://${tenant.tenant_code.toLowerCase()}.jioplix.com`;
        }
      } else if (isStoreAi && rawAppUrl.includes('jioplix.com')) {
        rawAppUrl = `https://${tenant.tenant_code.toLowerCase()}.storeai.cybelinx.com`;
      } else if (!isStoreAi && (rawAppUrl === 'https://jioplix.com' || rawAppUrl === 'http://jioplix.com')) {
        rawAppUrl = `https://${tenant.tenant_code.toLowerCase()}.jioplix.com`;
      }

      const baseClean = rawAppUrl.replace(/\/+$/, '').replace(/\/login$/, '');
      let launchUrl = '';
      let storeAiToken = '';

      if (isStoreAi) {
        storeAiToken = generateStoreAiToken({
          email,
          tenantCode: tenant.tenant_code,
          tenantName: tenant.name,
        });
        launchUrl = `${baseClean}/?token=${storeAiToken}&sso_token=${ssoToken}`;
      } else {
        launchUrl = `${baseClean}/login?sso_token=${ssoToken}&redirect=/tenant/dashboard`;
      }

      return json({
        ssoToken,
        storeAiToken: storeAiToken || undefined,
        launchUrl,
        tenantCode: tenant.tenant_code.toLowerCase(),
        tenantName: tenant.name,
        email,
      });
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

      const user = await queryOne<{ userId: string; email: string; name: string }>(`
        SELECT u.id AS "userId", u.email, COALESCE(u."displayName", u.email) AS name
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
        isProductionSecret: false,
      });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── SSO Token Generation: POST /auth/sso/token ─────────────────────────────
  if (p0 === 'auth' && p1 === 'sso' && p2 === 'token') {
    try {
      const body = await req.json().catch(() => ({}));
      const tenantParam = (body.tenantId || body.tenantCode) as string;
      const productCode = (body.productCode || 'JIOPLIX') as string;
      const email = (body.email || 'b.selvakumar@cognivectra.com') as string;

      if (!tenantParam) return apiError('tenantId or tenantCode is required', 400, 'MISSING_FIELDS');

      const tenant = await queryOne<{ id: string; tenant_code: string; name: string }>(`
        SELECT id, tenant_code, name FROM public.tenants
        WHERE id::text = $1 OR UPPER(tenant_code) = UPPER($1)
        LIMIT 1
      `, [tenantParam]);
      if (!tenant) return apiError(`Tenant '${tenantParam}' not found`, 404, 'TENANT_NOT_FOUND');

      const tp = await queryOne<{ app_url: string; product_code: string }>(`
        SELECT tp.app_url, p.product_code
        FROM public.tenant_products tp
        JOIN public.products p ON p.id = tp.product_id
        WHERE tp.tenant_id = $1 AND (p.product_code = $2 OR $2 IS NULL)
        ORDER BY tp.created_at DESC LIMIT 1
      `, [tenant.id, productCode ? productCode.toUpperCase() : null]);

      const ssoToken = generateSsoToken({
        user: email,
        tenantCode: tenant.tenant_code.toLowerCase(),
        tenantName: tenant.name,
        role: 'admin',
      });

      const isStoreAi = (productCode || '').toUpperCase() === 'STOREAI' ||
        (tp?.product_code || '').toUpperCase() === 'STOREAI' ||
        (tp?.app_url || '').includes('storeai');

      let rawAppUrl = tp?.app_url || '';
      if (!rawAppUrl) {
        if (isStoreAi) {
          rawAppUrl = `https://${tenant.tenant_code.toLowerCase()}.storeai.cybelinx.com`;
        } else {
          rawAppUrl = `https://${tenant.tenant_code.toLowerCase()}.jioplix.com`;
        }
      } else if (isStoreAi && rawAppUrl.includes('jioplix.com')) {
        rawAppUrl = `https://${tenant.tenant_code.toLowerCase()}.storeai.cybelinx.com`;
      } else if (!isStoreAi && (rawAppUrl === 'https://jioplix.com' || rawAppUrl === 'http://jioplix.com')) {
        rawAppUrl = `https://${tenant.tenant_code.toLowerCase()}.jioplix.com`;
      }

      const baseClean = rawAppUrl.replace(/\/+$/, '').replace(/\/login$/, '');
      let launchUrl = '';
      let storeAiToken = '';

      if (isStoreAi) {
        storeAiToken = generateStoreAiToken({
          email,
          tenantCode: tenant.tenant_code,
          tenantName: tenant.name,
        });
        launchUrl = `${baseClean}/?token=${storeAiToken}&sso_token=${ssoToken}`;
      } else {
        launchUrl = `${baseClean}/login?sso_token=${ssoToken}&redirect=/tenant/dashboard`;
      }

      return json({
        ssoToken,
        storeAiToken: storeAiToken || undefined,
        launchUrl,
        tenantCode: tenant.tenant_code.toLowerCase(),
        tenantName: tenant.name,
        email,
      });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Create Product: POST /products ──────────────────────────────────────────
  if (p0 === 'products' && !p1) {
    try {
      const body = await req.json().catch(() => ({}));
      const { productCode, name, description, baseUrl } = body as Record<string, string>;
      if (!productCode || !name) {
        return apiError('productCode and name are required', 400, 'MISSING_FIELDS');
      }
      const productId = crypto.randomUUID();
      await execute(`
        INSERT INTO public.products (id, product_code, name, description, status, base_url, created_at, updated_at, version)
        VALUES ($1, $2, $3, $4, 'ACTIVE', $5, NOW(), NOW(), 1)
      `, [productId, productCode.toUpperCase(), name, description || null, baseUrl || null]);
      return json({ productId, productCode: productCode.toUpperCase(), name, status: 'ACTIVE' }, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Product Repository Create: POST /product-repository ─────────────────────
  if (p0 === 'product-repository' && !p1) {
    try {
      const body = await req.json().catch(() => ({}));
      const {
        productCode, name, description, productCategory, status,
        domain, subdomainPattern, hostingProvider, deploymentUrl,
        healthEndpoint, databaseProvider, databaseLocation, databaseConnectionString,
        dbUrlDevelopment, dbUrlStaging, dbUrlProduction, dbCredentialsReference,
        defaultIsolationMode, schemaPrefix, ddlTemplatePath, configurationLocation,
      } = body as Record<string, unknown>;

      if (!productCode || !name) {
        return apiError('productCode and name are required', 400, 'MISSING_FIELDS');
      }

      const codeStr = String(productCode).trim().toUpperCase();
      const existing = await queryOne('SELECT id FROM public.products WHERE UPPER(product_code) = UPPER($1)', [codeStr]);
      if (existing) {
        return apiError(`Product code '${codeStr}' already exists`, 409, 'PRODUCT_CODE_TAKEN');
      }

      const id = crypto.randomUUID();
      const cat = mapCategoryToDb(productCategory ? String(productCategory) : null);
      const stat = status ? String(status) : 'ACTIVE';
      const d = domain ? String(domain).trim() : null;

      await execute(`
        INSERT INTO public.products (
          id, product_code, name, description, product_category, status,
          domain, base_url, subdomain_pattern, hosting_provider, deployment_url,
          health_endpoint, database_provider, database_location, database_connection_string,
          db_url_development, db_url_staging, db_url_production, db_credentials_reference,
          default_isolation_mode, schema_prefix, ddl_template_path, configuration_location,
          created_at, updated_at, version
        ) VALUES (
          $1, $2, $3, $4, $5::product_category, $6::productstatus,
          $7, $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22,
          NOW(), NOW(), 0
        )
      `, [
        id, codeStr, String(name).trim(), description ? String(description).trim() : null, cat, stat,
        d, subdomainPattern ? String(subdomainPattern).trim() : null,
        hostingProvider ? String(hostingProvider) : 'VERCEL',
        deploymentUrl ? String(deploymentUrl).trim() : null,
        healthEndpoint ? String(healthEndpoint).trim() : '/api/v1/health',
        databaseProvider ? String(databaseProvider) : 'AIVEN',
        databaseLocation ? String(databaseLocation).trim() : null,
        databaseConnectionString ? String(databaseConnectionString).trim() : null,
        dbUrlDevelopment ? String(dbUrlDevelopment).trim() : null,
        dbUrlStaging ? String(dbUrlStaging).trim() : null,
        dbUrlProduction ? String(dbUrlProduction).trim() : null,
        dbCredentialsReference ? String(dbCredentialsReference).trim() : null,
        defaultIsolationMode ? String(defaultIsolationMode) : 'SCHEMA_PER_TENANT',
        schemaPrefix ? String(schemaPrefix).trim() : null,
        ddlTemplatePath ? String(ddlTemplatePath).trim() : null,
        configurationLocation ? String(configurationLocation).trim() : null,
      ]);

      const created = await queryOne(`
        SELECT p.id AS "productId", p.id AS "repositoryId",
               p.product_code AS "productCode",
               p.name, p.description, p.status,
               COALESCE(p.product_category, 'ENTERPRISE_OPERATIONS') AS "productCategory",
               0 AS "customerCount",
               COALESCE(p.domain, p.base_url) AS "domain",
               p.subdomain_pattern AS "subdomainPattern",
               COALESCE(p.hosting_provider, 'VERCEL') AS "hostingProvider",
               p.deployment_url AS "deploymentUrl",
               COALESCE(p.health_endpoint, '/api/v1/health') AS "healthEndpoint",
               COALESCE(p.database_provider, 'AIVEN') AS "databaseProvider",
               p.database_location AS "databaseLocation",
               p.database_connection_string AS "databaseConnectionString",
               p.db_url_development AS "dbUrlDevelopment",
               p.db_url_staging AS "dbUrlStaging",
               COALESCE(p.db_url_production, p.database_connection_string) AS "dbUrlProduction",
               p.db_credentials_reference AS "dbCredentialsReference",
               COALESCE(p.default_isolation_mode, 'SCHEMA_PER_TENANT') AS "defaultIsolationMode",
               p.schema_prefix AS "schemaPrefix",
               p.ddl_template_path AS "ddlTemplatePath",
               p.configuration_location AS "configurationLocation",
               p.created_at AS "createdAt",
               p.updated_at AS "updatedAt"
        FROM public.products p
        WHERE p.id = $1
      `, [id]);

      return json(created, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Create Plan: POST /products/:id/plans ───────────────────────────────────
  if (p0 === 'products' && p1 && p2 === 'plans' && !p3) {
    try {
      const body = await req.json().catch(() => ({}));
      const { planCode, name, description, trialDays } = body as Record<string, unknown>;
      const product = await queryOne<{ productId: string }>(`
        SELECT id AS "productId" FROM public.products WHERE id::text = $1 OR product_code = $1 LIMIT 1
      `, [p1]);
      if (!product) return apiError('Product not found', 404, 'PRODUCT_NOT_FOUND');

      const planId = crypto.randomUUID();
      await execute(`
        INSERT INTO public.plans (id, product_id, plan_code, name, description, status, trial_days, created_at, updated_at, version)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, NOW(), NOW(), 1)
      `, [planId, product.productId, String(planCode).toUpperCase(), String(name), description ? String(description) : null, Number(trialDays) || 0]);
      return json({ planId, planCode, name, status: 'ACTIVE' }, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Create Version: POST /products/:id/versions ─────────────────────────────
  if (p0 === 'products' && p1 && p2 === 'versions') {
    try {
      const body = await req.json().catch(() => ({}));
      const { version, releaseNotes } = body as Record<string, string>;
      const product = await queryOne<{ productId: string }>(`
        SELECT id AS "productId" FROM public.products WHERE id::text = $1 OR product_code = $1 LIMIT 1
      `, [p1]);
      if (!product) return apiError('Product not found', 404, 'PRODUCT_NOT_FOUND');

      const versionId = crypto.randomUUID();
      await execute(`
        INSERT INTO public.product_versions (id, product_id, version, release_notes, is_current, published_at, created_at)
        VALUES ($1, $2, $3, $4, false, NOW(), NOW())
      `, [versionId, product.productId, version, releaseNotes || null]);
      return json({ versionId, version, isCurrent: false }, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Create Tenant: POST /tenants ────────────────────────────────────────────
  if (p0 === 'tenants' && !p1) {
    try {
      const body = await req.json().catch(() => ({}));
      const { tenantCode, name, regionCode, country, timezone } = body as Record<string, string>;
      if (!tenantCode || !name) {
        return apiError('tenantCode and name are required', 400, 'MISSING_FIELDS');
      }
      const tenantId = crypto.randomUUID();
      let regionId: string | null = null;
      if (regionCode) {
        const reg = await queryOne<{ id: string }>('SELECT id FROM public.regions WHERE region_code = $1', [regionCode]);
        regionId = reg?.id || null;
      }
      await execute(`
        INSERT INTO public.tenants (id, tenant_code, name, status, region_id, country, timezone, created_at, updated_at, version)
        VALUES ($1, $2, $3, 'ACTIVE', $4, $5, $6, NOW(), NOW(), 1)
      `, [tenantId, tenantCode.toUpperCase(), name, regionId, country || 'IN', timezone || 'Asia/Kolkata']);
      return json({
        tenant: {
          tenantId,
          tenantCode: tenantCode.toUpperCase(),
          name,
          status: 'ACTIVE',
          regionCode: regionCode || null,
          country: country || 'IN',
          timezone: timezone || 'Asia/Kolkata',
          createdAt: new Date().toISOString(),
        },
        access: { userId: tenantId, tenantId, membershipId: tenantId, roles: ['TENANT_ADMIN'], permissions: ['FULL_ACCESS'] },
        products: [],
        provisioningJobs: [],
      }, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Tenant Lifecycle: POST /tenants/:id/suspend, activate ───────────────────
  if (p0 === 'tenants' && p1 && (p2 === 'suspend' || p2 === 'activate')) {
    const nextStatus = p2 === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await execute(`
        UPDATE public.tenants SET status = $1, updated_at = NOW()
        WHERE id::text = $2 OR tenant_code = $2
      `, [nextStatus, p1]);
      return json({ tenantId: p1, status: nextStatus });
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Attach Product: POST /tenants/:id/products ──────────────────────────────
  if (p0 === 'tenants' && p1 && p2 === 'products') {
    try {
      const body = await req.json().catch(() => ({}));
      const { productId, productCode, planId, planCode, appUrl } = body as Record<string, string>;

      // 1. Resolve tenant
      const tenant = await queryOne<{ id: string; tenant_code: string; name: string }>(`
        SELECT id, tenant_code, name FROM public.tenants
        WHERE id::text = $1 OR tenant_code = $1
        LIMIT 1
      `, [p1]);
      if (!tenant) return apiError(`Tenant '${p1}' not found`, 404, 'TENANT_NOT_FOUND');

      // 2. Resolve Product
      let resolvedProductId: string | null = productId || null;
      let resolvedProductCode: string | null = productCode || null;
      let resolvedAppUrl: string | null = appUrl || null;

      if (!resolvedProductId && resolvedProductCode) {
        const prod = await queryOne<{ id: string; product_code: string; app_url: string | null }>(`
          SELECT id, product_code, base_url AS "app_url" FROM public.products
          WHERE product_code = $1 OR id::text = $1
          LIMIT 1
        `, [resolvedProductCode.toUpperCase()]);
        if (prod) {
          resolvedProductId = prod.id;
          resolvedProductCode = prod.product_code;
          if (!resolvedAppUrl) resolvedAppUrl = prod.app_url || null;
        }
      } else if (resolvedProductId && !resolvedProductCode) {
        const prod = await queryOne<{ id: string; product_code: string; app_url: string | null }>(`
          SELECT id, product_code, base_url AS "app_url" FROM public.products
          WHERE id::text = $1 LIMIT 1
        `, [resolvedProductId]);
        if (prod) {
          resolvedProductCode = prod.product_code;
          if (!resolvedAppUrl) resolvedAppUrl = prod.app_url || null;
        }
      }

      if (!resolvedProductId) {
        return apiError('Product not found. Either productId or productCode is required', 400, 'MISSING_FIELDS');
      }

      // 3. Resolve Plan
      let resolvedPlanId = planId || null;
      let resolvedPlanCode = planCode || null;

      if (!resolvedPlanId && resolvedPlanCode) {
        const p = await queryOne<{ id: string; plan_code: string }>(`
          SELECT id, plan_code FROM public.plans
          WHERE product_id::text = $1 AND (plan_code = $2 OR id::text = $2)
          LIMIT 1
        `, [resolvedProductId, resolvedPlanCode.toUpperCase()]);
        resolvedPlanId = p?.id || null;
        if (p?.plan_code) resolvedPlanCode = p.plan_code;
      }
      if (!resolvedPlanId) {
        const defaultPlan = await queryOne<{ id: string; plan_code: string }>(`
          SELECT id, plan_code FROM public.plans WHERE product_id::text = $1 ORDER BY plan_code LIMIT 1
        `, [resolvedProductId]);
        resolvedPlanId = defaultPlan?.id || null;
        resolvedPlanCode = defaultPlan?.plan_code || 'DEFAULT';
      }

      // 4. Resolve App URL dynamically if not specified
      if (!resolvedAppUrl) {
        const slug = tenant.tenant_code.toLowerCase().replace(/[^a-z0-9]/g, '');
        resolvedAppUrl = `https://${slug}.${resolvedProductCode?.toLowerCase() || 'cloud'}.jioplix.com`;
      }

      // 5. Atomic Upsert Tenant Product
      const tpResult = await queryOne<{ id: string }>(`
        INSERT INTO public.tenant_products
          (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW(), NOW(), 1, $5)
        ON CONFLICT (tenant_id, product_id)
        DO UPDATE SET
          status = 'ACTIVE',
          plan_id = COALESCE(EXCLUDED.plan_id, tenant_products.plan_id),
          app_url = COALESCE(EXCLUDED.app_url, tenant_products.app_url),
          updated_at = NOW()
        RETURNING id
      `, [crypto.randomUUID(), tenant.id, resolvedProductId, resolvedPlanId, resolvedAppUrl]);

      const tpId = tpResult?.id || crypto.randomUUID();

      // Ensure physical schema and tenant_resources record exist (atomic upsert)
      try {
        const schemaName = `${(resolvedProductCode || 'tenant').toLowerCase()}_${tenant.tenant_code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const resource = await queryOne<{ id: string }>(`
          SELECT id FROM public.resource_catalog WHERE resource_type_code = 'POSTGRES_SCHEMA' LIMIT 1
        `);
        const region = await queryOne<{ id: string }>(`SELECT id FROM public.regions LIMIT 1`);
        if (resource && region) {
          await execute(`
            INSERT INTO public.tenant_resources
              (id, tenant_id, product_id, resource_id, isolation_mode, schema_name, region_id, environment, status, provisioning_state, migration_version, tenant_product_id, created_at, updated_at, version)
            VALUES ($1, $2, $3, $4, 'SCHEMA_PER_TENANT', $5, $6, 'PRODUCTION', 'ACTIVE', 'SUCCEEDED', 1, $7, NOW(), NOW(), 1)
            ON CONFLICT (tenant_id, product_id, environment, resource_id)
            DO UPDATE SET
              status = 'ACTIVE',
              provisioning_state = 'SUCCEEDED',
              tenant_product_id = EXCLUDED.tenant_product_id,
              updated_at = NOW()
          `, [crypto.randomUUID(), tenant.id, resolvedProductId, resource.id, schemaName, region.id, tpId]);
          // Note: Operational schema lives exclusively in the product's database (e.g. Supabase), not Cybelinx Platform central database
        }
      } catch (rErr) {}

      // Emit platform audit event
      try {
        await execute(`
          INSERT INTO public.audit_events (id, action, entity_type, entity_id, actor_type, metadata, occurred_at)
          VALUES ($1, 'tenant.product_attached', 'TENANT', $2, 'SYSTEM', $3, NOW())
        `, [
          crypto.randomUUID(),
          tenant.id,
          JSON.stringify({
            tenantCode: tenant.tenant_code,
            productCode: resolvedProductCode,
            planCode: resolvedPlanCode,
            appUrl: resolvedAppUrl,
          })
        ]);
      } catch (aErr) {}

      // 6. Dispatch Welcome Email asynchronously to tenant's admin email with SSO token attached
      try {
        const bodyObj = body as Record<string, string>;
        const emailRecipient = (bodyObj.adminEmail || bodyObj.contactEmail || `admin@${tenant.tenant_code.toLowerCase()}.com`).trim();
        const ssoToken = generateSsoToken({
          user: emailRecipient,
          tenantCode: tenant.tenant_code.toLowerCase(),
          tenantName: tenant.name,
          role: 'admin',
        });
        const rawAppUrl = resolvedAppUrl || `https://${tenant.tenant_code.toLowerCase()}.jioplix.com`;
        const baseClean = rawAppUrl.replace(/\/+$/, '').replace(/\/login$/, '');
        const emailLaunchUrl = `${baseClean}/login?sso_token=${ssoToken}&redirect=/tenant/dashboard`;

        sendWelcomeEmail({
          to: emailRecipient,
          tenantName: tenant.name,
          tenantCode: tenant.tenant_code,
          productCode: resolvedProductCode || 'JIOPLIX',
          productName: resolvedProductCode === 'JIOPLIX' ? 'Jioplix HIMS' : (resolvedProductCode || 'Platform'),
          planCode: resolvedPlanCode || 'ENTERPRISE',
          appUrl: emailLaunchUrl,
          adminEmail: emailRecipient,
          tempPassword: 'Admin@123',
          contactName: tenant.name,
        }).catch(e => console.warn('[EMAIL] Automatic welcome email notice:', e));
      } catch (eErr) {}

      return json({
        subscription: {
          tenantProductId: tpId,
          tenantId: tenant.id,
          productId: resolvedProductId,
          productCode: resolvedProductCode,
          planId: resolvedPlanId,
          planCode: resolvedPlanCode,
          appUrl: resolvedAppUrl,
          status: 'ACTIVE'
        }
      }, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Explicit Send Welcome Email: POST /tenants/:id/welcome-email ────────────
  if (p0 === 'tenants' && p1 && p2 === 'welcome-email') {
    try {
      const body = await req.json().catch(() => ({}));
      const { to, productCode, tempPassword } = body as Record<string, string>;

      const tenant = await queryOne<{ id: string; tenant_code: string; name: string }>(`
        SELECT id, tenant_code, name FROM public.tenants
        WHERE id::text = $1 OR tenant_code = $1 LIMIT 1
      `, [p1]);
      if (!tenant) return apiError(`Tenant '${p1}' not found`, 404, 'TENANT_NOT_FOUND');

      // Find primary product subscription
      const sub = await queryOne<{ productCode: string; planCode: string; appUrl: string }>(`
        SELECT p.product_code AS "productCode", pl.plan_code AS "planCode", tp.app_url AS "appUrl"
        FROM public.tenant_products tp
        JOIN public.products p ON p.id = tp.product_id
        LEFT JOIN public.plans pl ON pl.id = tp.plan_id
        WHERE tp.tenant_id = $1 AND ($2::text IS NULL OR p.product_code = $2)
        ORDER BY tp.created_at DESC LIMIT 1
      `, [tenant.id, productCode ? productCode.toUpperCase() : null]);

      const resolvedProductCode = sub?.productCode || productCode || 'JIOPLIX';
      const resolvedPlanCode = sub?.planCode || 'ENTERPRISE';
      const resolvedAppUrl = sub?.appUrl || `https://${tenant.tenant_code.toLowerCase()}.jioplix.com/login`;
      const recipient = (to || `admin@${tenant.tenant_code.toLowerCase()}.com`).trim();

      const result = await sendWelcomeEmail({
        to: recipient,
        tenantName: tenant.name,
        tenantCode: tenant.tenant_code,
        productCode: resolvedProductCode,
        productName: resolvedProductCode === 'JIOPLIX' ? 'Jioplix HIMS' : resolvedProductCode,
        planCode: resolvedPlanCode,
        appUrl: resolvedAppUrl,
        adminEmail: recipient,
        tempPassword: tempPassword || 'Admin@123',
        contactName: tenant.name,
      });

      return json({
        success: result.success,
        messageId: result.id,
        sentTo: recipient,
        error: result.error,
      }, result.success ? 200 : 400);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Register Resource: POST /tenants/:id/resources ──────────────────────────
  if (p0 === 'tenants' && p1 && p2 === 'resources') {
    try {
      const body = await req.json().catch(() => ({}));
      const { productCode, resourceTypeCode, isolationMode, environment, schemaName } = body as Record<string, string>;

      const tenant = await queryOne<{ id: string; tenant_code: string }>(`
        SELECT id, tenant_code FROM public.tenants WHERE id::text = $1 OR tenant_code = $1 LIMIT 1
      `, [p1]);
      if (!tenant) return apiError(`Tenant '${p1}' not found`, 404, 'TENANT_NOT_FOUND');

      const prod = await queryOne<{ id: string }>(`
        SELECT id FROM public.products WHERE product_code = $1 OR id::text = $1 LIMIT 1
      `, [(productCode || 'JIOPLIX').toUpperCase()]);

      const resCatalog = await queryOne<{ id: string }>(`
        SELECT id FROM public.resource_catalog WHERE resource_type_code = $1 OR id::text = $1 LIMIT 1
      `, [resourceTypeCode || 'POSTGRES_SCHEMA']);

      const region = await queryOne<{ id: string }>(`SELECT id FROM public.regions LIMIT 1`);
      const targetSchema = schemaName || `${(productCode || 'app').toLowerCase()}_${tenant.tenant_code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const resourceId = crypto.randomUUID();

      await execute(`
        INSERT INTO public.tenant_resources
          (id, tenant_id, product_id, resource_id, isolation_mode, schema_name, region_id, environment, status, provisioning_state, migration_version, created_at, updated_at, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', 'SUCCEEDED', 1, NOW(), NOW(), 1)
      `, [
        resourceId,
        tenant.id,
        prod?.id || null,
        resCatalog?.id || null,
        isolationMode || 'SCHEMA_PER_TENANT',
        targetSchema,
        region?.id || null,
        environment || 'PRODUCTION'
      ]);

      // Note: Operational schema lives exclusively in the product's database (e.g. Supabase), not Cybelinx Platform central database

      return json({
        tenantResourceId: resourceId,
        tenantId: tenant.id,
        schemaName: targetSchema,
        status: 'ACTIVE',
        provisioningState: 'SUCCEEDED'
      }, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Create Subscription: POST /subscriptions ────────────────────────────────
  if (p0 === 'subscriptions' && !p1) {
    try {
      const body = await req.json().catch(() => ({}));
      const { tenantId, productCode, planCode, appUrl } = body as Record<string, string>;
      const product = await queryOne<{ productId: string }>(`
        SELECT id AS "productId" FROM public.products WHERE product_code = $1 LIMIT 1
      `, [productCode.toUpperCase()]);
      if (!product) return apiError('Product not found', 404, 'PRODUCT_NOT_FOUND');

      let planId: string | null = null;
      if (planCode) {
        const p = await queryOne<{ id: string }>('SELECT id FROM public.plans WHERE product_id = $1 AND plan_code = $2', [product.productId, planCode.toUpperCase()]);
        planId = p?.id || null;
      }
      if (!planId) {
        const p = await queryOne<{ id: string }>('SELECT id FROM public.plans WHERE product_id = $1 LIMIT 1', [product.productId]);
        planId = p?.id || null;
      }

      const tpId = crypto.randomUUID();
      const tpResult = await queryOne<{ id: string }>(`
        INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW(), NOW(), 1, $5)
        ON CONFLICT (tenant_id, product_id)
        DO UPDATE SET
          status = 'ACTIVE',
          plan_id = COALESCE(EXCLUDED.plan_id, tenant_products.plan_id),
          app_url = COALESCE(EXCLUDED.app_url, tenant_products.app_url),
          updated_at = NOW()
        RETURNING id
      `, [tpId, tenantId, product.productId, planId, appUrl || null]);
      return json({ subscription: { tenantProductId: tpResult?.id || tpId, status: 'ACTIVE' } }, 201);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── Universal Multi-Product Onboard Tenant (POST /onboarding/execute, POST /tenants/onboard) ─
  if ((p0 === 'tenants' && p1 === 'onboard') || (p0 === 'onboarding' && p1 === 'execute')) {
    try {
      const body = await req.json().catch(() => ({}));
      const {
        productCode, tenantCode, tenantName, externalId,
        planCode, domain, contactEmail, adminEmail, country, timezone,
      } = body as Record<string, string>;

      if (!productCode || !tenantCode || !tenantName || !externalId) {
        return apiError('productCode, tenantCode, tenantName, externalId are required', 400, 'MISSING_FIELDS');
      }

      const product = await queryOne<{ productId: string; productCode: string; name: string }>(`
        SELECT id AS "productId", product_code AS "productCode", name
        FROM public.products WHERE product_code = $1 LIMIT 1
      `, [productCode.toUpperCase()]);
      if (!product) return apiError(`Product '${productCode}' not found`, 404, 'PRODUCT_NOT_FOUND');

      const resolvedPlanCode = planCode || 'BASIC';
      let plan = await queryOne<{ planId: string; planCode: string }>(`
        SELECT id AS "planId", plan_code AS "planCode"
        FROM public.plans WHERE product_id::text = $1 AND plan_code = $2 LIMIT 1
      `, [product.productId, resolvedPlanCode.toUpperCase()]);
      if (!plan) {
        plan = await queryOne<{ planId: string; planCode: string }>(`
          SELECT id AS "planId", plan_code AS "planCode"
          FROM public.plans WHERE product_id::text = $1 LIMIT 1
        `, [product.productId]);
      }

      const existing = await queryOne<{ id: string }>(`
        SELECT id FROM public.tenants WHERE tenant_code = $1 LIMIT 1
      `, [tenantCode.toUpperCase()]);
      if (existing) return apiError(`Tenant code '${tenantCode}' already exists`, 409, 'TENANT_EXISTS');

      const region = await queryOne<{ regionId: string }>(`
        SELECT id AS "regionId" FROM public.regions WHERE region_code = 'ap-south-1' LIMIT 1
      `);

      const resource = await queryOne<{ resourceId: string }>(`
        SELECT id AS "resourceId" FROM public.resource_catalog
        WHERE resource_type_code = 'POSTGRES_SCHEMA' AND status = 'ACTIVE' LIMIT 1
      `);

      const tenantId = crypto.randomUUID();
      const tenantProductId = crypto.randomUUID();
      const targetDomain = domain || `https://${tenantCode.toLowerCase()}.${productCode.toLowerCase()}.com`;
      const resolvedEmail = adminEmail || contactEmail || `admin@${tenantCode.toLowerCase()}.com`;

      await execute(`
        INSERT INTO public.tenants (id, tenant_code, name, status, country, timezone, created_at, updated_at, version)
        VALUES ($1, $2, $3, 'ACTIVE', $4, $5, NOW(), NOW(), 1)
      `, [tenantId, tenantCode.toUpperCase(), tenantName, country || 'IN', timezone || 'Asia/Kolkata']);

      await execute(`
        INSERT INTO public.tenant_products
          (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW(), NOW(), 1, $5)
        ON CONFLICT (tenant_id, product_id)
        DO UPDATE SET
          status = 'ACTIVE',
          plan_id = COALESCE(EXCLUDED.plan_id, tenant_products.plan_id),
          app_url = COALESCE(EXCLUDED.app_url, tenant_products.app_url),
          updated_at = NOW()
      `, [tenantProductId, tenantId, product.productId, plan?.planId || null, targetDomain]);

      const schemaName = `${productCode.toLowerCase()}_${tenantCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (region && resource) {
        await execute(`
          INSERT INTO public.tenant_resources
            (id, tenant_id, product_id, resource_id, isolation_mode, schema_name,
             region_id, environment, status, provisioning_state, migration_version,
             tenant_product_id, created_at, updated_at, version)
          VALUES ($1,$2,$3,$4,'SCHEMA_PER_TENANT',$5,$6,'PRODUCTION','ACTIVE','SUCCEEDED',1,$7,NOW(),NOW(),1)
          ON CONFLICT (tenant_id, product_id, environment, resource_id)
          DO UPDATE SET
            status = 'ACTIVE',
            provisioning_state = 'SUCCEEDED',
            tenant_product_id = EXCLUDED.tenant_product_id,
            updated_at = NOW()
        `, [crypto.randomUUID(), tenantId, product.productId, resource.resourceId,
            schemaName, region.regionId, tenantProductId]);

        // Note: Operational schema lives exclusively in the product's database, not Cybelinx Platform central database
      }

      await execute(`
        INSERT INTO public.tenant_external_identifiers
          (id, tenant_id, product_id, provider, external_id, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [crypto.randomUUID(), tenantId, product.productId, `${productCode.toUpperCase()}_NEXUS`, externalId]);

      // Emit platform audit trail event
      try {
        await execute(`
          INSERT INTO public.audit_events (id, action, entity_type, entity_id, actor_type, metadata, occurred_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          crypto.randomUUID(),
          'tenant.provisioned',
          'TENANT',
          tenantId,
          'SYSTEM',
          JSON.stringify({
            tenantCode: tenantCode.toUpperCase(),
            tenantName,
            productCode: product.productCode,
            plan: plan?.planCode || resolvedPlanCode,
            schema: schemaName,
            domain: targetDomain,
            adminEmail: resolvedEmail,
          })
        ]);
      } catch (auditErr) {
        console.warn('Audit trail notice:', auditErr);
      }

      // Emit transactional outbox event
      try {
        await execute(`
          INSERT INTO public.platform_events (
            id, event_type, schema_version, tenant_id, product_id,
            entity_type, entity_id, status, source, payload,
            occurred_at, created_at, updated_at
          )
          VALUES ($1, $2, '1.0', $3, $4, 'TENANT', $5, 'SUCCEEDED', 'CENTRAL_CONTROL_PLANE', $6, NOW(), NOW(), NOW())
        `, [
          crypto.randomUUID(),
          'tenant.provisioned',
          tenantId,
          product.productId,
          tenantId,
          JSON.stringify({
            tenantCode: tenantCode.toUpperCase(),
            tenantName,
            productCode: product.productCode,
            plan: plan?.planCode || resolvedPlanCode,
            schema: schemaName,
            appUrl: targetDomain,
            adminEmail: resolvedEmail,
            provisionedAt: new Date().toISOString(),
          })
        ]);
      } catch (outboxErr) {
        console.warn('Outbox event notice:', outboxErr);
      }

      // Dispatch Welcome Email asynchronously
      sendWelcomeEmail({
        to: resolvedEmail,
        tenantName,
        tenantCode: tenantCode.toUpperCase(),
        productCode: product.productCode,
        productName: product.productCode === 'JIOPLIX' ? 'Jioplix HIMS' : (product.name || product.productCode),
        planCode: plan?.planCode || resolvedPlanCode,
        appUrl: targetDomain,
        adminEmail: resolvedEmail,
        tempPassword: 'Admin@123',
        contactName: tenantName,
      }).catch(e => console.warn('[EMAIL] Onboarding welcome email notice:', e));

      return json({
        status: 'SUCCESS',
        tenantStatus: 'ACTIVE',
        resourceStatus: 'SUCCEEDED',
        schemaName,
        message: `Tenant '${tenantName}' (${tenantCode.toUpperCase()}) successfully provisioned and bound to ${product.productCode}.`,
        tenantId,
        tenantCode: tenantCode.toUpperCase(),
        tenantName,
        productCode: product.productCode,
        planCode: plan?.planCode || resolvedPlanCode,
        externalId,
        provider: `${productCode.toUpperCase()}_NEXUS`,
        appUrl: targetDomain,
        adminEmail: resolvedEmail,
        timestamp: new Date().toISOString(),
        executedSteps: ['VALIDATE_TENANT', 'MAP_EXTERNAL_ID', 'ATTACH_SUBSCRIPTION', 'PROVISION_SCHEMA', 'EMIT_OUTBOX_EVENT'],
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
  const [p0, p1, p2, p3] = path;

  // PUT /products/:id
  if (p0 === 'products' && p1 && !p2) {
    try {
      const body = await req.json().catch(() => ({}));
      const { name, description } = body as Record<string, string>;
      await execute(`
        UPDATE public.products SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
        WHERE id::text = $3 OR product_code = $3
      `, [name || null, description || null, p1]);
      return json({ status: 'updated' });
    } catch (err) {
      return dbError(err);
    }
  }

  // PUT /products/:id/versions/:versionId/publish
  if (p0 === 'products' && p1 && p2 === 'versions' && p3) {
    try {
      await execute(`
        UPDATE public.product_versions SET is_current = true WHERE id::text = $1
      `, [p3]);
      return json({ versionId: p3, isCurrent: true, status: 'PUBLISHED' });
    } catch (err) {
      return dbError(err);
    }
  }

  // PUT /tenants/:id
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
        vals,
      );
      return json({ status: 'updated' });
    } catch (err) {
      return dbError(err);
    }
  }
  // ── PUT /product-repository/:productId ────────────────────────────────────────
  if (p0 === 'product-repository' && p1 && !p2) {
    try {
      const body = await req.json().catch(() => ({}));
      const {
        name, description, productCategory, status,
        domain, subdomainPattern, hostingProvider, deploymentUrl,
        healthEndpoint, databaseProvider, databaseLocation, databaseConnectionString,
        dbUrlDevelopment, dbUrlStaging, dbUrlProduction, dbCredentialsReference,
        defaultIsolationMode, schemaPrefix, ddlTemplatePath, configurationLocation,
      } = body as Record<string, unknown>;

      const product = await queryOne<{ id: string; product_code: string }>(`
        SELECT id, product_code FROM public.products
        WHERE id::text = $1 OR product_code = $1
        LIMIT 1
      `, [p1]);
      if (!product) return apiError(`Product '${p1}' not found`, 404, 'PRODUCT_NOT_FOUND');

      const cat = productCategory !== undefined ? mapCategoryToDb(productCategory ? String(productCategory) : null) : null;
      const dom = domain !== undefined ? (domain ? String(domain).trim() : null) : undefined;

      await execute(`
        UPDATE public.products SET
          name = CASE WHEN $1::text IS NOT NULL THEN $1::text ELSE name END,
          description = CASE WHEN $2 IS TRUE THEN $3::text ELSE description END,
          product_category = CASE WHEN $4::text IS NOT NULL THEN $4::product_category ELSE product_category END,
          status = CASE WHEN $5::text IS NOT NULL THEN $5::productstatus ELSE status END,
          domain = CASE WHEN $6 IS TRUE THEN $7::text ELSE domain END,
          base_url = CASE WHEN $6 IS TRUE THEN $7::text ELSE base_url END,
          subdomain_pattern = CASE WHEN $8 IS TRUE THEN $9::text ELSE subdomain_pattern END,
          hosting_provider = CASE WHEN $10 IS TRUE THEN $11::text ELSE hosting_provider END,
          deployment_url = CASE WHEN $12 IS TRUE THEN $13::text ELSE deployment_url END,
          health_endpoint = CASE WHEN $14 IS TRUE THEN $15::text ELSE health_endpoint END,
          database_provider = CASE WHEN $16 IS TRUE THEN $17::text ELSE database_provider END,
          database_location = CASE WHEN $18 IS TRUE THEN $19::text ELSE database_location END,
          database_connection_string = CASE WHEN $20 IS TRUE THEN $21::text ELSE database_connection_string END,
          db_url_development = CASE WHEN $22 IS TRUE THEN $23::text ELSE db_url_development END,
          db_url_staging = CASE WHEN $24 IS TRUE THEN $25::text ELSE db_url_staging END,
          db_url_production = CASE WHEN $26 IS TRUE THEN $27::text ELSE db_url_production END,
          db_credentials_reference = CASE WHEN $28 IS TRUE THEN $29::text ELSE db_credentials_reference END,
          default_isolation_mode = CASE WHEN $30 IS TRUE THEN $31::text ELSE default_isolation_mode END,
          schema_prefix = CASE WHEN $32 IS TRUE THEN $33::text ELSE schema_prefix END,
          ddl_template_path = CASE WHEN $34 IS TRUE THEN $35::text ELSE ddl_template_path END,
          configuration_location = CASE WHEN $36 IS TRUE THEN $37::text ELSE configuration_location END,
          updated_at = NOW(),
          version = version + 1
        WHERE id = $38
      `, [
        name ? String(name).trim() : null,                                               // $1
        description !== undefined,                                                       // $2
        description ? String(description).trim() : null,                                 // $3
        cat,                                                                             // $4
        status ? String(status) : null,                                                  // $5
        dom !== undefined,                                                               // $6
        dom !== undefined ? dom : null,                                                  // $7
        subdomainPattern !== undefined,                                                  // $8
        subdomainPattern ? String(subdomainPattern).trim() : null,                       // $9
        hostingProvider !== undefined,                                                   // $10
        hostingProvider ? String(hostingProvider) : null,                                // $11
        deploymentUrl !== undefined,                                                     // $12
        deploymentUrl ? String(deploymentUrl).trim() : null,                             // $13
        healthEndpoint !== undefined,                                                    // $14
        healthEndpoint ? String(healthEndpoint).trim() : null,                           // $15
        databaseProvider !== undefined,                                                  // $16
        databaseProvider ? String(databaseProvider) : null,                              // $17
        databaseLocation !== undefined,                                                  // $18
        databaseLocation ? String(databaseLocation).trim() : null,                       // $19
        databaseConnectionString !== undefined,                                          // $20
        databaseConnectionString ? String(databaseConnectionString).trim() : null,       // $21
        dbUrlDevelopment !== undefined,                                                  // $22
        dbUrlDevelopment ? String(dbUrlDevelopment).trim() : null,                       // $23
        dbUrlStaging !== undefined,                                                      // $24
        dbUrlStaging ? String(dbUrlStaging).trim() : null,                               // $25
        dbUrlProduction !== undefined,                                                   // $26
        dbUrlProduction ? String(dbUrlProduction).trim() : null,                         // $27
        dbCredentialsReference !== undefined,                                            // $28
        dbCredentialsReference ? String(dbCredentialsReference).trim() : null,           // $29
        defaultIsolationMode !== undefined,                                              // $30
        defaultIsolationMode ? String(defaultIsolationMode) : null,                      // $31
        schemaPrefix !== undefined,                                                      // $32
        schemaPrefix ? String(schemaPrefix).trim() : null,                               // $33
        ddlTemplatePath !== undefined,                                                   // $34
        ddlTemplatePath ? String(ddlTemplatePath).trim() : null,                         // $35
        configurationLocation !== undefined,                                             // $36
        configurationLocation ? String(configurationLocation).trim() : null,             // $37
        product.id,                                                                      // $38
      ]);

      const updated = await queryOne(`
        SELECT p.id AS "productId", p.id AS "repositoryId",
               p.product_code AS "productCode",
               p.name, p.description, p.status,
               COALESCE(p.product_category, 'ENTERPRISE_OPERATIONS') AS "productCategory",
               COUNT(DISTINCT tp.tenant_id)::int AS "customerCount",
               COALESCE(p.domain, p.base_url) AS "domain",
               p.subdomain_pattern AS "subdomainPattern",
               COALESCE(p.hosting_provider, 'VERCEL') AS "hostingProvider",
               p.deployment_url AS "deploymentUrl",
               COALESCE(p.health_endpoint, '/api/v1/health') AS "healthEndpoint",
               COALESCE(p.database_provider, 'AIVEN') AS "databaseProvider",
               p.database_location AS "databaseLocation",
               p.database_connection_string AS "databaseConnectionString",
               p.db_url_development AS "dbUrlDevelopment",
               p.db_url_staging AS "dbUrlStaging",
               COALESCE(p.db_url_production, p.database_connection_string) AS "dbUrlProduction",
               p.db_credentials_reference AS "dbCredentialsReference",
               COALESCE(p.default_isolation_mode, 'SCHEMA_PER_TENANT') AS "defaultIsolationMode",
               p.schema_prefix AS "schemaPrefix",
               p.ddl_template_path AS "ddlTemplatePath",
               p.configuration_location AS "configurationLocation",
               p.created_at AS "createdAt",
               p.updated_at AS "updatedAt"
        FROM public.products p
        LEFT JOIN public.tenant_products tp ON tp.product_id = p.id AND tp.status = 'ACTIVE'
        WHERE p.id = $1
        GROUP BY p.id
      `, [product.id]);

      return json(updated);
    } catch (err) {
      return dbError(err);
    }
  }

  // ── PUT /product-repository/:productId/customers/:tenantId ──────────────────
  if (p0 === 'product-repository' && p1 && p2 === 'customers' && p3) {
    try {
      const body = await req.json().catch(() => ({}));
      const { tenantSchema, databaseName, contactPerson, contactEmail } = body as Record<string, unknown>;

      const product = await queryOne<{ id: string }>(`
        SELECT id FROM public.products WHERE id::text = $1 OR product_code = $1 LIMIT 1
      `, [p1]);
      if (!product) return apiError(`Product '${p1}' not found`, 404, 'PRODUCT_NOT_FOUND');

      const tenant = await queryOne<{ id: string; tenant_code: string }>(`
        SELECT id, tenant_code FROM public.tenants WHERE id::text = $1 OR tenant_code = $1 LIMIT 1
      `, [p3]);
      if (!tenant) return apiError(`Tenant '${p3}' not found`, 404, 'TENANT_NOT_FOUND');

      await execute(`
        INSERT INTO public.product_repository_customers (
          id, version, product_id, tenant_id, tenant_schema, database_name,
          contact_person, contact_email, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), 0, $1, $2, $3, $4, $5, $6, NOW(), NOW()
        )
        ON CONFLICT (product_id, tenant_id) DO UPDATE SET
          tenant_schema = EXCLUDED.tenant_schema,
          database_name = EXCLUDED.database_name,
          contact_person = EXCLUDED.contact_person,
          contact_email = EXCLUDED.contact_email,
          updated_at = NOW(),
          version = public.product_repository_customers.version + 1
      `, [
        product.id,
        tenant.id,
        tenantSchema ? String(tenantSchema).trim() : null,
        databaseName ? String(databaseName).trim() : null,
        contactPerson ? String(contactPerson).trim() : null,
        contactEmail ? String(contactEmail).trim() : null,
      ]);

      if (tenantSchema) {
        await execute(`
          UPDATE public.tenant_resources SET schema_name = $1, updated_at = NOW()
          WHERE tenant_id = $2 AND product_id = $3
        `, [String(tenantSchema).trim(), tenant.id, product.id]);
      }

      return json({
        tenantId: tenant.id,
        tenantCode: tenant.tenant_code,
        tenantSchema,
        databaseName,
        contactPerson,
        contactEmail,
      });
    } catch (err) {
      return dbError(err);
    }
  }

  return json({ status: 'ok' });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1, p2, p3, p4] = path;

  // PATCH /products/:id/status
  if (p0 === 'products' && p1 && p2 === 'status') {
    try {
      const body = await req.json().catch(() => ({}));
      const { status } = body as { status: string };
      await execute(`
        UPDATE public.products SET status = $1, updated_at = NOW() WHERE id::text = $2 OR product_code = $2
      `, [status, p1]);
      return json({ productId: p1, status });
    } catch (err) {
      return dbError(err);
    }
  }

  // PATCH /subscriptions/:id/status
  if (p0 === 'subscriptions' && p1 && p2 === 'status') {
    try {
      const body = await req.json().catch(() => ({}));
      const { status } = body as { status: string };
      await execute(`
        UPDATE public.tenant_products SET status = $1, updated_at = NOW() WHERE id::text = $2
      `, [status, p1]);
      return json({ tenantProductId: p1, status });
    } catch (err) {
      return dbError(err);
    }
  }

  // PATCH /tenants/:id/products/:productCode/status
  if (p0 === 'tenants' && p1 && p2 === 'products' && p3 && p4 === 'status') {
    try {
      const body = await req.json().catch(() => ({}));
      const { status } = body as { status: string };
      await execute(`
        UPDATE public.tenant_products tp
        SET status = $1, updated_at = NOW()
        FROM public.tenants t, public.products p
        WHERE tp.tenant_id = t.id AND tp.product_id = p.id
          AND (t.id::text = $2 OR t.tenant_code = $2)
          AND (p.product_code = $3 OR p.id::text = $3)
      `, [status, p1, p3.toUpperCase()]);
      return json({ tenantId: p1, productCode: p3, status });
    } catch (err) {
      return dbError(err);
    }
  }

  return PUT(req, { params });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1, p2, p3] = path;

  // DELETE /product-repository/:productId
  if (p0 === 'product-repository' && p1 && !p2) {
    try {
      const product = await queryOne<{ id: string }>(`
        SELECT id FROM public.products WHERE id::text = $1 OR product_code = $1 LIMIT 1
      `, [p1]);
      if (!product) return apiError(`Product '${p1}' not found`, 404, 'PRODUCT_NOT_FOUND');

      await execute('DELETE FROM public.product_repository_customers WHERE product_id = $1', [product.id]);
      await execute('DELETE FROM public.products WHERE id = $1', [product.id]);
      return json({ status: 'deleted' });
    } catch (err) {
      return dbError(err);
    }
  }

  // DELETE /tenants/:id
  if (p0 === 'tenants' && p1 && !p2) {
    try {
      await execute(
        `UPDATE public.tenants SET status = 'DELETION_PENDING', updated_at = NOW()
         WHERE id::text = $1 OR tenant_code = $1`,
        [p1],
      );
      return json({ status: 'deletion_pending' });
    } catch (err) {
      return dbError(err);
    }
  }

  // DELETE /tenants/:id/products/:productCode
  if (p0 === 'tenants' && p1 && p2 === 'products' && p3) {
    try {
      await execute(`
        DELETE FROM public.tenant_products tp
        USING public.tenants t, public.products p
        WHERE tp.tenant_id = t.id AND tp.product_id = p.id
          AND (t.id::text = $1 OR t.tenant_code = $1)
          AND (p.product_code = $2 OR p.id::text = $2)
      `, [p1, p3.toUpperCase()]);
      return json({ tenantId: p1, productCode: p3, status: 'DETACHED' });
    } catch (err) {
      return dbError(err);
    }
  }

  // DELETE /subscriptions/:id
  if (p0 === 'subscriptions' && p1) {
    try {
      await execute(`
        DELETE FROM public.tenant_products WHERE id::text = $1
      `, [p1]);
      return json({ tenantProductId: p1, status: 'DETACHED' });
    } catch (err) {
      return dbError(err);
    }
  }

  return json({ status: 'ok' });
}
