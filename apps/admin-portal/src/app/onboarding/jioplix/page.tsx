'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { GenericOnboardRequest, GenericOnboardStatusView, GenericBatchOnboardResponse } from '@/lib/types';
import { Alert } from '@/components/ui';
import { StatusBadge } from '@/components/badges';
import { useProvisioningPolling } from '@/hooks/useProvisioningPolling';

const PRODUCT_CODE = 'JIOPLIX';
const AVAILABLE_PLANS = ['JIOPLIX_ENTERPRISE', 'HEALTHCARE_TIER', 'CLINIC_STARTER'];
const DEFAULT_PLAN = 'JIOPLIX_ENTERPRISE';

export default function JioplixOnboardingPage() {
  const [tab, setTab] = useState<'single' | 'batch' | 'signup' | 'lookup'>('single');

  // Single Hospital Onboarding State
  const [externalId, setExternalId] = useState('JIOPLIX_NEXUS');
  const [tenantName, setTenantName] = useState('Jioplix Healthcare Hospital');
  const [tenantCode, setTenantCode] = useState('JIOPLIX_APOLLO_01');
  const [domain, setDomain] = useState('https://jioplix.com');
  const [adminEmail, setAdminEmail] = useState('admin@jioplix.com');
  const [adminName, setAdminName] = useState('');
  const [adminUserId, setAdminUserId] = useState('seed-dev-admin-0001');
  const [planCode, setPlanCode] = useState(DEFAULT_PLAN);
  const [schemaName, setSchemaName] = useState('jioplix_apollo_01');

  // Batch Hospitals State
  const [batchJson, setBatchJson] = useState('');

  // New SaaS Signup State
  const [signupCode, setSignupCode] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPlan, setSignupPlan] = useState(DEFAULT_PLAN);

  // Lookup State
  const [lookupId, setLookupId] = useState('JIOPLIX_NEXUS');

  // Response & Status State
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const provisioningActive =
    (result?.status as string) === 'SUCCESS' &&
    !['SUCCEEDED', 'ACTIVE', 'FAILED', 'DEACTIVATED', 'DELETED', 'PROVISIONED'].includes(
      String(result?.resourceStatus || '').toUpperCase(),
    );
  const { status: polledStatus, pollError: pollStatusError, active: polling } = useProvisioningPolling(
    provisioningActive,
    PRODUCT_CODE,
    result?.externalId as string | undefined,
  );

  function buildSinglePayload(overrides: Partial<GenericOnboardRequest> = {}): GenericOnboardRequest {
    return {
      productCode: PRODUCT_CODE,
      externalId: externalId.trim(),
      tenantCode: tenantCode.trim().toUpperCase(),
      tenantName: tenantName.trim(),
      planCode,
      domain: domain.trim(),
      adminEmail: adminEmail.trim(),
      adminName: adminName.trim() || undefined,
      adminUserId: adminUserId.trim(),
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'PRODUCTION',
      schemaName: schemaName.trim() || undefined,
      customFields: {
        hospitalName: tenantName.trim(),
        domain: domain.trim(),
        contactEmail: adminEmail.trim(),
      },
      ...overrides,
    };
  }

  async function submitSingleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const resp = await api.onboarding.execute(buildSinglePayload());
      setResult(resp as unknown as Record<string, unknown>);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBatch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(batchJson);
      const tenants: GenericOnboardRequest[] = Array.isArray(parsed.tenants) ? parsed.tenants.map((t: Record<string, string>) => ({
        productCode: PRODUCT_CODE,
        externalId: String(t.externalId || '').trim(),
        tenantCode: String(t.tenantCode || '').trim().toUpperCase(),
        tenantName: String(t.tenantName || t.name || '').trim(),
        planCode: t.planCode || DEFAULT_PLAN,
        domain: t.domain || undefined,
        adminEmail: t.adminEmail || t.contactEmail || undefined,
        isolationMode: 'SCHEMA_PER_TENANT',
        environment: 'PRODUCTION',
        schemaName: t.schemaName || undefined,
      })) : [];

      if (tenants.length === 0) throw new Error('Batch payload must contain a non-empty "tenants" array.');
      const resp: GenericBatchOnboardResponse = await api.onboarding.batch(tenants);
      setResult(resp as unknown as Record<string, unknown>);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const code = signupCode.trim().toUpperCase();
      const resp = await api.onboarding.execute({
        productCode: PRODUCT_CODE,
        externalId: `jio_auto_${Date.now().toString(36)}`,
        tenantCode: code,
        tenantName: signupName.trim(),
        planCode: signupPlan,
        adminEmail: signupEmail.trim(),
        adminName: signupName.trim(),
        isolationMode: 'SCHEMA_PER_TENANT',
        environment: 'PRODUCTION',
        customFields: { hospitalName: signupName.trim(), contactEmail: signupEmail.trim() },
      });
      setResult(resp as unknown as Record<string, unknown>);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function queryLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!lookupId.trim()) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const resp: GenericOnboardStatusView = await api.onboarding.getStatus(PRODUCT_CODE, lookupId.trim());
      setResult(resp as unknown as Record<string, unknown>);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🏥</span> Jioplix Hospital Management System Onboarding
          </h1>
          <p>
            Onboard hospital customers from <a href="https://jioplix.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>https://jioplix.com</a> into Cybelinx multi-tenant SaaS using the generic onboarding engine.
          </p>
        </div>
      </div>

      <div className="flex" style={{ gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${tab === 'single' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('single'); setResult(null); setError(null); }}
        >
          Onboard Existing Customer
        </button>
        <button
          type="button"
          className={`btn ${tab === 'batch' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('batch'); setResult(null); setError(null); }}
        >
          Batch Onboard Hospitals
        </button>
        <button
          type="button"
          className={`btn ${tab === 'signup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('signup'); setResult(null); setError(null); }}
        >
          New SaaS Hospital Signup
        </button>
        <button
          type="button"
          className={`btn ${tab === 'lookup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('lookup'); setResult(null); setError(null); }}
        >
          Lookup Tenant Status
        </button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {tab === 'single' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            Formal Customer Onboarding
          </h2>
          <p className="muted small">
            Registers external identifier mapping, creates platform tenant, provisions isolated database schema, attaches healthcare subscription, and fires outbox events.
          </p>

          <form onSubmit={submitSingleOnboarding} className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="jioplix-ext-id">Hospital External ID</label>
                <input
                  id="jioplix-ext-id"
                  className="input mono"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  required
                />
                <div className="hint">External ID in legacy Jioplix database (e.g. JIOPLIX_NEXUS).</div>
              </div>

              <div className="field">
                <label className="label" htmlFor="jioplix-tenant-code">Tenant Code</label>
                <input
                  id="jioplix-tenant-code"
                  className="input mono"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="jioplix-name">Hospital Name</label>
                <input
                  id="jioplix-name"
                  className="input"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="jioplix-domain">Hospital Domain</label>
                <input
                  id="jioplix-domain"
                  className="input"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="jioplix-email">Contact Email</label>
                <input
                  id="jioplix-email"
                  type="email"
                  className="input"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="jioplix-admin-name">Admin Name</label>
                <input
                  id="jioplix-admin-name"
                  className="input"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Hospital Director"
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="jioplix-plan">Subscription Plan</label>
                <select
                  id="jioplix-plan"
                  className="input"
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  required
                >
                  {AVAILABLE_PLANS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="jioplix-schema">Target DB Schema</label>
                <input
                  id="jioplix-schema"
                  className="input mono"
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                  placeholder="jioplix_<tenant_code>"
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="jioplix-admin-id">Admin User ID</label>
                <input
                  id="jioplix-admin-id"
                  className="input mono"
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Provisioning Hospital Tenant…' : '🚀 Formally Onboard Hospital Tenant'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'batch' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            Batch Onboard Hospital Tenants
          </h2>
          <p className="muted small">
            Batch onboard multiple existing hospital schemas into Cybelinx multi-tenant SaaS in a single request.
          </p>

          <form onSubmit={submitBatch} className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="batch-json">Hospitals Payload (JSON)</label>
              <textarea
                id="batch-json"
                className="textarea mono small"
                rows={12}
                value={batchJson}
                onChange={(e) => setBatchJson(e.target.value)}
                placeholder='{ "tenants": [ { "externalId": "NEXUS_HOSP_01", "tenantCode": "JIOPLIX_HOSP_01", "tenantName": "Apollo Hospital", "planCode": "JIOPLIX_ENTERPRISE" } ] }'
                required
              />
            </div>

            <div className="flex">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Batch Provisioning…' : '🚀 Batch Onboard All Hospitals'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'signup' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            New SaaS Hospital Self-Service Signup
          </h2>

          <form onSubmit={submitSignup} className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="signup-code">Hospital Code</label>
                <input
                  id="signup-code"
                  className="input mono"
                  value={signupCode}
                  onChange={(e) => setSignupCode(e.target.value.toUpperCase())}
                  placeholder="CITY_MED"
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="signup-name">Hospital Name</label>
                <input
                  id="signup-name"
                  className="input"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="City Medicare Center"
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="signup-email">Admin Email</label>
                <input
                  id="signup-email"
                  type="email"
                  className="input"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="admin@citymedicare.com"
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="signup-plan">Plan Code</label>
                <select
                  id="signup-plan"
                  className="input"
                  value={signupPlan}
                  onChange={(e) => setSignupPlan(e.target.value)}
                  required
                >
                  {AVAILABLE_PLANS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Registering…' : '✨ Register & Provision New SaaS Hospital'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'lookup' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            Query Hospital Tenant Status by External ID
          </h2>

          <form onSubmit={queryLookup} className="flex" style={{ gap: '0.5rem', marginTop: '1rem' }}>
            <input
              className="input mono"
              style={{ flex: 1 }}
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="e.g. JIOPLIX_NEXUS or JIOPLIX_APOLLO_01"
              required
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Searching…' : 'Query Status'}
            </button>
          </form>
        </section>
      )}

      {result && (
        <section className="card card-pad" style={{ background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Onboarding Status & Provisioning Record</h3>
            <StatusBadge value={String(result.status ?? result.tenantStatus ?? (result.succeeded !== undefined ? (Number(result.succeeded) > 0 ? 'ACTIVE' : 'FAILED') : 'ACTIVE'))} />
          </div>
          {provisioningActive && (
            <div className="flex" style={{ gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
              <span className="badge badge-info">
                {polling ? '⏳ Provisioning in progress — polling status…' : 'Provisioning check finished'}
                {polledStatus?.resourceStatus ? ` (resource: ${polledStatus.resourceStatus})` : ''}
              </span>
              {pollStatusError && <span className="small" style={{ color: '#b91c1c' }}>{pollStatusError}</span>}
            </div>
          )}
          {result.succeeded !== undefined ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <div className="flex" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                <span><strong>Total:</strong> <code>{String(result.totalProcessed)}</code></span>
                <span><strong>Succeeded:</strong> <code>{String(result.succeeded)}</code></span>
                <span><strong>Failed:</strong> <code>{String(result.failed)}</code></span>
              </div>
              {Array.isArray(result.results) && (result.results as Record<string, unknown>[]).map((r, i) => (
                <div key={i} className="card card-pad" style={{ background: '#fff' }}>
                  <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{String(r.tenantName ?? r.tenantCode ?? 'Tenant')}</strong>
                    <StatusBadge value={String(r.status ?? r.tenantStatus ?? 'ACTIVE')} />
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <span><strong>Tenant ID:</strong> <code>{String(r.tenantId ?? '—')}</code></span>
                    <span><strong>Tenant Code:</strong> <code>{String(r.tenantCode ?? '—')}</code></span>
                    <span><strong>External ID:</strong> <code>{String(r.externalId ?? '—')}</code></span>
                    <span><strong>Schema:</strong> <code>{String(r.schemaName ?? '—')}</code></span>
                    <span><strong>Plan:</strong> <code>{String(r.planCode ?? '—')}</code></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <span><strong>Tenant ID:</strong> <code>{String(result.tenantId ?? '—')}</code></span>
              <span><strong>Tenant Code:</strong> <code>{String(result.tenantCode ?? '—')}</code></span>
              <span><strong>External ID:</strong> <code>{String(result.externalId ?? '—')}</code></span>
              <span><strong>Schema:</strong> <code>{String(result.schemaName ?? '—')}</code></span>
              <span><strong>Plan:</strong> <code>{String(result.planCode ?? '—')}</code></span>
              <span><strong>Provider:</strong> <code>{String(result.provider ?? result.providerCode ?? '—')}</code></span>
              <span><strong>Message:</strong> <span>{String(result.message ?? '—')}</span></span>
              <span><strong>Timestamp:</strong> <span>{String(result.timestamp ?? '—')}</span></span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}