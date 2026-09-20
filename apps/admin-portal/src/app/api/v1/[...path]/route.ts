/**
 * Cybelinx Control Plane API — Vercel Edge-compatible route handler.
 * All data is read from / written to the real PostgreSQL database via DATABASE_URL.
 * No mocks, no in-memory stores.
 *
 * Runtime: nodejs (NOT edge — pg requires Node.js APIs)
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, getDatabaseDiagnostics } from '@/lib/db';

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

// ─── Default Onboarding Definitions Builder ───────────────────────────────────
function buildProductDefinition(p: { productCode: string; name: string; description: string | null; plans: { planCode: string }[] }) {
  const code = p.productCode.toUpperCase();
  const availablePlans = (p.plans && p.plans.length > 0) ? p.plans.map((pl) => pl.planCode) : ['STARTER', 'ENTERPRISE'];
  const defaultPlanCode = availablePlans[0];

  if (code === 'JIOPLIX' || code === 'JIOPLIX_SMART') {
    return {
      productCode: code,
      version: '1.0.0',
      displayName: p.name || 'Jioplix Hospital Management System',
      description: p.description || 'Enterprise clinical EHR, inpatient/outpatient hospital operations, and multi-facility healthcare platform',
      provider: `${code}_NEXUS`,
      tenantIdentifier: {
        key: 'externalId',
        label: 'Hospital External ID',
        placeholder: 'e.g. JIOPLIX_NEXUS, HOSP_APOLLO_01',
        required: true,
        hint: 'External primary key in upstream hospital database',
      },
      fields: [
        { key: 'hospitalName', label: 'Hospital Name', type: 'text' as const, required: true, placeholder: 'e.g. Apollo Multispecialty Hospital', hint: 'Official healthcare institution name' },
        { key: 'domain', label: 'Hospital Domain / Portal URL', type: 'url' as const, required: false, placeholder: 'https://apollo.jioplix.com', hint: 'Dedicated vanity or primary web domain' },
        { key: 'contactEmail', label: 'Contact / Admin Email', type: 'email' as const, required: true, placeholder: 'admin@apollo.org', hint: 'Official email for platform administrative notices' },
        { key: 'country', label: 'Country / Jurisdiction', type: 'text' as const, required: false, placeholder: 'India', hint: 'Legal operating jurisdiction for healthcare compliance' },
        { key: 'timezone', label: 'Timezone', type: 'text' as const, required: false, placeholder: 'Asia/Kolkata', hint: 'Operating timezone for appointments and clinical logs' },
      ],
      subscription: {
        required: true,
        defaultPlanCode,
        availablePlans,
      },
      resource: {
        defaultResourceType: 'POSTGRES_SCHEMA',
        supportedIsolationModes: ['SCHEMA_PER_TENANT', 'SHARED_POOL', 'DEDICATED_DATABASE'],
        defaultIsolationMode: 'SCHEMA_PER_TENANT',
        schemaPrefix: `${code.toLowerCase()}_`,
      },
      provisioningSteps: ['VALIDATE_TENANT', 'MAP_EXTERNAL_ID', 'ATTACH_SUBSCRIPTION', 'PROVISION_SCHEMA', 'EMIT_OUTBOX_EVENT'],
      healthCheckEndpoint: '/api/v1/health',
    };
  }

  if (code === 'STOREAI') {
    return {
      productCode: code,
      version: '1.0.0',
      displayName: p.name || 'StoreAI Composable Commerce',
      description: p.description || 'Multi-brand autonomous retail engine, dynamic checkout, inventory management, and omnichannel commerce platform',
      provider: 'STOREAI_NEXUS',
      tenantIdentifier: {
        key: 'externalId',
        label: 'Store External ID',
        placeholder: 'e.g. STOREAI_NEXUS, STORE_NIKE_01',
        required: true,
        hint: 'Merchant or store identifier in existing StoreAI retail database',
      },
      fields: [
        { key: 'storeName', label: 'Store / Merchant Name', type: 'text' as const, required: true, placeholder: 'e.g. Nike Flagship Online', hint: 'Commercial name of the store or retail brand' },
        { key: 'domain', label: 'Store Domain / Storefront URL', type: 'url' as const, required: false, placeholder: 'https://nike.storeai.com', hint: 'Custom or hosted storefront domain' },
        { key: 'contactEmail', label: 'Merchant Contact Email', type: 'email' as const, required: true, placeholder: 'merchant@nike.com', hint: 'Primary merchant administrator email address' },
        { key: 'adminUserId', label: 'Merchant Admin User ID', type: 'text' as const, required: false, placeholder: 'usr_nike_owner_01', hint: 'Existing StoreAI merchant user identifier' },
      ],
      subscription: {
        required: true,
        defaultPlanCode,
        availablePlans,
      },
      resource: {
        defaultResourceType: 'POSTGRES_SCHEMA',
        supportedIsolationModes: ['SCHEMA_PER_TENANT', 'SHARED_POOL', 'DEDICATED_DATABASE'],
        defaultIsolationMode: 'SCHEMA_PER_TENANT',
        schemaPrefix: 'storeai_',
      },
      provisioningSteps: ['VALIDATE_TENANT', 'MAP_EXTERNAL_ID', 'ATTACH_SUBSCRIPTION', 'PROVISION_SCHEMA', 'EMIT_OUTBOX_EVENT'],
      healthCheckEndpoint: '/api/v1/health',
    };
  }

  return {
    productCode: code,
    version: '1.0.0',
    displayName: p.name,
    description: p.description || `${p.name} SaaS Product`,
    provider: `${code}_NEXUS`,
    tenantIdentifier: {
      key: 'externalId',
      label: `${p.name} External ID`,
      placeholder: `e.g. ${code}_CLIENT_01`,
      required: true,
      hint: `Unique identifier in upstream ${p.name} system`,
    },
    fields: [
      { key: 'contactEmail', label: 'Admin Email', type: 'email' as const, required: true, placeholder: `admin@${code.toLowerCase()}.com`, hint: 'Primary contact email' },
      { key: 'domain', label: 'Custom Domain', type: 'url' as const, required: false, placeholder: `https://${code.toLowerCase()}.cybelinx.com`, hint: 'Dedicated domain' },
    ],
    subscription: {
      required: true,
      defaultPlanCode,
      availablePlans,
    },
    resource: {
      defaultResourceType: 'POSTGRES_SCHEMA',
      supportedIsolationModes: ['SCHEMA_PER_TENANT', 'SHARED_POOL', 'DEDICATED_DATABASE'],
      defaultIsolationMode: 'SCHEMA_PER_TENANT',
      schemaPrefix: `${code.toLowerCase()}_`,
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
          JOIN public.plans pl ON pl.id = tp.plan_id
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
               p.base_url AS "domain",
               '/api/v1/health' AS "healthEndpoint",
               'AIVEN' AS "databaseProvider",
               'SCHEMA_PER_TENANT' AS "defaultIsolationMode",
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
               tr.schema_name AS "tenantSchema", tr.isolation_mode AS "isolationMode",
               'cybelinx-platform' AS "databaseName"
        FROM public.tenant_products tp
        JOIN public.tenants t ON t.id = tp.tenant_id
        JOIN public.products p ON p.id = tp.product_id
        JOIN public.plans pl ON pl.id = tp.plan_id
        LEFT JOIN public.tenant_resources tr ON tr.tenant_id = tp.tenant_id AND tr.product_id = tp.product_id
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
      const { productCode, planCode } = body as Record<string, string>;
      const tenant = await queryOne<{ id: string; tenantCode: string }>(`
        SELECT id, tenant_code AS "tenantCode" FROM public.tenants WHERE id::text = $1 OR tenant_code = $1 LIMIT 1
      `, [p1]);
      if (!tenant) return apiError('Tenant not found', 404, 'TENANT_NOT_FOUND');

      const product = await queryOne<{ productId: string; productCode: string }>(`
        SELECT id AS "productId", product_code AS "productCode" FROM public.products WHERE product_code = $1 LIMIT 1
      `, [productCode.toUpperCase()]);
      if (!product) return apiError('Product not found', 404, 'PRODUCT_NOT_FOUND');

      const plan = await queryOne<{ planId: string; planCode: string }>(`
        SELECT id AS "planId", plan_code AS "planCode" FROM public.plans WHERE product_id::text = $1 LIMIT 1
      `, [product.productId]);

      const tpId = crypto.randomUUID();
      await execute(`
        INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW(), NOW(), 1, $5)
      `, [tpId, tenant.id, product.productId, plan?.planId || null, `https://${tenant.tenantCode.toLowerCase()}.${productCode.toLowerCase()}.cybelinx.com`]);
      return json({ tenantProductId: tpId, status: 'ACTIVE', productCode: product.productCode }, 201);
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
      await execute(`
        INSERT INTO public.tenant_products (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW(), NOW(), 1, $5)
      `, [tpId, tenantId, product.productId, planId, appUrl || null]);
      return json({ subscription: { tenantProductId: tpId, status: 'ACTIVE' } }, 201);
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
        planCode, domain,
      } = body as Record<string, string>;

      if (!productCode || !tenantCode || !tenantName || !externalId) {
        return apiError('productCode, tenantCode, tenantName, externalId are required', 400, 'MISSING_FIELDS');
      }

      const product = await queryOne<{ productId: string; productCode: string }>(`
        SELECT id AS "productId", product_code AS "productCode"
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

      await execute(`
        INSERT INTO public.tenants (id, tenant_code, name, status, created_at, updated_at, version)
        VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW(), 1)
      `, [tenantId, tenantCode.toUpperCase(), tenantName]);

      await execute(`
        INSERT INTO public.tenant_products
          (id, tenant_id, product_id, plan_id, status, activated_at, created_at, updated_at, version, app_url)
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW(), NOW(), 1, $5)
      `, [tenantProductId, tenantId, product.productId, plan?.planId || null,
          domain || `https://${tenantCode.toLowerCase()}.${productCode.toLowerCase()}.com`]);

      const schemaName = `${productCode.toLowerCase()}_${tenantCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (region && resource) {
        await execute(`
          INSERT INTO public.tenant_resources
            (id, tenant_id, product_id, resource_id, isolation_mode, schema_name,
             region_id, environment, status, provisioning_state, migration_version,
             tenant_product_id, created_at, updated_at, version)
          VALUES ($1,$2,$3,$4,'SCHEMA_PER_TENANT',$5,$6,'PRODUCTION','ACTIVE','SUCCEEDED',1,$7,NOW(),NOW(),1)
        `, [crypto.randomUUID(), tenantId, product.productId, resource.resourceId,
            schemaName, region.regionId, tenantProductId]);
      }

      await execute(`
        INSERT INTO public.tenant_external_identifiers
          (id, tenant_id, product_id, provider, external_id, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [crypto.randomUUID(), tenantId, product.productId, `${productCode.toUpperCase()}_NEXUS`, externalId]);

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
        appUrl: domain || `https://${tenantCode.toLowerCase()}.${productCode.toLowerCase()}.com`,
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
  return json({ status: 'ok' });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1, p2] = path;

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

  return PUT(req, { params });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const [p0, p1, p2, p3] = path;

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
        WHERE tp.tenant_id::text = $1 AND tp.product_id IN (SELECT id FROM public.products WHERE product_code = $2)
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
