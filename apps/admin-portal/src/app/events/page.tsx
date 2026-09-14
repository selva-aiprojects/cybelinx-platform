'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { PageMeta, PlatformEventView } from '@/lib/types';
import { StatusBadge } from '@/components/badges';

export default function PlatformEventsPage() {
  const [events, setEvents] = useState<PlatformEventView[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aggregateType, setAggregateType] = useState('');
  const [eventType, setEventType] = useState('');

  const loadEvents = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.events.list({
        page,
        limit: 20,
        aggregateType: aggregateType.trim() || undefined,
        eventType: eventType.trim() || undefined,
      });
      setEvents(res.data);
      setMeta(res.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load platform events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents(1);
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvents(1);
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>Platform Outbox Events</h1>
          <div className="muted" style={{ marginTop: '0.4rem' }}>
            Transactional outbox events emitted by the central domain model for asynchronous delivery.
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <form onSubmit={handleFilter} className="flex gap-4 items-end">
          <div style={{ flex: 1 }}>
            <label className="label">Aggregate Type</label>
            <input
              type="text"
              placeholder="e.g. TENANT, PRODUCT, PROVISIONING_JOB"
              className="input"
              value={aggregateType}
              onChange={(e) => setAggregateType(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Event Type</label>
            <input
              type="text"
              placeholder="e.g. tenant.created, product.published"
              className="input"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Filter
          </button>
        </form>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading events outbox...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No platform events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Aggregate Type</th>
                  <th className="py-3 px-4">Aggregate ID</th>
                  <th className="py-3 px-4">Tenant ID</th>
                  <th className="py-3 px-4">Payload</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.eventId} className="border-b border-slate-800/50 hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-sky-400">{evt.eventType}</td>
                    <td className="py-3 px-4">
                      <StatusBadge value={evt.aggregateType} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {evt.aggregateId}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {evt.tenantId || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400 max-w-xs truncate">
                      {JSON.stringify(evt.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Showing page {meta.page} of {meta.totalPages || 1} ({meta.total} total events)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => loadEvents(meta.page - 1)}
                  className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => loadEvents(meta.page + 1)}
                  className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
