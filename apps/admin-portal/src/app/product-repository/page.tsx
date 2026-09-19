'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty } from '@/components/ui';
import type { ProductRepositoryView } from '@/lib/types';

const PAGE_SIZE = 20;

export default function ProductRepositoryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading } = useAsyncData(
    () => api.productRepository.list({ page, limit: PAGE_SIZE, search }),
    [page, search],
  );

  const rows = data?.data ?? [];
  const pages = data?.meta.totalPages ?? 1;

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Product Repository</h1>
          <p>
            Registry of deployed products: domain, database location & connection string, where the
            application is configured, and their customer tenants.
          </p>
        </div>
      </div>

      {error && <ErrorBanner error={error} />}

      <section className="card">
        <div className="card-pad search-row">
          <input
            className="input"
            placeholder="Search product code or domain…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {loading && !data && <LoadingBlock />}
        {!loading && rows.length === 0 && (
          <Empty>No product repositories found.</Empty>
        )}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Domain</th>
                  <th>Database Location</th>
                  <th>Connection String</th>
                  <th>Configured At (App Config)</th>
                  <th>Updated</th>
                  <th className="cell-actions">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: ProductRepositoryView) => (
                  <tr key={row.productId}>
                    <td>
                      <Link href={`/product-repository/${row.productId}`} className="row-link">
                        <strong className="mono">{row.productCode}</strong>
                        <div className="faint small">connection string & customer registry</div>
                      </Link>
                    </td>
                    <td>
                      {row.domain ? (
                        <a
                          href={row.domain}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono"
                          style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}
                        >
                          {row.domain} ↗
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted small">{row.databaseLocation ?? '—'}</td>
                    <td>
                      <code className="mono small" style={{ fontSize: '0.75rem' }}>
                        {row.databaseConnectionString ?? '—'}
                      </code>
                    </td>
                    <td className="small">{row.configurationLocation ?? '—'}</td>
                    <td className="muted small">{new Date(row.updatedAt).toLocaleDateString()}</td>
                    <td className="cell-actions">
                      <Link href={`/product-repository/${row.productId}`} className="btn btn-ghost btn-sm">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card-pad pager">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            ← Prev
          </button>
          <span className="muted small">Page {page} / {pages} · {data?.meta.total ?? 0} total</span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= pages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next →
          </button>
        </div>
      </section>
    </div>
  );
}