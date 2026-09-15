'use client';

import { useState } from 'react';
import { resolveApiBaseUrl, getStoredToken } from '@/lib/api';
import { Alert } from '@/components/ui';
import { StatusBadge } from '@/components/badges';

export default function StoreAiOnboardingPage() {
  const [tab, setTab] = useState<'single' | 'batch' | 'signup' | 'lookup'>('single');

  // Single Merchant Onboarding State
  const [externalId, setExternalId] = useState('STOREAI_NEXUS_RETAIL_01');
  const [storeName, setStoreName] = useState('Nike Flagship Store');
  const [tenantCode, setTenantCode] = useState('STOREAI_NIKE_01');
  const [storeDomain, setStoreDomain] = useState('https://nike.storeai.com');
  const [merchantEmail, setMerchantEmail] = useState('merchant@nike.com');
  const [adminUserId, setAdminUserId] = useState('seed-dev-admin-0001');
  const [planCode, setPlanCode] = useState('STOREAI_ENTERPRISE');
  const [schemaName, setSchemaName] = useState('storeai_nike_01');

  // Batch Merchants State
  const DEFAULT_BATCH_JSON = JSON.stringify({
    stores: [
      { externalId: "STOREAI_NEXUS_01", tenantCode: "STOREAI_NIKE_01", storeName: "Nike Retail Flagship", planCode: "STOREAI_ENTERPRISE", schemaName: "storeai_nike_db", storeDomain: "https://nike.storeai.com" },
      { externalId: "STOREAI_NEXUS_02", tenantCode: "STOREAI_ADIDAS_01", storeName: "Adidas Sportswear Store", planCode: "STOREAI_ENTERPRISE", schemaName: "storeai_adidas_db", storeDomain: "https://adidas.storeai.com" },
      { externalId: "STOREAI_NEXUS_03", tenantCode: "STOREAI_PUMA_01", storeName: "Puma Omni-Channel Store", planCode: "STOREAI_ENTERPRISE", schemaName: "storeai_puma_db", storeDomain: "https://puma.storeai.com" }
    ]
  }, null, 2);

  const [batchJson, setBatchJson] = useState(DEFAULT_BATCH_JSON);

  // New Merchant Signup State
  const [signupCode, setSignupCode] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPlan, setSignupPlan] = useState('STOREAI_ENTERPRISE');

  // Lookup State
  const [lookupId, setLookupId] = useState('STOREAI_NEXUS_RETAIL_01');

  // Response & Status State
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitSingleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const token = getStoredToken();
      const res = await fetch(`${resolveApiBaseUrl()}/onboarding/storeai/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          externalId,
          storeName,
          tenantCode,
          storeDomain,
          merchantEmail,
          adminUserId,
          planCode,
          schemaName,
          isolationMode: 'SCHEMA_PER_TENANT',
          environment: 'PRODUCTION',
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || `Status ${res.status}`);
      setResult(body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitBatchOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(batchJson);
      const token = getStoredToken();
      const res = await fetch(`${resolveApiBaseUrl()}/onboarding/storeai/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(parsed),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || `Status ${res.status}`);
      setResult(body);
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
      const token = getStoredToken();
      const res = await fetch(`${resolveApiBaseUrl()}/onboarding/storeai/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          merchantCode: signupCode.toUpperCase(),
          merchantName: signupName,
          merchantEmail: signupEmail,
          planCode: signupPlan,
          regionCode: 'ap-south-1',
          country: 'IN',
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || `Status ${res.status}`);
      setResult(body);
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
      const token = getStoredToken();
      const res = await fetch(`${resolveApiBaseUrl()}/onboarding/storeai/tenants/${encodeURIComponent(lookupId.trim())}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || `Status ${res.status}`);
      setResult(body);
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
            Formally onboard retail merchant accounts from <a href="https://cybelinx.com/products/cybecommerce" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>CybeCommerce / StoreAI</a> into Cybelinx multi-tenant SaaS.
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
            Formal Retail Merchant Onboarding (`STOREAI_NEXUS`)
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
                <input
                  id="storeai-plan"
                  className="input mono"
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  required
                />
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

          <form onSubmit={submitBatchOnboarding} className="stack" style={{ gap: '1rem', marginTop: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="batch-json">Stores Payload (JSON)</label>
              <textarea
                id="batch-json"
                className="textarea mono small"
                rows={12}
                value={batchJson}
                onChange={(e) => setBatchJson(e.target.value)}
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
                <input
                  id="signup-plan"
                  className="input mono"
                  value={signupPlan}
                  onChange={(e) => setSignupPlan(e.target.value)}
                />
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
            <StatusBadge value="ACTIVE" />
          </div>
          <pre
            className="mono small"
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: '1rem',
              borderRadius: '8px',
              overflowX: 'auto',
              marginTop: '1rem',
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
