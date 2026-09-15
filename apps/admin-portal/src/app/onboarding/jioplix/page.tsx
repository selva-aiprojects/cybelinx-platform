'use client';

import { useState } from 'react';
import { resolveApiBaseUrl, getStoredToken } from '@/lib/api';
import { Alert } from '@/components/ui';
import { StatusBadge } from '@/components/badges';

export default function JioplixOnboardingPage() {
  const [tab, setTab] = useState<'single' | 'batch' | 'signup' | 'lookup'>('single');

  // Single Hospital Onboarding State
  const [externalId, setExternalId] = useState('JIOPLIX_NEXUS');
  const [name, setName] = useState('Jioplix Healthcare Hospital');
  const [tenantCode, setTenantCode] = useState('JIOPLIX_APOLLO_01');
  const [domain, setDomain] = useState('https://jioplix.com');
  const [email, setEmail] = useState('admin@jioplix.com');
  const [adminUserId, setAdminUserId] = useState('seed-dev-admin-0001');
  const [planCode, setPlanCode] = useState('HEALTHCARE_TIER');
  const [regionCode, setRegionCode] = useState('ap-south-1');
  const [country, setCountry] = useState('IN');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Batch 7 Hospitals State
  const DEFAULT_BATCH_JSON = JSON.stringify({
    tenants: [
      { externalId: "NEXUS_HOSP_01", tenantCode: "JIOPLIX_HOSP_01", tenantName: "Apollo Hospital", planCode: "HEALTHCARE_TIER", schemaName: "jioplix_hosp1", domain: "https://hosp1.jioplix.com" },
      { externalId: "NEXUS_HOSP_02", tenantCode: "JIOPLIX_HOSP_02", tenantName: "Max Healthcare", planCode: "HEALTHCARE_TIER", schemaName: "jioplix_hosp2", domain: "https://hosp2.jioplix.com" },
      { externalId: "NEXUS_HOSP_03", tenantCode: "JIOPLIX_HOSP_03", tenantName: "Fortis Hospital", planCode: "HEALTHCARE_TIER", schemaName: "jioplix_hosp3", domain: "https://hosp3.jioplix.com" },
      { externalId: "NEXUS_HOSP_04", tenantCode: "JIOPLIX_HOSP_04", tenantName: "Manipal Hospital", planCode: "HEALTHCARE_TIER", schemaName: "jioplix_hosp4", domain: "https://hosp4.jioplix.com" },
      { externalId: "NEXUS_HOSP_05", tenantCode: "JIOPLIX_HOSP_05", tenantName: "Narayana Health", planCode: "HEALTHCARE_TIER", schemaName: "jioplix_hosp5", domain: "https://hosp5.jioplix.com" },
      { externalId: "NEXUS_HOSP_06", tenantCode: "JIOPLIX_HOSP_06", tenantName: "Medanta Hospital", planCode: "HEALTHCARE_TIER", schemaName: "jioplix_hosp6", domain: "https://hosp6.jioplix.com" },
      { externalId: "NEXUS_HOSP_07", tenantCode: "JIOPLIX_HOSP_07", tenantName: "Aster CMI Hospital", planCode: "HEALTHCARE_TIER", schemaName: "jioplix_hosp7", domain: "https://hosp7.jioplix.com" }
    ]
  }, null, 2);

  const [batchJson, setBatchJson] = useState(DEFAULT_BATCH_JSON);

  // New SaaS Signup State
  const [signupCode, setSignupCode] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPlan, setSignupPlan] = useState('HEALTHCARE_TIER');

  // Lookup State
  const [lookupId, setLookupId] = useState('JIOPLIX_NEXUS');

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
      const res = await fetch(`${resolveApiBaseUrl()}/onboarding/jioplix/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          externalId,
          name,
          tenantCode,
          domain,
          contactEmail: email,
          adminUserId,
          planCode,
          regionCode,
          country,
          timezone,
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

  async function submitSignup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const token = getStoredToken();
      const res = await fetch(`${resolveApiBaseUrl()}/onboarding/jioplix/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          hospitalCode: signupCode.toUpperCase(),
          hospitalName: signupName,
          adminEmail: signupEmail,
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
      const res = await fetch(`${resolveApiBaseUrl()}/onboarding/jioplix/tenants/${encodeURIComponent(lookupId.trim())}`, {
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
            <span>🏥</span> Jioplix Hospital Management System Onboarding
          </h1>
          <p>
            Formally onboard hospital customers from <a href="https://jioplix.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary)' }}>https://jioplix.com</a> into Cybelinx multi-tenant SaaS.
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
            Formal Customer Onboarding (`JIOPLIX_NEXUS`)
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
                <div className="hint">External ID in legacy Jioplix database (e.g. `JIOPLIX_NEXUS`).</div>
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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

              <div className="field">
                <label className="label" htmlFor="jioplix-plan">Subscription Plan</label>
                <input
                  id="jioplix-plan"
                  className="input mono"
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="label" htmlFor="jioplix-region">Region</label>
                <input
                  id="jioplix-region"
                  className="input mono"
                  value={regionCode}
                  onChange={(e) => setRegionCode(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="jioplix-country">Country</label>
                <input
                  id="jioplix-country"
                  className="input mono"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="jioplix-timezone">Timezone</label>
                <input
                  id="jioplix-timezone"
                  className="input"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
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
