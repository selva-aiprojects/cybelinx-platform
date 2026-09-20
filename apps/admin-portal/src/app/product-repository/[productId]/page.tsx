'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { formatDate } from '@/components/badges';
import { Modal } from '@/components/modal';
import type {
  ProductRepositoryDetail,
  ProductRepositoryCustomerView,
  UpdateProductRepositoryRequest,
} from '@/lib/types';

const DB_PROVIDER_COLORS: Record<string, string> = {
  AIVEN: '#dc2626',
  NEON: '#059669',
  SUPABASE: '#16a34a',
  AWS_RDS: '#ea580c',
  POSTGRESQL: '#0284c7',
};

export default function ProductRepositoryDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data, error, loading, reload } = useAsyncData(
    () => api.productRepository.get(productId),
    [productId],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [customer, setCustomer] = useState<ProductRepositoryCustomerView | null>(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const repo = data as ProductRepositoryDetail | null;

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBanner error={error} />;
  if (!repo) return <Empty>Repository not found.</Empty>;

  const dbColor = repo.databaseProvider ? (DB_PROVIDER_COLORS[repo.databaseProvider] || '#0284c7') : '#0284c7';

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      {/* Breadcrumb Navigation */}
      <div className="breadcrumbs" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem' }}>
        <Link href="/product-repository" className="row-link" style={{ color: 'var(--muted)' }}>
          Product Repository
        </Link>
        <span className="sep" style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ fontWeight: 600, color: '#0f172a' }}>{repo.productCode}</span>
      </div>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
              {repo.name} ({repo.productCode})
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                background: repo.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                color: repo.status === 'ACTIVE' ? '#15803d' : '#64748b',
                border: `1px solid ${repo.status === 'ACTIVE' ? '#bbf7d0' : '#e2e8f0'}`,
              }}
            >
              {repo.status}
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>
            {repo.description || 'Master cloud deployment, domains, and database connection registry.'}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '0.55rem 1.25rem', fontWeight: 600 }}
          onClick={() => setEditOpen(true)}
        >
          ✎ Edit Topology & Settings
        </button>
      </div>

      {actionError && <ErrorBanner error={actionError} />}

      {/* Grid: 3 Main Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Cloud Hosting & Web Domains */}
        <section className="card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Cloud Hosting & Domains</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
              {repo.hostingProvider || 'VERCEL'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Primary Domain</div>
              <div style={{ marginTop: '3px' }}>
                {repo.domain ? (
                  <a href={repo.domain.startsWith('http') ? repo.domain : `https://${repo.domain}`} target="_blank" rel="noopener noreferrer" className="mono" style={{ color: '#0284c7', fontWeight: 600, fontSize: '0.9rem' }}>
                    {repo.domain} ↗
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>—</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Subdomain Routing Pattern</div>
              <div className="mono" style={{ marginTop: '3px', fontSize: '0.85rem', color: '#334155' }}>
                {repo.subdomainPattern || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Vercel Deployment URL</div>
              <div style={{ marginTop: '3px' }}>
                {repo.deploymentUrl ? (
                  <a href={repo.deploymentUrl.startsWith('http') ? repo.deploymentUrl : `https://${repo.deploymentUrl}`} target="_blank" rel="noopener noreferrer" className="mono" style={{ color: '#0284c7', fontSize: '0.85rem' }}>
                    {repo.deploymentUrl} ↗
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>—</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Health Check Endpoint</div>
              <div className="mono" style={{ marginTop: '3px', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                {repo.healthEndpoint || '/api/v1/health'}
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Database Clusters (Multi-Environment) */}
        <section className="card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Database Clusters</h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: `${dbColor}15`,
                color: dbColor,
                border: `1px solid ${dbColor}30`,
              }}
            >
              {repo.databaseProvider || 'Dedicated DB'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }}></span>
                Production DB Endpoint
              </div>
              <div style={{ marginTop: '3px' }}>
                <code className="mono" style={{ fontSize: '0.76rem', background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', display: 'block', wordBreak: 'break-all', border: '1px solid #fee2e2', color: '#991b1b' }}>
                  {repo.dbUrlProduction || repo.databaseConnectionString || '—'}
                </code>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Development DB Endpoint</div>
              <div style={{ marginTop: '3px' }}>
                <code className="mono" style={{ fontSize: '0.76rem', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', display: 'block', wordBreak: 'break-all', border: '1px solid #e2e8f0', color: '#475569' }}>
                  {repo.dbUrlDevelopment || '—'}
                </code>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Staging / Demo DB Endpoint</div>
              <div style={{ marginTop: '3px' }}>
                <code className="mono" style={{ fontSize: '0.76rem', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', display: 'block', wordBreak: 'break-all', border: '1px solid #e2e8f0', color: '#475569' }}>
                  {repo.dbUrlStaging || '—'}
                </code>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Secret / Vault Reference</div>
              <div className="mono" style={{ marginTop: '3px', fontSize: '0.82rem', color: '#64748b' }}>
                {repo.dbCredentialsReference || '—'}
              </div>
            </div>
          </div>
        </section>

        {/* Card 3: Tenant Isolation & Provisioning */}
        <section className="card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Isolation & Provisioning</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
              {repo.defaultIsolationMode || 'SCHEMA_PER_TENANT'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Tenant Schema Prefix</div>
              <div className="mono" style={{ marginTop: '3px', fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                {repo.schemaPrefix ? `${repo.schemaPrefix}<tenant_code>` : '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>DDL Schema Template</div>
              <div className="mono" style={{ marginTop: '3px', fontSize: '0.8rem', color: '#475569', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                {repo.ddlTemplatePath || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Repository / Source Code</div>
              <div style={{ marginTop: '3px', fontSize: '0.85rem', color: '#475569' }}>
                {repo.configurationLocation || '—'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>Last Updated</div>
              <div style={{ marginTop: '3px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                {formatDate(repo.updatedAt)}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Customer Tenants Section */}
      <section className="card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Customer Tenants & Schema Mappings</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
              Live tenants subscribed to this product and their isolated target database schemas.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1' }}>
            {repo.customers.length} Active Customer(s)
          </span>
        </div>

        {repo.customers.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <Empty>No customer tenants subscribed to this product yet.</Empty>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Tenant</th>
                  <th style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Target Database</th>
                  <th style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Provisioned Schema</th>
                  <th style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Contact</th>
                  <th style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {repo.customers.map((cust) => (
                  <tr key={cust.tenantId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/tenants/${cust.tenantId}`} style={{ textDecoration: 'none' }}>
                        <strong className="mono" style={{ color: '#0f172a' }}>{cust.tenantCode}</strong>
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>{cust.tenantName}</div>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {cust.databaseName || (repo.databaseProvider ? `${repo.databaseProvider} DB` : 'Dedicated Product DB')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <code className="mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0284c7', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>
                        {cust.tenantSchema || '—'}
                      </code>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>{cust.contactPerson || '—'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#0284c7' }}>{cust.contactEmail || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setCustomer(cust)}
                      >
                        Edit Mapping
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit Topology Modal */}
      {editOpen && (
        <EditRepositoryModal
          repo={repo}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            reload();
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {customer && (
        <CustomerEditModal
          productId={repo.productId}
          customer={customer}
          onClose={() => setCustomer(null)}
          onSaved={() => {
            setCustomer(null);
            reload();
          }}
          onSavingChange={setSavingCustomer}
          onError={setActionError}
          saving={savingCustomer}
        />
      )}
    </div>
  );
}

function EditRepositoryModal({
  repo,
  onClose,
  onSaved,
}: {
  repo: ProductRepositoryDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State initialized from repo
  const [name, setName] = useState(repo.name || '');
  const [description, setDescription] = useState(repo.description || '');
  const [productCategory, setProductCategory] = useState(repo.productCategory || 'ENTERPRISE_OPERATIONS');
  const [status, setStatus] = useState(repo.status || 'ACTIVE');

  const [hostingProvider, setHostingProvider] = useState(repo.hostingProvider || 'VERCEL');
  const [domain, setDomain] = useState(repo.domain || '');
  const [subdomainPattern, setSubdomainPattern] = useState(repo.subdomainPattern || '');
  const [deploymentUrl, setDeploymentUrl] = useState(repo.deploymentUrl || '');
  const [healthEndpoint, setHealthEndpoint] = useState(repo.healthEndpoint || '/api/v1/health');

  const [databaseProvider, setDatabaseProvider] = useState(repo.databaseProvider || 'SUPABASE');
  const [dbUrlProduction, setDbUrlProduction] = useState(repo.dbUrlProduction || repo.databaseConnectionString || '');
  const [dbUrlDevelopment, setDbUrlDevelopment] = useState(repo.dbUrlDevelopment || '');
  const [dbUrlStaging, setDbUrlStaging] = useState(repo.dbUrlStaging || '');
  const [dbCredentialsReference, setDbCredentialsReference] = useState(repo.dbCredentialsReference || '');

  const [defaultIsolationMode, setDefaultIsolationMode] = useState(repo.defaultIsolationMode || 'SCHEMA_PER_TENANT');
  const [schemaPrefix, setSchemaPrefix] = useState(repo.schemaPrefix || '');
  const [ddlTemplatePath, setDdlTemplatePath] = useState(repo.ddlTemplatePath || '');
  const [configurationLocation, setConfigurationLocation] = useState(repo.configurationLocation || '');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const isJioplix = repo.productCode === 'JIOPLIX' || repo.productCode === 'JIOPLIX_SMART';
    let cleanDomain = domain.trim() || null;
    let cleanSubdomainPattern = subdomainPattern.trim() || null;

    if (!isJioplix) {
      const prodLower = repo.productCode.toLowerCase();
      if (cleanDomain && (cleanDomain.endsWith(`.${prodLower}.com`) || cleanDomain === `https://${prodLower}.com` || cleanDomain === `http://${prodLower}.com`)) {
        cleanDomain = `https://${prodLower}.cybelinx.com`;
      }
      if (cleanSubdomainPattern && cleanSubdomainPattern.endsWith(`.${prodLower}.com`)) {
        cleanSubdomainPattern = `https://{tenant}.${prodLower}.cybelinx.com`;
      }
    }

    const payload: UpdateProductRepositoryRequest = {
      name: name.trim() || null,
      description: description.trim() || null,
      productCategory,
      status,
      hostingProvider: hostingProvider || null,
      domain: cleanDomain,
      subdomainPattern: cleanSubdomainPattern,
      deploymentUrl: deploymentUrl.trim() || null,
      healthEndpoint: healthEndpoint.trim() || null,
      databaseProvider: databaseProvider || null,
      dbUrlProduction: dbUrlProduction.trim() || null,
      dbUrlDevelopment: dbUrlDevelopment.trim() || null,
      dbUrlStaging: dbUrlStaging.trim() || null,
      dbCredentialsReference: dbCredentialsReference.trim() || null,
      defaultIsolationMode,
      schemaPrefix: schemaPrefix.trim() || null,
      ddlTemplatePath: ddlTemplatePath.trim() || null,
      configurationLocation: configurationLocation.trim() || null,
    };

    try {
      await api.productRepository.update(repo.productId, payload);
      onSaved();
    } catch (err: unknown) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit ${repo.productCode} Topology & Registry`} onClose={onClose}>
      <form onSubmit={submit}>
        {error && <ErrorBanner error={error} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '70vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {/* Section: General */}
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3rem' }}>
            1. Identity & Status
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="edit-name">Display Name</label>
              <input id="edit-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label className="label" htmlFor="edit-category">Category</label>
              <select id="edit-category" className="select" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                <option value="REGULATED_MARKETS">Healthcare & Regulated Markets</option>
                <option value="ENTERPRISE_OPERATIONS">Enterprise Operations & HRM</option>
                <option value="CORE_PAAS_AI">Core PaaS, Retail & AI</option>
                <option value="HEALTHCARE">Healthcare & Clinical EHR</option>
                <option value="RETAIL_COMMERCE">Retail & E-Commerce</option>
                <option value="DIAGNOSTIC_LABS">Diagnostic Laboratories</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="edit-desc">Description</label>
              <input id="edit-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="edit-status">Status</label>
              <select id="edit-status" className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="DEPRECATED">DEPRECATED</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>
          </div>

          {/* Section: Hosting & Domains */}
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3rem', marginTop: '0.5rem' }}>
            2. Cloud Hosting & Domains
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="edit-host">Hosting Provider</label>
              <select id="edit-host" className="select" value={hostingProvider} onChange={(e) => setHostingProvider(e.target.value)}>
                <option value="VERCEL">Vercel (Next.js / Edge)</option>
                <option value="AWS">AWS Cloud</option>
                <option value="RENDER">Render Web Service</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="edit-health">Health Endpoint</label>
              <input id="edit-health" className="input mono" value={healthEndpoint} onChange={(e) => setHealthEndpoint(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-domain">Primary Domain</label>
            <input id="edit-domain" className="input mono" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="https://jioplix.com" />
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-subdomain">Vanity Subdomain Pattern</label>
            <input id="edit-subdomain" className="input mono" value={subdomainPattern} onChange={(e) => setSubdomainPattern(e.target.value)} placeholder="https://{tenant}.jioplix.com" />
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-deploy">Deployment URL (Vercel Project)</label>
            <input id="edit-deploy" className="input mono" value={deploymentUrl} onChange={(e) => setDeploymentUrl(e.target.value)} placeholder="https://jioplix-app.vercel.app" />
          </div>

          {/* Section: Database Clusters */}
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3rem', marginTop: '0.5rem' }}>
            3. Multi-Environment Database Topology
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="edit-db-prov">Database Provider</label>
              <select id="edit-db-prov" className="select" value={databaseProvider} onChange={(e) => setDatabaseProvider(e.target.value)}>
                <option value="AIVEN">Aiven Cloud PostgreSQL</option>
                <option value="NEON">Neon Serverless PostgreSQL</option>
                <option value="SUPABASE">Supabase PostgreSQL</option>
                <option value="AWS_RDS">AWS RDS PostgreSQL</option>
                <option value="POSTGRESQL">Self-Hosted PostgreSQL</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="edit-cred">Credentials / Secret Ref</label>
              <input id="edit-cred" className="input mono" value={dbCredentialsReference} onChange={(e) => setDbCredentialsReference(e.target.value)} placeholder="PRODUCT_DB_PASSWORD_..." />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-prod-db">Production Database JDBC URL</label>
            <input id="edit-prod-db" className="input mono" value={dbUrlProduction} onChange={(e) => setDbUrlProduction(e.target.value)} placeholder="jdbc:postgresql://host:port/db?sslmode=require" />
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-dev-db">Development Database JDBC URL</label>
            <input id="edit-dev-db" className="input mono" value={dbUrlDevelopment} onChange={(e) => setDbUrlDevelopment(e.target.value)} placeholder="jdbc:postgresql://localhost:5432/..." />
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-stage-db">Staging / Demo Database JDBC URL</label>
            <input id="edit-stage-db" className="input mono" value={dbUrlStaging} onChange={(e) => setDbUrlStaging(e.target.value)} placeholder="jdbc:postgresql://host:port/demo" />
          </div>

          {/* Section: Isolation & DDL */}
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.3rem', marginTop: '0.5rem' }}>
            4. Isolation & Provisioning
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="edit-iso">Default Isolation Mode</label>
              <select id="edit-iso" className="select" value={defaultIsolationMode} onChange={(e) => setDefaultIsolationMode(e.target.value)}>
                <option value="SCHEMA_PER_TENANT">SCHEMA_PER_TENANT</option>
                <option value="SHARED_POOL">SHARED_POOL</option>
                <option value="DEDICATED_DATABASE">DEDICATED_DATABASE</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="edit-prefix">Schema Prefix</label>
              <input id="edit-prefix" className="input mono" value={schemaPrefix} onChange={(e) => setSchemaPrefix(e.target.value)} placeholder="e.g. jioplix_" />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-ddl">DDL Template Path</label>
            <input id="edit-ddl" className="input mono" value={ddlTemplatePath} onChange={(e) => setDdlTemplatePath(e.target.value)} placeholder="product-schemas/..." />
          </div>
          <div className="field">
            <label className="label" htmlFor="edit-config">Git / Config Location</label>
            <input id="edit-config" className="input" value={configurationLocation} onChange={(e) => setConfigurationLocation(e.target.value)} />
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving Changes…' : 'Save Topology'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CustomerEditModal({
  productId,
  customer,
  onClose,
  onSaved,
  onSavingChange,
  onError,
  saving,
}: {
  productId: string;
  customer: ProductRepositoryCustomerView;
  onClose: () => void;
  onSaved: () => void;
  onSavingChange: (saving: boolean) => void;
  onError: (message: string | null) => void;
  saving: boolean;
}) {
  const [tenantSchema, setTenantSchema] = useState(customer.tenantSchema ?? '');
  const [databaseName, setDatabaseName] = useState(customer.databaseName ?? '');
  const [contactPerson, setContactPerson] = useState(customer.contactPerson ?? '');
  const [contactEmail, setContactEmail] = useState(customer.contactEmail ?? '');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    onSavingChange(true);
    onError(null);
    try {
      await api.productRepository.updateCustomer(productId, customer.tenantId, {
        tenantSchema: tenantSchema.trim() || null,
        databaseName: databaseName.trim() || null,
        contactPerson: contactPerson.trim() || null,
        contactEmail: contactEmail.trim() || null,
      });
      onSaved();
    } catch (err: unknown) {
      onError(describeError(err));
    } finally {
      onSavingChange(false);
    }
  }

  return (
    <Modal title={`Edit Customer Tenant · ${customer.tenantCode}`} onClose={onClose}>
      <form onSubmit={submit} className="stack" style={{ gap: '1rem' }}>
        <div className="field">
          <label className="label" htmlFor="cust-schema">Tenant Schema</label>
          <input
            id="cust-schema"
            className="input mono"
            value={tenantSchema}
            onChange={(e) => setTenantSchema(e.target.value)}
            placeholder="tenant_acme_hospital"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="cust-db">Tenant Target Database</label>
          <input
            id="cust-db"
            className="input mono"
            value={databaseName}
            onChange={(e) => setDatabaseName(e.target.value)}
            placeholder="e.g. Supabase PostgreSQL (aws-1-ap-southeast-1) or Neon Cluster"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="cust-person">Contact Person</label>
          <input
            id="cust-person"
            className="input"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Primary administrator name"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="cust-email">Contact Email</label>
          <input
            id="cust-email"
            className="input"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="admin@hospital.org"
          />
        </div>
        <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Mapping'}
          </button>
        </div>
      </form>
    </Modal>
  );
}