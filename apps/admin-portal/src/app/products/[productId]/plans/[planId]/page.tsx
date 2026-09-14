'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { EntitlementStatus, PlanStatus } from '@/lib/types';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { StatusBadge, formatDate } from '@/components/badges';
import { Modal } from '@/components/modal';

export default function PlanDetailPage() {
  const params = useParams<{ productId: string; planId: string }>();
  const { productId, planId } = params;
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const product = useAsyncData(() => api.products.get(productId), [productId]);
  const plan = useAsyncData(() => api.products.plans.get(productId, planId), [productId, planId]);
  const entitlements = useAsyncData(
    () => api.products.plans.entitlements.list(productId, planId),
    [productId, planId],
  );
  const [entitlementModal, setEntitlementModal] = useState(false);
  const [editEntitlement, setEditEntitlement] = useState<string | null>(null);

  const notify = useCallback((kind: 'success' | 'error', text: string) => {
    setFeedback({ kind, text });
    window.setTimeout(() => setFeedback(null), 4000);
  }, []);

  if (product.error || plan.error || entitlements.error) {
    return <ErrorBanner error={product.error ?? plan.error ?? entitlements.error ?? 'Error'} />;
  }
  if ((!product.data || !plan.data) && (product.loading || plan.loading)) return <LoadingBlock />;
  if (!product.data || !plan.data) return null;

  const targetPlan = plan.data;

  async function changeStatus(next: PlanStatus) {
    try {
      const result = await api.products.plans.setStatus(productId, planId, next);
      notify('success', `Plan ${result.status}`);
      plan.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  async function changeEntitlementStatus(entitlementId: string, next: EntitlementStatus) {
    try {
      const result = await api.products.plans.entitlements.setStatus(productId, planId, entitlementId, next);
      notify('success', `Entitlement ${result.status}`);
      entitlements.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link href="/products">Products</Link>
        <span className="sep">/</span>
        <Link href={`/products/${productId}`}>{product.data.productCode}</Link>
        <span className="sep">/</span>
        <span>{targetPlan.planCode}</span>
      </div>

      {feedback && <div className={`alert alert-${feedback.kind}`}>{feedback.text}</div>}

      <div className="page-header">
        <div>
          <div className="flex" style={{ gap: '0.8rem', marginBottom: '0.4rem' }}>
            <h1 style={{ margin: 0 }}>{targetPlan.name}</h1>
            <StatusBadge value={targetPlan.status} />
          </div>
          <p className="muted">{targetPlan.description || 'No description.'}</p>
          <div className="kv">
            <span className="k">Code</span>
            <span className="v mono">{targetPlan.planCode}</span>
            <span className="k">Trial</span>
            <span className="v">{targetPlan.trialDays ?? '—'} days</span>
            <span className="k">Updated</span>
            <span className="v">{formatDate(targetPlan.updatedAt)}</span>
          </div>
        </div>
        <div className="flex">
          {targetPlan.status !== 'ACTIVE' && (
            <button type="button" className="btn btn-sm" onClick={() => changeStatus('ACTIVE')}>
              Activate
            </button>
          )}
          {targetPlan.status !== 'RETIRED' && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => changeStatus('RETIRED')}>
              Retire
            </button>
          )}
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            Entitlements <span className="muted">({entitlements.data?.data.length ?? 0})</span>
          </h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEntitlementModal(true)}>
            + Add entitlement
          </button>
        </div>
        {entitlements.loading && !entitlements.data && <LoadingBlock />}
        {entitlements.data && entitlements.data.data.length === 0 && (
          <Empty>No entitlements on this plan yet.</Empty>
        )}
        {entitlements.data && entitlements.data.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th className="cell-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entitlements.data.data.map((ent) => (
                  <tr key={ent.entitlementId}>
                    <td className="mono">{ent.key}</td>
                    <td>{ent.name ?? '—'}</td>
                    <td className="mono small muted">
                      {ent.value ? JSON.stringify(ent.value) : '—'}
                    </td>
                    <td>
                      <StatusBadge value={ent.status} />
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditEntitlement(ent.entitlementId)}
                      >
                        Edit
                      </button>
                      {ent.status !== 'INACTIVE' && ent.status !== 'SUSPENDED' && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => changeEntitlementStatus(ent.entitlementId, 'INACTIVE')}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {entitlementModal && (
        <EntitlementCreateModal
          productId={productId}
          planId={planId}
          onClose={() => setEntitlementModal(false)}
          onCreated={() => {
            entitlements.reload();
            setEntitlementModal(false);
          }}
        />
      )}

      {editEntitlement && (
        <EntitlementEditModal
          productId={productId}
          planId={planId}
          entitlementId={editEntitlement}
          onClose={() => setEditEntitlement(null)}
          onSaved={() => {
            entitlements.reload();
            setEditEntitlement(null);
          }}
        />
      )}
    </div>
  );
}

