'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { TenantListResponse, TenantProductView, TenantView } from '@/lib/types';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { StatusBadge, formatDate } from '@/components/badges';

interface SubscriptionRow extends TenantProductView {
  tenant: TenantView;
}

export default function SubscriptionsPage() {
  const tenants = useAsyncData(() => api.tenants.list({ limit: 200 }), []);
  const products = useAsyncData(() => api.products.list({ limit: 200 }), []);
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    if (products.data) {
      products.data.data.forEach((p) => map.set(p.productCode, p.productId));
    }
    return map;
  }, [products.data]);

  useEffect(() => {
    const list = tenants.data;
    if (!list) return;
    let cancelled = false;
    async function run(source: TenantListResponse) {
      setLoadingRows(true);
      setRowError(null);
      try {
        const results = await Promise.all(
          source.data.map((tenant) => api.tenantProducts.list(tenant.tenantId)),
        );
        if (cancelled) return;
        const flattened: SubscriptionRow[] = [];
        results.forEach((result, index) => {
          const tenant = source.data[index];
          for (const product of result.data) {
            flattened.push({ ...product, tenant });
          }
        });
        flattened.sort((a, b) => (a.tenant.tenantCode < b.tenant.tenantCode ? -1 : 1));
        setRows(flattened);
      } catch (err: unknown) {
        if (!cancelled) setRowError(describeError(err));
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    }
    run(list);
    return () => {
      cancelled = true;
    };
  }, [tenants.data]);

  const activeCount = useMemo(() => rows.filter((row) => row.status === 'ACTIVE').length, [rows]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Subscriptions</h1>
          <p>Every tenant/product subscription across the platform.</p>
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
        </div>
      </div>

      {tenants.error && <ErrorBanner error={tenants.error} />}
      {rowError && <ErrorBanner error={rowError} />}
      {tenants.loading && !tenants.data && <LoadingBlock />}
      {!tenants.data && !tenants.loading && <Empty />}

      {tenants.data && (
        <section className="card">
          {loadingRows && !rows.length && <LoadingBlock />}
          {!loadingRows && rows.length === 0 && (
            <Empty>No subscriptions yet. Attach a product from a tenant&apos;s detail page.</Empty>
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
                    <th className="cell-actions">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const productId = productMap.get(row.productCode);
                    return (
                      <tr key={`${row.tenantProductId}`}>
                        <td>
                          <Link href={`/tenants/${row.tenant.tenantId}`} className="row-link">
                            <strong className="mono">{row.tenant.tenantCode}</strong>
                            <div className="faint small">{row.tenant.name}</div>
                          </Link>
                        </td>
                        <td className="mono">
                          {productId ? (
                            <Link href={`/products/${productId}`} className="row-link" style={{ color: '#0284c7', fontWeight: 600 }}>
                              {row.productCode}
                            </Link>
                          ) : (
                            row.productCode
                          )}
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
                          <Link
                            href={`/tenants/${row.tenant.tenantId}`}
                            className="btn btn-ghost btn-sm"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}