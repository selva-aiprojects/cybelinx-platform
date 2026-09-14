'use client';

import Link from 'next/link';
import { api, resolveApiBaseUrl, getStoredToken } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty } from '@/components/ui';
import { StatusBadge, formatDate } from '@/components/badges';

function useApiHealth() {
  return useAsyncData(
    async () => {
      const res = await fetch(`${resolveApiBaseUrl()}/health`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`API health check failed (status ${res.status})`);
      return (await res.json()) as { status: string; service?: string };
    },
    [],
  );
}

export default function DashboardPage() {
  const token = getStoredToken();
  const health = useApiHealth();
  const products = useAsyncData(() => api.products.list({ limit: 5 }), []);
  const tenants = useAsyncData(() => api.tenants.list({ limit: 5 }), []);

  const productTotal = products.data?.meta.total;
  const tenantTotal = tenants.data?.meta.total;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Operational overview of the Cybelinx control plane.</p>
        </div>
        <div className="flex">
          <Link href="/settings" className="btn btn-ghost">
            API settings
          </Link>
          <Link href="/tenants" className="btn btn-ghost">
            Tenants
          </Link>
          <Link href="/products" className="btn btn-primary">
            New product
          </Link>
        </div>
      </div>

      {!token && (
        <div>
          <ErrorBanner error="No API token configured. Set your development JWT in Settings before the read-only views will load." />
        </div>
      )}

      <div className="stats-grid">
        <div className="stat">
          <div className="stat-value">{productTotal ?? (products.loading ? '…' : '—')}</div>
          <div className="stat-label">Products</div>
        </div>
        <div className="stat">
          <div className="stat-value">{tenantTotal ?? (tenants.loading ? '…' : '—')}</div>
          <div className="stat-label">Tenants</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {health.loading && !health.data ? (
              '…'
            ) : health.data?.status === 'ok' ? (
              <span style={{ color: 'var(--success)' }}>Online</span>
            ) : (
              <span style={{ color: 'var(--danger)' }}>Offline</span>
            )}
          </div>
          <div className="stat-label">Control plane API</div>
        </div>
      </div>

      <div className="grid2">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Recent products</h2>
            <Link href="/products" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {products.error && <ErrorBanner error={products.error} />}
          {products.loading && !products.data && <LoadingBlock />}
          {products.data && products.data.data.length === 0 && <Empty />}
          {products.data && products.data.data.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {products.data.data.map((product) => (
                    <tr key={product.productId}>
                      <td>
                        <Link href={`/products/${product.productId}`} className="row-link">
                          <strong>{product.productCode}</strong>
                          <div className="faint small">{product.name}</div>
                        </Link>
                      </td>
                      <td>
                        <StatusBadge value={product.status} />
                      </td>
                      <td className="muted small">{formatDate(product.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Recent tenants</h2>
            <Link href="/tenants" className="btn btn-ghost btn-sm">
              View all
            </Link>
          </div>
          {tenants.error && <ErrorBanner error={tenants.error} />}
          {tenants.loading && !tenants.data && <LoadingBlock />}
          {tenants.data && tenants.data.data.length === 0 && <Empty />}
          {tenants.data && tenants.data.data.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.data.data.map((tenant) => (
                    <tr key={tenant.tenantId}>
                      <td>
                        <Link href={`/tenants/${tenant.tenantId}`} className="row-link">
                          <strong>{tenant.tenantCode}</strong>
                          <div className="faint small">{tenant.name}</div>
                        </Link>
                      </td>
                      <td>
                        <StatusBadge value={tenant.status} />
                      </td>
                      <td className="muted small">{formatDate(tenant.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}