function EntitlementCreateModal({
  productId,
  planId,
  onClose,
  onCreated,
}: {
  productId: string;
  planId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [valueText, setValueText] = useState('');
  const [valueError, setValueError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    let value: Record<string, unknown> | undefined;
    if (valueText.trim()) {
      try {
        value = JSON.parse(valueText) as Record<string, unknown>;
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error('must be a JSON object');
        }
      } catch (err) {
        setValueError((err as Error).message);
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.products.plans.entitlements.create(productId, planId, {
        key,
        name: name || undefined,
        value,
      });
      onCreated();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add entitlement" onClose={onClose}>
      {error && <ErrorBanner error={error} />}
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="entitlement-key">
            Key
          </label>
          <input
            id="entitlement-key"
            className="input mono"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="max_seats"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="entitlement-name">
            Name
          </label>
          <input
            id="entitlement-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Maximum seats"
          />
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="entitlement-value">
          Value (JSON object)
        </label>
        <textarea
          id="entitlement-value"
          className="textarea mono"
          value={valueText}
          onChange={(event) => {
            setValueText(event.target.value);
            setValueError(null);
          }}
          placeholder={'{"max_seats": 250}'}
        />
        {valueError && <span className="hint" style={{ color: 'var(--danger)' }}>{valueError}</span>}
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={submitting || !key} onClick={submit}>
          {submitting ? 'Creating…' : 'Add entitlement'}
        </button>
      </div>
    </Modal>
  );
}

function EntitlementEditModal({
  productId,
  planId,
  entitlementId,
  onClose,
  onSaved,
}: {
  productId: string;
  planId: string;
  entitlementId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = useAsyncData(
    () => api.products.plans.entitlements.get(productId, planId, entitlementId),
    [productId, planId, entitlementId],
  );
  const [name, setName] = useState('');
  const [valueText, setValueText] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existing.data && !initialized) {
    setName(existing.data.name ?? '');
    setValueText(existing.data.value ? JSON.stringify(existing.data.value, null, 2) : '');
    setInitialized(true);
  }
  if (existing.error && !initialized) {
    setError(existing.error);
    setInitialized(true);
  }

  async function submit() {
    let value: Record<string, unknown> | undefined;
    if (valueText.trim()) {
      try {
        value = JSON.parse(valueText) as Record<string, unknown>;
      } catch {
        setError('Value must be valid JSON.');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.products.plans.entitlements.update(productId, planId, entitlementId, {
        name: name || undefined,
        value,
      });
      onSaved();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit entitlement" onClose={onClose}>
      {error && <ErrorBanner error={error} />}
      <div className="field">
        <label className="label" htmlFor="entitlement-edit-name">
          Name
        </label>
        <input
          id="entitlement-edit-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="entitlement-edit-value">
          Value (JSON object)
        </label>
        <textarea
          id="entitlement-edit-value"
          className="textarea mono"
          value={valueText}
          onChange={(event) => setValueText(event.target.value)}
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={submitting} onClick={submit}>
          {submitting ? 'Saving…' : 'Save entitlement'}
        </button>
      </div>
    </Modal>
  );
}