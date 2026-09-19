'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { Modal } from '@/components/modal';
import type { ProductRepositoryView, CreateProductRepositoryRequest } from '@/lib/types';

const PAGE_SIZE = 20;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  HEALTHCARE: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  RETAIL_COMMERCE: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  ENTERPRISE_OPERATIONS: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  DIAGNOSTIC_LABS: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
};

const DB_PROVIDER_BADGES: Record<string, { label: string; color: string }> = {
  AIVEN: { label: 'Aiven PG', color: '#dc2626' },
  NEON: { label: 'Neon Serverless', color: '#059669' },
  SUPABASE: { label: 'Supabase PG', color: '#16a34a' },
  AWS_RDS: { label: 'AWS RDS', color: '#ea580c' },
  POSTGRESQL: { label: 'PostgreSQL', color: '#0284c7' },
};

const HOSTING_BADGES: Record<string, { label: string; color: string }> = {
  VERCEL: { label: 'Vercel', color: '#000000' },
  AWS: { label: 'AWS Cloud', color: '#d97706' },
  RENDER: { label: 'Render', color: '#4f46e5' },
};

export default function ProductRepositoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRepositoryView | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsyncData(
    () => api.productRepository.list({ page, limit: PAGE_SIZE, search: search || undefined }),
    [page, search],
  );

  const rows: ProductRepositoryView[] = data?.data ?? [];
  const pages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  // Aggregate stats
  const totalDomains = rows.filter((r) => r.domain).length;
  const totalCustomers = rows.reduce((acc, r) => acc + (r.customerCount || 0), 0);
  const dbProvidersCount = new Set(rows.map((r) => r.databaseProvider).filter(Boolean)).size;

  async function handleDelete(product: ProductRepositoryView) {
    setActionError(null);
    try {
      await api.productRepository.delete(product.productId);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Product Repository</h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: '#dbeafe', color: '#1d4ed8' }}>
              SOURCE OF TRUTH
            </span>
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)', fontSize: '0.92rem' }}>
            Master topology & registry of all SaaS products — physical database clusters, multi-cloud hosting, domains, and tenant isolation models.
          </p>
        </div>
        <button
          type="button"
          id="btn-register-product"
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontWeight: 600, boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)' }}
          onClick={() => setCreateOpen(true)}
        >
          <span>+</span> Register New Product
        </button>
      </div>

      {actionError && <ErrorBanner error={actionError} />}
      {error && <ErrorBanner error={error} />}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Registered Products
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>{total}</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cloud Domains
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0284c7', marginTop: '0.2rem' }}>{totalDomains}</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            DB Cluster Types
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a', marginTop: '0.2rem' }}>{dbProvidersCount}</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tenant Subscriptions
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#7c3aed', marginTop: '0.2rem' }}>{totalCustomers}</div>
        </div>
      </div>

      {/* Main Table Card */}
      <section className="card" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            id="search-product-repo"
            className="input"
            style={{ flex: 1, minWidth: '260px' }}
            placeholder="Search by code, product name, domain, or database provider…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => reload()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            ↻ Refresh
          </button>
        </div>

        {loading && !data && <LoadingBlock />}
        {!loading && rows.length === 0 && (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Empty>No products registered yet. Click &quot;Register New Product&quot; to establish your product topology.</Empty>
          </div>
        )}

        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Product Identity</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Hosting & Domain</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Target Database</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Isolation Mode</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Tenants</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const catStyle = CATEGORY_COLORS[row.productCategory] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
                  const dbBadge = row.databaseProvider ? (DB_PROVIDER_BADGES[row.databaseProvider] || { label: row.databaseProvider, color: '#0284c7' }) : null;
                  const hostBadge = row.hostingProvider ? (HOSTING_BADGES[row.hostingProvider] || { label: row.hostingProvider, color: '#64748b' }) : null;

                  return (
                    <tr key={row.productId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <Link href={`/product-repository/${row.productId}`} style={{ textDecoration: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong className="mono" style={{ fontSize: '0.95rem', color: '#0f172a' }}>{row.productCode}</strong>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: catStyle.bg,
                                color: catStyle.text,
                                border: `1px solid ${catStyle.border}`,
                              }}
                            >
                              {row.productCategory.replace('_', ' ')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '2px' }}>{row.name}</div>
                        </Link>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          {row.domain ? (
                            <a
                              href={row.domain.startsWith('http') ? row.domain : `https://${row.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mono"
                              style={{ color: '#0284c7', fontWeight: 600, fontSize: '0.85rem' }}
                            >
                              {row.domain} ↗
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No domain set</span>
                          )}
                          {row.subdomainPattern && (
                            <div className="mono" style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              Pattern: {row.subdomainPattern}
                            </div>
                          )}
                          {hostBadge && (
                            <span style={{ display: 'inline-block', fontSize: '0.68rem', fontWeight: 600, color: hostBadge.color, marginTop: '3px' }}>
                              • {hostBadge.label}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          {dbBadge ? (
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: `${dbBadge.color}15`,
                                color: dbBadge.color,
                                border: `1px solid ${dbBadge.color}30`,
                              }}
                            >
                              {dbBadge.label}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Default DB</span>
                          )}
                          <div className="mono" style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.dbUrlProduction || row.databaseConnectionString || '—'}>
                            {row.dbUrlProduction || row.databaseConnectionString || '—'}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155' }}>
                          {row.defaultIsolationMode || 'SCHEMA_PER_TENANT'}
                        </span>
                        {row.schemaPrefix && (
                          <div className="mono" style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                            Prefix: {row.schemaPrefix}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: row.customerCount > 0 ? '#0284c7' : '#94a3b8' }}>
                          {row.customerCount} tenant(s)
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <Link href={`/product-repository/${row.productId}`} className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
                            Configure →
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#dc2626' }}
                            onClick={() => setDeleteTarget(row)}
                            title="Delete Product"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ padding: '0.9rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Showing Page {page} of {pages} ({total} total products)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                ← Prev
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={page >= pages}
                onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Registration Modal */}
      {createOpen && (
        <CreateProductModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            reload();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal title={`Delete ${deleteTarget.productCode}?`} onClose={() => setDeleteTarget(null)}>
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ color: '#dc2626', fontWeight: 600 }}>
              Warning: Deleting this product will remove its registered configuration and all associated subscriptions and customer mapping records.
            </p>
            <p style={{ color: '#475569', fontSize: '0.9rem' }}>
              Product: <strong>{deleteTarget.name} ({deleteTarget.productCode})</strong>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626' }}
                onClick={() => handleDelete(deleteTarget)}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreateProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [tab, setTab] = useState<'general' | 'hosting' | 'database' | 'isolation'>('general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [productCode, setProductCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productCategory, setProductCategory] = useState('ENTERPRISE_OPERATIONS');
  const [status, setStatus] = useState('ACTIVE');

  // Hosting & Domains
  const [hostingProvider, setHostingProvider] = useState('VERCEL');
  const [domain, setDomain] = useState('');
  const [subdomainPattern, setSubdomainPattern] = useState('');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [healthEndpoint, setHealthEndpoint] = useState('/api/v1/health');

  // Database Topology
  const [databaseProvider, setDatabaseProvider] = useState('AIVEN');
  const [dbUrlDevelopment, setDbUrlDevelopment] = useState('jdbc:postgresql://localhost:5432/cybelinx_platform');
  const [dbUrlStaging, setDbUrlStaging] = useState('');
  const [dbUrlProduction, setDbUrlProduction] = useState('');
  const [dbCredentialsReference, setDbCredentialsReference] = useState('');

  // Tenant Isolation
  const [defaultIsolationMode, setDefaultIsolationMode] = useState('SCHEMA_PER_TENANT');
  const [schemaPrefix, setSchemaPrefix] = useState('');
  const [ddlTemplatePath, setDdlTemplatePath] = useState('');
  const [configurationLocation, setConfigurationLocation] = useState('');

  // Auto-fill defaults when productCode changes
  const handleCodeChange = (raw: string) => {
    const code = raw.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    setProductCode(code);
    if (!domain && code) {
      setDomain(`https://${code.toLowerCase()}.com`);
    }
    if (!subdomainPattern && code) {
      setSubdomainPattern(`https://{tenant}.${code.toLowerCase()}.com`);
    }
    if (!schemaPrefix && code) {
      setSchemaPrefix(`${code.toLowerCase()}_`);
    }
    if (!ddlTemplatePath && code) {
      setDdlTemplatePath(`product-schemas/${code.toLowerCase()}_tenant_schema.sql`);
    }
    if (!dbCredentialsReference && code) {
      setDbCredentialsReference(`PRODUCT_DB_PASSWORD_${code}`);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productCode.trim() || !name.trim()) {
      setError('Product Code and Name are required.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload: CreateProductRepositoryRequest = {
      productCode: productCode.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || undefined,
      productCategory,
      status,
      hostingProvider: hostingProvider || undefined,
      domain: domain.trim() || undefined,
      subdomainPattern: subdomainPattern.trim() || undefined,
      deploymentUrl: deploymentUrl.trim() || undefined,
      healthEndpoint: healthEndpoint.trim() || undefined,
      databaseProvider: databaseProvider || undefined,
      dbUrlDevelopment: dbUrlDevelopment.trim() || undefined,
      dbUrlStaging: dbUrlStaging.trim() || undefined,
      dbUrlProduction: dbUrlProduction.trim() || undefined,
      dbCredentialsReference: dbCredentialsReference.trim() || undefined,
      defaultIsolationMode,
      schemaPrefix: schemaPrefix.trim() || undefined,
      ddlTemplatePath: ddlTemplatePath.trim() || undefined,
      configurationLocation: configurationLocation.trim() || undefined,
    };

    try {
      await api.productRepository.create(payload);
      onCreated();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Register New SaaS Product" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <ErrorBanner error={error} />}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ borderBottom: tab === 'general' ? '2px solid #0284c7' : 'none', borderRadius: 0, fontWeight: tab === 'general' ? 700 : 500, color: tab === 'general' ? '#0284c7' : '#64748b' }}
            onClick={() => setTab('general')}
          >
            1. Identity & Details
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ borderBottom: tab === 'hosting' ? '2px solid #0284c7' : 'none', borderRadius: 0, fontWeight: tab === 'hosting' ? 700 : 500, color: tab === 'hosting' ? '#0284c7' : '#64748b' }}
            onClick={() => setTab('hosting')}
          >
            2. Cloud & Domains
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ borderBottom: tab === 'database' ? '2px solid #0284c7' : 'none', borderRadius: 0, fontWeight: tab === 'database' ? 700 : 500, color: tab === 'database' ? '#0284c7' : '#64748b' }}
            onClick={() => setTab('database')}
          >
            3. Database Clusters
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ borderBottom: tab === 'isolation' ? '2px solid #0284c7' : 'none', borderRadius: 0, fontWeight: tab === 'isolation' ? 700 : 500, color: tab === 'isolation' ? '#0284c7' : '#64748b' }}
            onClick={() => setTab('isolation')}
          >
            4. Isolation & DDL
          </button>
        </div>

        {/* Tab 1: General Identity */}
        {tab === 'general' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="field">
              <label className="label" htmlFor="prod-code">Product Code *</label>
              <input
                id="prod-code"
                className="input mono"
                placeholder="e.g. JIOPLIX, STOREAI, LIMS"
                value={productCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                required
              />
              <span className="small muted">Uppercase alphanumeric unique platform identifier.</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="prod-name">Display Name *</label>
              <input
                id="prod-name"
                className="input"
                placeholder="e.g. Jioplix Hospital Management System"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="prod-desc">Description</label>
              <textarea
                id="prod-desc"
                className="input"
                rows={2}
                placeholder="Core SaaS product capabilities and industry category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="field">
                <label className="label" htmlFor="prod-category">Industry Category</label>
                <select
                  id="prod-category"
                  className="select"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                >
                  <option value="HEALTHCARE">Healthcare & Clinical EHR</option>
                  <option value="RETAIL_COMMERCE">Retail & E-Commerce</option>
                  <option value="ENTERPRISE_OPERATIONS">Enterprise Operations & HRM</option>
                  <option value="DIAGNOSTIC_LABS">Diagnostic Laboratories</option>
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="prod-status">Initial Status</label>
                <select
                  id="prod-status"
                  className="select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE (Ready for Tenant Subscriptions)</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cloud Hosting & Domains */}
        {tab === 'hosting' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="field">
                <label className="label" htmlFor="hosting-prov">Hosting Platform</label>
                <select
                  id="hosting-prov"
                  className="select"
                  value={hostingProvider}
                  onChange={(e) => setHostingProvider(e.target.value)}
                >
                  <option value="VERCEL">Vercel (Next.js / Edge)</option>
                  <option value="AWS">AWS (ECS / App Runner)</option>
                  <option value="RENDER">Render Web Service</option>
                  <option value="OTHER">Other Cloud Provider</option>
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="health-end">Health Check Endpoint</label>
                <input
                  id="health-end"
                  className="input mono"
                  placeholder="/api/v1/health"
                  value={healthEndpoint}
                  onChange={(e) => setHealthEndpoint(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="prod-domain">Primary Web Domain</label>
              <input
                id="prod-domain"
                className="input mono"
                placeholder="https://jioplix.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <span className="small muted">The main apex or marketing website domain for the product.</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="subdomain-pattern">Vanity Subdomain Routing Pattern</label>
              <input
                id="subdomain-pattern"
                className="input mono"
                placeholder="https://{tenant}.jioplix.com"
                value={subdomainPattern}
                onChange={(e) => setSubdomainPattern(e.target.value)}
              />
              <span className="small muted">Used by Edge Gateway & Vercel middleware to extract tenant code.</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="deploy-url">Deployment URL (Vercel Project)</label>
              <input
                id="deploy-url"
                className="input mono"
                placeholder="https://jioplix-hospital.vercel.app"
                value={deploymentUrl}
                onChange={(e) => setDeploymentUrl(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Database Clusters */}
        {tab === 'database' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="field">
                <label className="label" htmlFor="db-prov">Database Provider</label>
                <select
                  id="db-prov"
                  className="select"
                  value={databaseProvider}
                  onChange={(e) => setDatabaseProvider(e.target.value)}
                >
                  <option value="AIVEN">Aiven Cloud PostgreSQL</option>
                  <option value="NEON">Neon Serverless PostgreSQL</option>
                  <option value="SUPABASE">Supabase PostgreSQL</option>
                  <option value="AWS_RDS">AWS RDS PostgreSQL</option>
                  <option value="POSTGRESQL">Self-Hosted PostgreSQL</option>
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="cred-ref">Credentials / Secret Ref</label>
                <input
                  id="cred-ref"
                  className="input mono"
                  placeholder="e.g. PRODUCT_DB_PASSWORD_JIOPLIX"
                  value={dbCredentialsReference}
                  onChange={(e) => setDbCredentialsReference(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="prod-db-prod">Production Database JDBC URL *</label>
              <input
                id="prod-db-prod"
                className="input mono"
                placeholder="jdbc:postgresql://pg-jioplix-prod.aivencloud.com:19168/jioplix_prod?sslmode=require"
                value={dbUrlProduction}
                onChange={(e) => setDbUrlProduction(e.target.value)}
              />
              <span className="small muted">Target database where tenant schemas will be created in Production.</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="prod-db-dev">Development Database JDBC URL</label>
              <input
                id="prod-db-dev"
                className="input mono"
                placeholder="jdbc:postgresql://localhost:5432/cybelinx_platform"
                value={dbUrlDevelopment}
                onChange={(e) => setDbUrlDevelopment(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="prod-db-stage">Staging / Demo Database JDBC URL</label>
              <input
                id="prod-db-stage"
                className="input mono"
                placeholder="jdbc:postgresql://ep-demo.neon.tech:5432/demo_db"
                value={dbUrlStaging}
                onChange={(e) => setDbUrlStaging(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Tab 4: Isolation & DDL */}
        {tab === 'isolation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="field">
                <label className="label" htmlFor="iso-mode">Default Tenant Isolation</label>
                <select
                  id="iso-mode"
                  className="select"
                  value={defaultIsolationMode}
                  onChange={(e) => setDefaultIsolationMode(e.target.value)}
                >
                  <option value="SCHEMA_PER_TENANT">SCHEMA_PER_TENANT (Isolated Postgres Schema)</option>
                  <option value="SHARED_POOL">SHARED_POOL (Row-Level Security / Shared DB)</option>
                  <option value="DEDICATED_DATABASE">DEDICATED_DATABASE (Dedicated Physical DB)</option>
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="schema-pref">Schema Name Prefix</label>
                <input
                  id="schema-pref"
                  className="input mono"
                  placeholder="e.g. jioplix_ or tenant_"
                  value={schemaPrefix}
                  onChange={(e) => setSchemaPrefix(e.target.value)}
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="ddl-path">DDL Schema Baseline Template Path</label>
              <input
                id="ddl-path"
                className="input mono"
                placeholder="product-schemas/jioplix_tenant_schema.sql"
                value={ddlTemplatePath}
                onChange={(e) => setDdlTemplatePath(e.target.value)}
              />
              <span className="small muted">Template script executed by the Event Worker on tenant schema provisioning.</span>
            </div>

            <div className="field">
              <label className="label" htmlFor="cfg-loc">Source Code / Config Repository</label>
              <input
                id="cfg-loc"
                className="input"
                placeholder="e.g. github.com/cybelinx/jioplix-app"
                value={configurationLocation}
                onChange={(e) => setConfigurationLocation(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation & Submit Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <div>
            {tab !== 'general' && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  if (tab === 'isolation') setTab('database');
                  else if (tab === 'database') setTab('hosting');
                  else if (tab === 'hosting') setTab('general');
                }}
              >
                ← Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            {tab !== 'isolation' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (tab === 'general') setTab('hosting');
                  else if (tab === 'hosting') setTab('database');
                  else if (tab === 'database') setTab('isolation');
                }}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                id="btn-submit-register-product"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Registering...' : 'Register Product'}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}