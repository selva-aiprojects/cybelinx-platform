'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { GenericOnboardRequest, GenericOnboardStatusView, GenericBatchOnboardResponse } from '@/lib/types';
import { Alert } from '@/components/ui';
import { StatusBadge } from '@/components/badges';
import { useProvisioningPolling } from '@/hooks/useProvisioningPolling';

const PRODUCT_CODE = 'STOREAI';
const AVAILABLE_PLANS = ['STOREAI_ENTERPRISE', 'STOREAI_GROWTH', 'STOREAI_STARTER'];
const DEFAULT_PLAN = 'STOREAI_ENTERPRISE';

export default function StoreAiOnboardingPage() {
  const [tab, setTab] = useState<'single' | 'batch' | 'signup' | 'lookup'>('single');

  // Lookup State (declared first: referenced by host detection effect below)
  const [lookupId, setLookupId] = useState('STOREAI_NEXUS_RETAIL_01');

  // Single Merchant Onboarding State
  const [externalId, setExternalId] = useState('STOREAI_NEXUS_RETAIL_01');
  const [storeName, setStoreName] = useState('Nike Flagship Store');
  const [tenantCode, setTenantCode] = useState('STOREAI_NIKE_01');
  const [storeDomain, setStoreDomain] = useState('https://nike.storeai.com');
  const [merchantEmail, setMerchantEmail] = useState('merchant@nike.com');
  const adminUserId = 'seed-dev-admin-0001';
  const [planCode, setPlanCode] = useState(DEFAULT_PLAN);
  const [schemaName, setSchemaName] = useState('storeai_nike_01');

  // Prefill the form from the hostname (adidas/puma/nike demo subdomains). Runs once
  // on mount; window.location is unavailable during server/initial render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      if (host.includes('adidas')) {
        setTenantCode('STOREAI_ADIDAS_01');
        setStoreName('Adidas Sportswear Store');
        setExternalId('STOREAI_NEXUS_02');
        setStoreDomain('https://adidas.storeai.cybelinx.com');
        setMerchantEmail('merchant@adidas.com');
        setSchemaName('storeai_adidas_db');
        setLookupId('STOREAI_NEXUS_02');
      } else if (host.includes('puma')) {
        setTenantCode('STOREAI_PUMA_01');
        setStoreName('Puma Retail Store');
        setExternalId('STOREAI_NEXUS_03');
        setStoreDomain('https://puma.storeai.cybelinx.com');
        setMerchantEmail('merchant@puma.com');
        setSchemaName('storeai_puma_db');
        setLookupId('STOREAI_NEXUS_03');
      } else if (host.includes('nike')) {
        setTenantCode('STOREAI_NIKE_01');
        setStoreName('Nike Flagship Store');
        setExternalId('STOREAI_NEXUS_RETAIL_01');
        setStoreDomain('https://nike.storeai.cybelinx.com');
        setMerchantEmail('merchant@nike.com');
        setSchemaName('storeai_nike_01');
        setLookupId('STOREAI_NEXUS_RETAIL_01');
      }
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Batch Merchants State
  const [batchJson, setBatchJson] = useState('');

  // New Merchant Signup State
  const [signupCode, setSignupCode] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPlan, setSignupPlan] = useState(DEFAULT_PLAN);

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
      tenantName: storeName.trim(),
      planCode,
      domain: storeDomain.trim(),
      adminEmail: merchantEmail.trim(),
      adminUserId: adminUserId.trim(),
      isolationMode: 'SCHEMA_PER_TENANT',
      environment: 'PRODUCTION',
      schemaName: schemaName.trim() || undefined,
      customFields: {
        storeName: storeName.trim(),
        storeDomain: storeDomain.trim(),
        merchantEmail: merchantEmail.trim(),
        adminUserId: adminUserId.trim(),
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
      const stores: GenericOnboardRequest[] = Array.isArray(parsed.stores) ? parsed.stores.map((s: Record<string, string>) => ({
        productCode: PRODUCT_CODE,
        externalId: String(s.externalId || '').trim(),
        tenantCode: String(s.tenantCode || '').trim().toUpperCase(),
        tenantName: String(s.storeName || s.tenantName || '').trim(),
        planCode: s.planCode || DEFAULT_PLAN,
        domain: s.storeDomain || s.domain || undefined,
        adminEmail: s.merchantEmail || s.adminEmail || undefined,
        isolationMode: 'SCHEMA_PER_TENANT',
        environment: 'PRODUCTION',
        schemaName: s.schemaName || undefined,
      })) : [];

      if (stores.length === 0) throw new Error('Batch payload must contain a non-empty "stores" array.');
      const resp: GenericBatchOnboardResponse = await api.onboarding.batch(stores);
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
        externalId: `storeai_auto_${Date.now().toString(36)}`,
        tenantCode: code,
        tenantName: signupName.trim(),
        planCode: signupPlan,
        adminEmail: signupEmail.trim(),
        adminName: signupName.trim(),
        isolationMode: 'SCHEMA_PER_TENANT',
        environment: 'PRODUCTION',
        customFields: { storeName: signupName.trim(), merchantEmail: signupEmail.trim() },
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
            <span>🛍️</span> StoreAI Composable Commerce Onboarding
          </h1>
          <p>
            Onboard retail merchant accounts from <a href="https://cybelinx.com/products/cybecommerce" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>CybeCommerce / StoreAI</a> into Cybelinx multi-tenant SaaS using the generic onboarding engine.
          </p>
        </div>
      </div>

      <div className="flex" style={{ gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${tab === 'single' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('single'); setResult(null); setError(null); }}
        >
          Onboard Single Store
        </button>
        <button
          type="button"
          className={`btn ${tab === 'batch' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('batch'); setResult(null); setError(null); }}
        >
          Batch Onboard Stores
        </button>
        <button
          type="button"
          className={`btn ${tab === 'signup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('signup'); setResult(null); setError(null); }}
        >
          New Merchant Signup
        </button>
        <button
          type="button"
          className={`btn ${tab === 'lookup' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => { setTab('lookup'); setResult(null); setError(null); }}
        >
          Lookup Merchant Status
        </button>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {tab === 'single' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            Formal Retail Merchant Onboarding
          </h2>
          <p className="muted small">
            Registers external retail identifier mapping, creates platform tenant, provisions isolated database schema, attaches store subscription, and fires outbox events.
          </p>

          <form onSubmit={submitSingleOnboarding} className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="storeai-ext-id">Store External ID</label>
                <input
                  id="storeai-ext-id"
                  className="input mono"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="storeai-tenant-code">Tenant Code</label>
                <input
                  id="storeai-tenant-code"
                  className="input mono"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="storeai-name">Store / Merchant Name</label>
                <input
                  id="storeai-name"
                  className="input"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="storeai-domain">Store Domain</label>
                <input
                  id="storeai-domain"
                  className="input"
                  value={storeDomain}
                  onChange={(e) => setStoreDomain(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="storeai-email">Merchant Email</label>
                <input
                  id="storeai-email"
                  type="email"
                  className="input"
                  value={merchantEmail}
                  onChange={(e) => setMerchantEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="storeai-plan">Subscription Plan</label>
                <select
                  id="storeai-plan"
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

              <div className="field">
                <label className="label" htmlFor="storeai-schema">Target DB Schema</label>
                <input
                  id="storeai-schema"
                  className="input mono"
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Provisioning Retail Store…' : '🚀 Formally Onboard Retail Store'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'batch' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            Batch Onboard Retail Store Schemas
          </h2>
          <p className="muted small">
            Batch onboard multiple existing retail merchant schemas into Cybelinx multi-tenant SaaS in a single request.
          </p>

          <form onSubmit={submitBatch} className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="batch-json">Stores Payload (JSON)</label>
              <textarea
                id="batch-json"
                className="textarea mono small"
                rows={12}
                value={batchJson}
                onChange={(e) => setBatchJson(e.target.value)}
                placeholder='{ "stores": [ { "externalId": "STOREAI_NEXUS_01", "tenantCode": "STOREAI_NIKE_01", "storeName": "Nike Retail Flagship", "planCode": "STOREAI_ENTERPRISE" } ] }'
                required
              />
            </div>

            <div className="flex">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Batch Provisioning…' : '🚀 Batch Onboard All Retail Stores'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'signup' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            New StoreAI Merchant Self-Service Signup
          </h2>

          <form onSubmit={submitSignup} className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="signup-code">Merchant Code</label>
                <input
                  id="signup-code"
                  className="input mono"
                  value={signupCode}
                  onChange={(e) => setSignupCode(e.target.value.toUpperCase())}
                  placeholder="STORE_ZARA_01"
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="signup-name">Merchant Name</label>
                <input
                  id="signup-name"
                  className="input"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="Zara Apparel Online"
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="signup-email">Merchant Admin Email</label>
                <input
                  id="signup-email"
                  type="email"
                  className="input"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="admin@zara.com"
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
                {submitting ? 'Registering Merchant…' : '✨ Register & Provision New Merchant'}
              </button>
            </div>
          </form>
        </section>
      )}

      {tab === 'lookup' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            Query StoreAI Merchant Status by External ID
          </h2>

          <form onSubmit={queryLookup} className="flex" style={{ gap: '0.5rem', marginTop: '1rem' }}>
            <input
              className="input mono"
              style={{ flex: 1 }}
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="e.g. STOREAI_NEXUS_RETAIL_01"
              required
            />
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Searching…' : 'Query Merchant Status'}
            </button>
          </form>
        </section>
      )}

      {result && (
        <section className="card card-pad" style={{ background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>StoreAI Provisioning Record</h3>
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
                    <strong>{String(r.tenantName ?? r.storeName ?? r.tenantCode ?? 'Store')}</strong>
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