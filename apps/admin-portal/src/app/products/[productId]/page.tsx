'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { ProductStatus } from '@/lib/types';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { StatusBadge, formatDate } from '@/components/badges';
import { Modal } from '@/components/modal';

type Tab = 'versions' | 'plans';

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const [tab, setTab] = useState<Tab>('versions');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const product = useAsyncData(() => api.products.get(productId), [productId]);
  const versions = useAsyncData(() => api.products.versions.list(productId), [productId]);
  // plans loaded lazily when the tab is opened
  const plans = useAsyncData(
    () => (tab === 'plans' ? api.products.plans.list(productId) : Promise.resolve({ data: [] })),
    [productId, tab],
  );

  const [versionModal, setVersionModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);

  const notify = useCallback((kind: 'success' | 'error', text: string) => {
    setFeedback({ kind, text });
    window.setTimeout(() => setFeedback(null), 4000);
  }, []);

  if (product.loading && !product.data) return <LoadingBlock />;
  if (product.error) return <ErrorBanner error={product.error} />;
  if (!product.data) return null;

  const p = product.data;

  async function changeStatus(next: ProductStatus) {
    try {
      const result = await api.products.setStatus(productId, next);
      notify('success', `Product ${result.status}`);
      product.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  async function publishVersion(versionId: string) {
    try {
      await api.products.versions.publish(productId, versionId);
      notify('success', 'Version published');
      versions.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link href="/products">Products</Link>
        <span className="sep">/</span>
        <span>{p.productCode}</span>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.kind}`}>{feedback.text}</div>
      )}

      <div className="page-header">
        <div>
          <div className="flex" style={{ gap: '0.8rem', marginBottom: '0.4rem' }}>
            <h1 style={{ margin: 0 }}>{p.name}</h1>
            <StatusBadge value={p.status} />
          </div>
          <p className="muted">{p.description || 'No description.'}</p>
          <div className="kv">
            <span className="k">Code</span>
            <span className="v mono">{p.productCode}</span>
            <span className="k">Base URL</span>
            <span className="v mono">
              {p.baseUrl ? (
                <a href={p.baseUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontWeight: 600 }}>
                  {p.baseUrl} ↗
                </a>
              ) : (
                '—'
              )}
            </span>
            <span className="k">Created</span>
            <span className="v">{formatDate(p.createdAt)}</span>
          </div>
        </div>
        <div className="flex">
          {p.status !== 'ACTIVE' && (
            <button type="button" className="btn btn-sm" onClick={() => changeStatus('ACTIVE')}>
              Activate
            </button>
          )}
          {p.status !== 'DEPRECATED' && p.status !== 'DISABLED' && (
            <button type="button" className="btn btn-sm" onClick={() => changeStatus('DEPRECATED')}>
              Deprecate
            </button>
          )}
          {p.status !== 'DISABLED' && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => changeStatus('DISABLED')}>
              Disable
            </button>
          )}
        </div>
      </div>

      <div className="flex" style={{ gap: '0.4rem', borderBottom: '1px solid var(--border)', marginBottom: '1.2rem' }}>
        {(
          [
            ['versions', 'Versions'],
            ['plans', 'Plans'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'versions' && (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Versions</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setVersionModal(true)}>
              + New version
            </button>
          </div>
          {versions.error && <ErrorBanner error={versions.error} />}
          {versions.loading && !versions.data && <LoadingBlock />}
          {versions.data && versions.data.data.length === 0 && (
            <Empty>No versions yet. Publish the first one to set it as current.</Empty>
          )}
          {versions.data && versions.data.data.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Release notes</th>
                    <th>Published</th>
                    <th className="cell-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.data.data.map((version) => (
                    <tr key={version.versionId}>
                      <td className="mono">{version.version}</td>
                      <td>
                        {version.isCurrent ? (
                          <StatusBadge value="ACTIVE">current</StatusBadge>
                        ) : (
                          <StatusBadge value="DRAFT">draft</StatusBadge>
                        )}
                      </td>
                      <td className="muted small">{version.releaseNotes || '—'}</td>
                      <td className="muted small">{formatDate(version.publishedAt)}</td>
                      <td className="cell-actions">
                        {!version.isCurrent && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => publishVersion(version.versionId)}
                          >
                            Publish
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
      )}

      {tab === 'plans' && (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Plans</h2>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setPlanModal(true)}>
              + New plan
            </button>
          </div>
          {plans.error && <ErrorBanner error={plans.error} />}
          {plans.loading && !plans.data && <LoadingBlock />}
          {plans.data && plans.data.data.length === 0 && (
            <Empty>No plans yet. Plans carry entitlements and are attached at subscription time.</Empty>
          )}
          {plans.data && plans.data.data.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Trial (days)</th>
                    <th>Created</th>
                    <th className="cell-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.data.data.map((plan) => (
                    <tr key={plan.planId}>
                      <td>
                        <Link href={`/products/${productId}/plans/${plan.planId}`} className="row-link">
                          <strong>{plan.planCode}</strong>
                          <div className="faint small">{plan.name}</div>
                        </Link>
                      </td>
                      <td>
                        <StatusBadge value={plan.status} />
                      </td>
                      <td className="muted">{plan.trialDays ?? '—'}</td>
                      <td className="muted small">{formatDate(plan.createdAt)}</td>
                      <td className="cell-actions">
                        <Link
                          href={`/products/${productId}/plans/${plan.planId}`}
                          className="btn btn-ghost btn-sm"
                        >
                          Entitlements
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {versionModal && (
        <VersionCreateModal
          productId={productId}
          onClose={() => setVersionModal(false)}
          onCreated={() => {
            versions.reload();
            setVersionModal(false);
          }}
        />
      )}
      {planModal && (
        <PlanCreateModal
          productId={productId}
          onClose={() => setPlanModal(false)}
          onCreated={() => {
            plans.reload();
            setPlanModal(false);
          }}
        />
      )}
    </div>
  );
}

function VersionCreateModal({
  productId,
  onClose,
  onCreated,
}: {
  productId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [version, setVersion] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.products.versions.create(productId, { version, releaseNotes: releaseNotes || undefined });
      onCreated();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New version" onClose={onClose}>
      {error && <ErrorBanner error={error} />}
      <div className="field">
        <label className="label" htmlFor="version">
          Version
        </label>
        <input
          id="version"
          className="input mono"
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          placeholder="2.1.0"
        />
        <div className="hint">
          Semantic version, e.g. <code>1.0.0</code> or <code>2.1.3</code>.
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="release-notes">
          Release notes
        </label>
        <textarea
          id="release-notes"
          className="textarea"
          value={releaseNotes}
          onChange={(event) => setReleaseNotes(event.target.value)}
          placeholder="What changed in this release?"
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={submitting || !version} onClick={submit}>
          {submitting ? 'Creating…' : 'Create version'}
        </button>
      </div>
    </Modal>
  );
}

function PlanCreateModal({
  productId,
  onClose,
  onCreated,
}: {
  productId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [planCode, setPlanCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trialDays, setTrialDays] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.products.plans.create(productId, {
        planCode,
        name,
        description: description || undefined,
        trialDays: trialDays === '' ? null : Number(trialDays),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New plan" onClose={onClose}>
      {error && <ErrorBanner error={error} />}
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="plan-code">
            Plan code
          </label>
          <input
            id="plan-code"
            className="input mono"
            value={planCode}
            onChange={(event) => setPlanCode(event.target.value.toUpperCase())}
            placeholder="ENTERPRISE"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="plan-name">
            Display name
          </label>
          <input
            id="plan-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enterprise"
          />
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="plan-description">
          Description
        </label>
        <textarea
          id="plan-description"
          className="textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="plan-trial">
          Trial period (days)
        </label>
        <input
          id="plan-trial"
          className="input"
          type="number"
          min="0"
          value={trialDays}
          onChange={(event) => setTrialDays(event.target.value)}
          placeholder="0"
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={submitting || !planCode || !name} onClick={submit}>
          {submitting ? 'Creating…' : 'Create plan'}
        </button>
      </div>
    </Modal>
  );
}