'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty } from '@/components/ui';
import type { PlatformEventView } from '@/lib/types';
import { StatusBadge, formatDate } from '@/components/badges';

const PAGE_SIZE = 20;

const PAYLOAD_STYLE: React.CSSProperties = {
  maxWidth: '280px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export default function PlatformEventsPage() {
  const [entityType, setEntityType] = useState('');
  const [eventType, setEventType] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading } = useAsyncData(
    () =>
      api.events.list({
        page,
        limit: PAGE_SIZE,
        entityType: entityType.trim() || undefined,
        eventType: eventType.trim() || undefined,
      }),
    [page, entityType, eventType],
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
          <h1>Platform Outbox Events</h1>
          <p>
            Transactional outbox events emitted by the central domain model for asynchronous delivery.
          </p>
        </div>
      </div>

      {error && <ErrorBanner error={error} />}

      <section className="card">
        <form onSubmit={handleFilter} className="card-pad search-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Entity type e.g. tenant, tenant_product, tenant_onboarding"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
          />
          <input
            className="input"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Event type e.g. tenant.created, resource.failed"
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPage(1);
            }}
          />
          <button type="submit" className="btn btn-primary">
            Filter
          </button>
        </form>

        {loading && !data && <LoadingBlock />}
        {!loading && rows.length === 0 && <Empty>No platform events found.</Empty>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Occurred At</th>
                  <th>Event Type</th>
                  <th>Status</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Tenant ID</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((evt: PlatformEventView) => (
                  <tr key={evt.eventId}>
                    <td className="mono small muted">{formatDate(evt.occurredAt)}</td>
                    <td className="small">{evt.eventType}</td>
                    <td>
                      <StatusBadge value={evt.status || 'UNKNOWN'} />
                    </td>
                    <td className="mono small">{evt.entityType || '—'}</td>
                    <td className="mono small">{evt.entityId || '—'}</td>
                    <td className="mono small muted">{evt.tenantId || '—'}</td>
                    <td className="mono small muted" style={PAYLOAD_STYLE}>
                      {evt.source || '—'}
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