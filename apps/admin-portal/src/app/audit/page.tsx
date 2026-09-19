'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty } from '@/components/ui';
import type { AuditEventView } from '@/lib/types';
import { StatusBadge, formatDate } from '@/components/badges';

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const [entityType, setEntityType] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading } = useAsyncData(
    () =>
      api.audit.list({
        page,
        limit: PAGE_SIZE,
        entityType: entityType.trim() || undefined,
        tenantId: tenantId.trim() || undefined,
      }),
    [page, entityType, tenantId],
  );

  const rows = data?.data ?? [];
  const pages = data?.meta.totalPages ?? 1;

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Platform Audit Log</h1>
          <p>
            Immutable audit trail of administrative and lifecycle operations across the Cybelinx platform.
          </p>
        </div>
      </div>

      {error && <ErrorBanner error={error} />}

      <section className="card">
        <form onSubmit={handleFilter} className="card-pad search-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="e.g. tenant, product, entitlement"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Tenant ID (UUID)"
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setPage(1);
            }}
          />
          <button type="submit" className="btn btn-primary">
            Filter
          </button>
        </form>

        {loading && !data && <LoadingBlock />}
        {!loading && rows.length === 0 && <Empty>No audit events match the specified criteria.</Empty>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Tenant ID</th>
                  <th>Actor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((evt: AuditEventView) => (
                  <tr key={evt.eventId}>
                    <td className="mono small muted">{formatDate(evt.createdAt)}</td>
                    <td className="small">{evt.action}</td>
                    <td>
                      <StatusBadge value={evt.resourceType || 'UNKNOWN'} />
                    </td>
                    <td className="mono small">{evt.resourceId || '—'}</td>
                    <td className="mono small muted">{evt.tenantId || '—'}</td>
                    <td className="mono small muted">{evt.actorUserId || 'system'}</td>
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
          <span className="muted small">
            Page {page} / {pages} · {data?.meta.total ?? 0} total
          </span>
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