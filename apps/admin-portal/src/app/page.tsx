'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, resolveApiBaseUrl } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, useIsMounted, useStoredToken } from '@/components/ui';
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
  const router = useRouter();
  const isMounted = useIsMounted();
  const token = useStoredToken();
  const health = useApiHealth();
  const products = useAsyncData(() => api.products.list({ limit: 5 }), []);
  const tenants = useAsyncData(() => api.tenants.list({ limit: 5 }), []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      // If hitting a storeai tenant subdomain (e.g. nike.storeai.cybelinx.com, adidas.storeai.cybelinx.com)
      if (host.includes('.storeai.') || host.startsWith('storeai.')) {
        let tenantParam = 'nike';
        if (host.includes('adidas')) tenantParam = 'adidas';
        else if (host.includes('puma')) tenantParam = 'puma';
        router.replace(`/storeai/merchant?tenant=${tenantParam}`);
      }
    }
  }, [router]);

  const productTotal = products.data?.meta.total;
  const tenantTotal = tenants.data?.meta.total;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 style={{ background: 'linear-gradient(135deg, #60A5FA, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cybelinx Control Plane
          </h1>
          <p>Multi-Tenant SaaS Operations, Schema Isolation, Metered Usage & Telemetry Stream</p>
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

      {isMounted && !token && (
        <div>
          <ErrorBanner error="No API token configured. Set your development JWT in Settings before the read-only views will load." />
        </div>
      )}

      <div className="stats-grid">
        <div className="stat" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="stat-value">{tenantTotal ?? (tenants.loading ? '…' : '—')}</div>
          <div className="stat-label">Active Tenants</div>
        </div>
        <div className="stat" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="stat-value">{productTotal ?? (products.loading ? '…' : '—')}</div>
          <div className="stat-label">SaaS Products</div>
        </div>
        <div className="stat" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div className="stat-value">Schema-per-Tenant</div>
          <div className="stat-label">Isolation Strategy</div>
        </div>
        <div className="stat" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="stat-value">
            {health.loading && !health.data ? (
              '…'
            ) : health.data?.status === 'ok' ? (
              <span style={{ color: '#10B981' }}>Online</span>
            ) : (
              <span style={{ color: '#EF4444' }}>Offline</span>
            )}
          </div>
          <div className="stat-label">Actuator Health & Metrics</div>
        </div>
      </div>

      {/* Multi-Tenant System Architecture Banner */}
      <section className="card" style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡ Multi-Tenant Pipeline Telemetry</span>
          </h2>
        </div>
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
            <div style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase' }}>Database Isolation</div>
            <div style={{ fontWeight: '600', color: '#F1F5F9', marginTop: '4px' }}>Schema per Tenant / Product</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>`tenant_acme_jioplix`, `tenant_acme_lims`</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
            <div style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase' }}>Event Outbox Engine</div>
            <div style={{ fontWeight: '600', color: '#38BDF8', marginTop: '4px' }}>Transactional Outbox Relay</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>PostgreSQL Outbox + Event Worker</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
            <div style={{ color: '#94A3B8', fontSize: '12px', textTransform: 'uppercase' }}>Tenant Adapter</div>
            <div style={{ fontWeight: '600', color: '#A855F7', marginTop: '4px' }}>`X-External-Tenant-ID`</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>Product Tenant ID Mapping</div>
          </div>
        </div>
      </section>

      <div className="grid2">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Registered Products</h2>
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
            <h2 className="card-title">Provisioned Tenants</h2>
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