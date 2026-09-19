'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { SubscriptionMasterView } from '@/lib/types';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { StatusBadge, formatDate } from '@/components/badges';
import { Modal } from '@/components/modal';

export default function SubscriptionsPage() {
  const { data, error, loading, reload } = useAsyncData(
    () => api.subscriptionMaster.list(),
    [],
  );
  const tenants = useAsyncData(() => api.tenants.list({ limit: 200 }), []);
  const products = useAsyncData(() => api.products.list({ limit: 200 }), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const activeCount = useMemo(() => rows.filter((row) => row.status === 'ACTIVE').length, [rows]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Subscription Master</h1>
          <p>Authoritative registry of tenant/product subscriptions. The Product Repository derives its subscriptions from here.</p>
        </div>
        <div className="flex">
          <div className="stat" style={{ minWidth: 130 }}>
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat" style={{ minWidth: 130 }}>
            <div className="stat-value">{rows.length}</div>
            <div className="stat-label">Total</div>
          </div>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            + New Subscription
          </button>
        </div>
      </div>

      {(error || actionError) && <ErrorBanner error={error || actionError || ''} />}
      {loading && !data && <LoadingBlock />}

      <section className="card">
        {!loading && rows.length === 0 && (
          <Empty>No subscriptions yet. Create one from the Subscription Master.</Empty>
        )}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Product</th>
                  <th>App Launch URL</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Activated</th>
                  <th className="cell-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: SubscriptionMasterView) => (
                  <tr key={row.tenantProductId}>
                    <td>
                      <Link href={`/tenants/${row.tenantId}`} className="row-link">
                        <strong className="mono">{row.tenant.tenantCode}</strong>
                        <div className="faint small">{row.tenant.name}</div>
                      </Link>
                    </td>
                    <td className="mono" style={{ fontWeight: 600, color: '#0284c7' }}>
                      {row.productCode}
                    </td>
                    <td>
                      {row.appUrl ? (
                        <a
                          href={row.appUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#0284c7', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          {row.appUrl} ↗
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="mono muted">{row.planCode ?? '—'}</td>
                    <td>
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="muted small">{formatDate(row.activatedAt)}</td>
                    <td className="cell-actions">
                      {row.status !== 'SUSPENDED' ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => changeStatus(reload, setActionError, row.tenantProductId, 'SUSPENDED')}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => changeStatus(reload, setActionError, row.tenantProductId, 'ACTIVE')}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => detach(reload, setActionError, row.tenantProductId)}
                      >
                        Detach
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {createOpen && (
        <CreateSubscriptionModal
          tenants={tenants.data?.data ?? []}
          products={products.data?.data ?? []}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            reload();
          }}
          onError={setActionError}
        />
      )}
    </div>
  );
}

async function changeStatus(
  reload: () => void,
  setError: (m: string | null) => void,
  tenantProductId: string,
  status: 'ACTIVE' | 'SUSPENDED',
) {
  setError(null);
  try {
    await api.subscriptionMaster.setStatus(tenantProductId, status);
    reload();
  } catch (err: unknown) {
    setError(describeError(err));
  }
}

async function detach(
  reload: () => void,
  setError: (m: string | null) => void,
  tenantProductId: string,
) {
  setError(null);
  try {
    await api.subscriptionMaster.detach(tenantProductId);
    reload();
  } catch (err: unknown) {
    setError(describeError(err));
  }
}

function CreateSubscriptionModal({
  tenants,
  products,
  onClose,
  onSaved,
  onError,
}: {
  tenants: { tenantId: string; tenantCode: string; name: string }[];
  products: { productId: string; productCode: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
  onError: (m: string | null) => void;
}) {
  const [tenantId, setTenantId] = useState(tenants[0]?.tenantId ?? '');
  const [productId, setProductId] = useState(products[0]?.productId ?? '');
  const [planCode, setPlanCode] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const product = products.find((p) => p.productId === productId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!product) return;
    setSubmitting(true);
    onError(null);
    try {
      await api.subscriptionMaster.create({
        tenantId,
        productCode: product.productCode,
        planCode: planCode.trim() || undefined,
        appUrl: appUrl.trim() || undefined,
      });
      onSaved();
    } catch (err: unknown) {
      onError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create Subscription" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <div className="field">
          <label className="label" htmlFor="sub-tenant">Tenant</label>
          <select
            id="sub-tenant"
            className="input"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            required
          >
            {tenants.map((tenant) => (
              <option key={tenant.tenantId} value={tenant.tenantId}>
                {tenant.tenantCode} · {tenant.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="sub-product">Product</label>
          <select
            id="sub-product"
            className="input"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
          >
            {products.map((prod) => (
              <option key={prod.productId} value={prod.productId}>
                {prod.productCode} · {prod.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="sub-plan">Plan Code</label>
          <input
            id="sub-plan"
            className="input mono"
            value={planCode}
            onChange={(e) => setPlanCode(e.target.value)}
            placeholder="e.g. JIOPLIX_ENTERPRISE (default STARTER)"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="sub-url">App Launch URL</label>
          <input
            id="sub-url"
            className="input mono"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
            placeholder="https://acme.product.com (auto-generated if blank)"
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || !product}>
            {submitting ? 'Creating…' : 'Create Subscription'}
          </button>
        </div>
      </form>
    </Modal>
  );
}