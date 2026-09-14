'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { AuditEventView, PageMeta } from '@/lib/types';
import { StatusBadge } from '@/components/badges';

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEventView[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entityType, setEntityType] = useState('');
  const [tenantId, setTenantId] = useState('');

  const loadAuditEvents = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.audit.list({
        page,
        limit: 20,
        entityType: entityType.trim() || undefined,
        tenantId: tenantId.trim() || undefined,
      });
      setEvents(res.data);
      setMeta(res.meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditEvents(1);
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditEvents(1);
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>Platform Audit Log</h1>
          <div className="muted" style={{ marginTop: '0.4rem' }}>
            Immutable audit trail of administrative and lifecycle operations across the Cybelinx platform.
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <form onSubmit={handleFilter} className="flex gap-4 items-end">
          <div style={{ flex: 1 }}>
            <label className="label">Entity Type</label>
            <input
              type="text"
              placeholder="e.g. tenant, product, entitlement"
              className="input"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Tenant ID</label>
            <input
              type="text"
              placeholder="UUID"
              className="input"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
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
          <div className="p-8 text-center text-slate-400">Loading audit log...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No audit events match the specified criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Tenant ID</th>
                  <th className="py-3 px-4">Actor</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.eventId} className="border-b border-slate-800/50 hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{evt.action}</td>
                    <td className="py-3 px-4">
                      <StatusBadge value={evt.resourceType || 'UNKNOWN'} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-300">
                      {evt.resourceId || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {evt.tenantId || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-400">
                      {evt.actorUserId || 'system'}
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
                  onClick={() => loadAuditEvents(meta.page - 1)}
                  className="btn btn-secondary text-xs px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => loadAuditEvents(meta.page + 1)}
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
