'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { StatusBadge, formatDate } from '@/components/badges';
import { Modal } from '@/components/modal';
import type {
  ProductRepositoryDetail,
  ProductRepositoryCustomerView,
  SubscriptionMasterView,
} from '@/lib/types';

export default function ProductRepositoryDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { data, error, loading, reload } = useAsyncData(
    () => api.productRepository.get(productId),
    [productId],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [customer, setCustomer] = useState<ProductRepositoryCustomerView | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const repo = data as ProductRepositoryDetail | null;

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorBanner error={error} />;
  if (!repo) return <Empty>Repository not found.</Empty>;

  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link href="/product-repository" className="row-link">Product Repository</Link>
        <span className="sep">/</span>
        <span>{repo.productCode}</span>
      </div>

      <div className="page-header">
        <div>
          <h1>{repo.productCode} Repository</h1>
          <p>Deployment & configuration registry for this product, its customer tenants, and subscriptions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditOpen(true)}>
          Edit Repository
        </button>
      </div>

      {actionError && <ErrorBanner error={actionError} />}

      <section className="card card-pad">
        <div className="card-title" style={{ fontWeight: 600 }}>
          Deployment Configuration
        </div>
        <div className="grid2" style={{ marginTop: '1rem' }}>
          <div className="kv">
            <div className="k">Domain</div>
            <div className="v">
              {repo.domain ? (
                <a href={repo.domain} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none' }}>
                  {repo.domain} ↗
                </a>
              ) : (
                '—'
              )}
            </div>
          </div>
          <div className="kv">
            <div className="k">Database Location</div>
            <div className="v">{repo.databaseLocation ?? '—'}</div>
          </div>
          <div className="kv" style={{ gridColumn: '1 / -1' }}>
            <div className="k">Database Connection String</div>
            <div className="v">
              <code className="mono">{repo.databaseConnectionString ?? '—'}</code>
            </div>
          </div>
          <div className="kv" style={{ gridColumn: '1 / -1' }}>
            <div className="k">Application Configuration Location</div>
            <div className="v">{repo.configurationLocation ?? '—'}</div>
          </div>
          <div className="kv">
            <div className="k">Last Updated</div>
            <div className="v muted">{formatDate(repo.updatedAt)}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ margin: 0 }}>
            Customer Tenants
          </h2>
          <span className="badge badge-info">
            {repo.customers.length} customer(s)
          </span>
        </div>
        {repo.customers.length === 0 ? (
          <Empty>No customer tenants for this product yet.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Tenant Database</th>
                  <th>Tenant Schema</th>
                  <th>Contact Person</th>
                  <th>Contact Email</th>
                  <th className="cell-actions">Edit</th>
                </tr>
              </thead>
              <tbody>
                {repo.customers.map((cust) => (
                  <tr key={cust.tenantId}>
                    <td>
                      <Link href={`/tenants/${cust.tenantId}`} className="row-link">
                        <strong className="mono">{cust.tenantCode}</strong>
                        <div className="faint small">{cust.tenantName}</div>
                      </Link>
                    </td>
                    <td className="mono small">{cust.databaseName ?? '—'}</td>
                    <td className="mono small">{cust.tenantSchema ?? '—'}</td>
                    <td className="small">{cust.contactPerson ?? '—'}</td>
                    <td className="small" style={{ color: '#38bdf8' }}>
                      {cust.contactEmail ?? '—'}
                    </td>
                    <td className="cell-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setCustomer(cust)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ margin: 0 }}>
            Subscriptions (from Subscription Master)
          </h2>
          <Link href="/subscriptions" className="btn btn-ghost btn-sm">
            Open Subscription Master →
          </Link>
        </div>
        {repo.subscriptions.length === 0 ? (
          <Empty>No subscriptions for this product in the Subscription Master.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Plan</th>
                  <th>App Launch URL</th>
                  <th>Status</th>
                  <th>Activated</th>
                </tr>
              </thead>
              <tbody>
                {repo.subscriptions.map((sub: SubscriptionMasterView) => (
                  <tr key={sub.tenantProductId}>
                    <td>
                      <Link href={`/tenants/${sub.tenantId}`} className="row-link">
                        <strong className="mono">{sub.tenant.tenantCode}</strong>
                        <div className="faint small">{sub.tenant.name}</div>
                      </Link>
                    </td>
                    <td className="mono muted">{sub.planCode ?? '—'}</td>
                    <td>
                      {sub.appUrl ? (
                        <a
                          href={sub.appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono"
                          style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}
                        >
                          {sub.appUrl} ↗
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td><StatusBadge value={sub.status} /></td>
                    <td className="muted small">{formatDate(sub.activatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editOpen && (
        <RepositoryEditModal
          repo={repo}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            reload();
          }}
        />
      )}

      {customer && (
        <CustomerEditModal
          productId={repo.productId}
          customer={customer}
          onClose={() => setCustomer(null)}
          onSaved={() => {
            setCustomer(null);
            reload();
          }}
          onSavingChange={setSaving}
          onError={setActionError}
          saving={saving}
        />
      )}
    </div>
  );
}

function RepositoryEditModal({
  repo,
  onClose,
  onSaved,
}: {
  repo: ProductRepositoryDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [domain, setDomain] = useState(repo.domain ?? '');
  const [databaseLocation, setDatabaseLocation] = useState(repo.databaseLocation ?? '');
  const [connectionString, setConnectionString] = useState(repo.databaseConnectionString ?? '');
  const [configurationLocation, setConfigurationLocation] = useState(repo.configurationLocation ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.productRepository.update(repo.productId, {
        domain: domain.trim() || null,
        databaseLocation: databaseLocation.trim() || null,
        databaseConnectionString: connectionString.trim() || null,
        configurationLocation: configurationLocation.trim() || null,
      });
      onSaved();
    } catch (err: unknown) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit ${repo.productCode} Repository`} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <div className="field">
          <label className="label" htmlFor="repo-domain">Domain</label>
          <input
            id="repo-domain"
            className="input mono"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="https://product.example.com"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="repo-db">Database Location</label>
          <input
            id="repo-db"
            className="input"
            value={databaseLocation}
            onChange={(e) => setDatabaseLocation(e.target.value)}
            placeholder="Aiven PostgreSQL · eu-west-1"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="repo-conn">Database Connection String</label>
          <input
            id="repo-conn"
            className="input mono"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            placeholder="postgresql://user:•••@host:port/db?sslmode=require"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="repo-config">Application Configuration Location</label>
          <input
            id="repo-config"
            className="input"
            value={configurationLocation}
            onChange={(e) => setConfigurationLocation(e.target.value)}
            placeholder="Koyeb service: central-api · env: DATABASE_URL → …"
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Repository'}
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
    <Modal title={`Edit Customer · ${customer.tenantCode}`} onClose={onClose}>
      <form onSubmit={submit} className="stack">
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
          <label className="label" htmlFor="cust-db">Tenant Database</label>
          <input
            id="cust-db"
            className="input mono"
            value={databaseName}
            onChange={(e) => setDatabaseName(e.target.value)}
            placeholder="cybelinx_platform"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="cust-person">Contact Person</label>
          <input
            id="cust-person"
            className="input"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="Primary contact name"
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
            placeholder="admin@example.com"
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}