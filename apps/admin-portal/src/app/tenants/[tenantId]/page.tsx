'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type {
  Environment,
  IsolationMode,
  TenantProductStatus,
  TenantProductView,
  TenantResourceView,
} from '@/lib/types';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { StatusBadge, IsolationBadge, formatDate } from '@/components/badges';
import { Modal } from '@/components/modal';

const ENVIRONMENTS: Environment[] = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'];
const ISOLATION_MODES: IsolationMode[] = [
  'SHARED_POOL',
  'SCHEMA_PER_TENANT',
  'DEDICATED_DATABASE',
  'DEDICATED_INFRASTRUCTURE',
];
const PRODUCT_CODES = ['JIOPLIX', 'JIOPLIX_SMART', 'LIMS', 'STOREAI', 'SYNTHALYST_HRM'];
const RESOURCE_TYPES = ['POSTGRES_SCHEMA', 'POSTGRES_DATABASE', 'OBJECT_STORAGE'];

export default function TenantDetailPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const detail = useAsyncData(() => api.tenants.get(tenantId), [tenantId]);

  const [attachOpen, setAttachOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);

  const notify = useCallback((kind: 'success' | 'error', text: string) => {
    setFeedback({ kind, text });
    window.setTimeout(() => setFeedback(null), 4000);
  }, []);

  if (detail.loading && !detail.data) return <LoadingBlock />;
  if (detail.error) return <ErrorBanner error={detail.error} />;
  if (!detail.data) return null;

  const { tenant, products, resources, provisioningJobs, memberships } = detail.data;

  async function suspend() {
    try {
      const result = await api.tenants.suspend(tenantId);
      notify('success', `Tenant ${result.status}`);
      detail.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  async function activate() {
    try {
      const result = await api.tenants.activate(tenantId);
      notify('success', `Tenant ${result.status}`);
      detail.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  async function setProductStatus(product: TenantProductView, next: TenantProductStatus) {
    try {
      await api.tenantProducts.setStatus(tenantId, product.productCode, next);
      notify('success', `${product.productCode} → ${next}`);
      detail.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  async function detach(product: TenantProductView) {
    if (!window.confirm(`Detach ${product.productCode} from ${tenant.tenantCode}?`)) return;
    try {
      const result = await api.tenantProducts.detach(tenantId, product.productCode);
      notify('success', `Detached ${result.productCode}`);
      detail.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  async function removeResource(resource: TenantResourceView) {
    if (!window.confirm(`Unregister ${resource.resourceTypeCode} resource?`)) return;
    try {
      await api.tenantResources.remove(tenantId, resource.tenantResourceId);
      notify('success', `Unregistered ${resource.resourceTypeCode}`);
      detail.reload();
    } catch (err) {
      notify('error', describeError(err));
    }
  }

  return (
    <div className="stack">
      <div className="breadcrumbs">
        <Link href="/tenants">Tenants</Link>
        <span className="sep">/</span>
        <span>{tenant.tenantCode}</span>
      </div>

      {feedback && <div className={`alert alert-${feedback.kind}`}>{feedback.text}</div>}

      <div className="page-header">
        <div>
          <div className="flex" style={{ gap: '0.8rem', marginBottom: '0.4rem' }}>
            <h1 style={{ margin: 0 }}>{tenant.name}</h1>
            <StatusBadge value={tenant.status} />
          </div>
          <div className="kv" style={{ marginTop: '0.4rem' }}>
            <span className="k">Code</span>
            <span className="v mono">{tenant.tenantCode}</span>
            <span className="k">Region</span>
            <span className="v">{tenant.regionCode ?? '—'}</span>
            <span className="k">Country</span>
            <span className="v">{tenant.country ?? '—'}</span>
            <span className="k">Timezone</span>
            <span className="v">{tenant.timezone ?? '—'}</span>
            <span className="k">Created</span>
            <span className="v">{formatDate(tenant.createdAt)}</span>
          </div>
        </div>
        <div className="flex">
          {tenant.status !== 'SUSPENDED' && (
            <button type="button" className="btn btn-danger btn-sm" onClick={suspend}>
              Suspend
            </button>
          )}
          {tenant.status === 'SUSPENDED' && (
            <button type="button" className="btn btn-primary btn-sm" onClick={activate}>
              Activate
            </button>
          )}
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            Subscriptions <span className="muted">({products.length})</span>
          </h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setAttachOpen(true)}>
            + Attach product
          </button>
        </div>
        {products.length === 0 && <Empty>No subscribed products yet.</Empty>}
        {products.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Activated</th>
                  <th className="cell-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.tenantProductId}>
                    <td className="mono">{product.productCode}</td>
                    <td className="mono muted">{product.planCode ?? '—'}</td>
                    <td>
                      <StatusBadge value={product.status} />
                    </td>
                    <td className="muted small">{formatDate(product.activatedAt)}</td>
                    <td className="cell-actions">
                      {product.status !== 'ACTIVE' && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setProductStatus(product, 'ACTIVE')}
                        >
                          Activate
                        </button>
                      )}
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => detach(product)}>
                        Detach
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            Resources <span className="muted">({resources.length})</span>
          </h2>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setResourceOpen(true)}>
            + Register resource
          </button>
        </div>
        {resources.length === 0 && <Empty>No resources registered for this tenant.</Empty>}
        {resources.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Product</th>
                  <th>Isolation</th>
                  <th>Environment</th>
                  <th>Status</th>
                  <th>Provisioning</th>
                  <th className="cell-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.tenantResourceId}>
                    <td className="mono">{resource.resourceTypeCode}</td>
                    <td className="mono muted">{resource.productCode}</td>
                    <td>
                      <IsolationBadge value={resource.isolationMode} />
                    </td>
                    <td className="mono small muted">{resource.environment}</td>
                    <td>
                      <StatusBadge value={resource.status} />
                    </td>
                    <td>
                      <StatusBadge value={resource.provisioningState} />
                    </td>
                    <td className="cell-actions">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeResource(resource)}
                      >
                        Unregister
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            Provisioning jobs <span className="muted">({provisioningJobs.length})</span>
          </h2>
        </div>
        {provisioningJobs.length === 0 && <Empty>No provisioning activity yet.</Empty>}
        {provisioningJobs.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Operation</th>
                  <th>State</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {provisioningJobs.map((job) => (
                  <tr key={job.jobId}>
                    <td className="mono small muted">{job.jobId.slice(0, 8)}…</td>
                    <td className="mono">{job.operation}</td>
                    <td>
                      <StatusBadge value={job.state} />
                    </td>
                    <td className="mono small muted">{job.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">
            Members <span className="muted">({memberships.length})</span>
          </h2>
          <span className="hint">Member management is not yet exposed via the API.</span>
        </div>
        {memberships.length === 0 && <Empty>No members yet.</Empty>}
        {memberships.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Roles</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((membership) => (
                  <tr key={membership.membershipId}>
                    <td className="mono small muted">{membership.userId.slice(0, 8)}…</td>
                    <td>
                      <StatusBadge value={membership.status} />
                    </td>
                    <td className="mono small">{membership.roleCodes.join(', ') || '—'}</td>
                    <td className="muted small">{formatDate(membership.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ExternalIdsSection tenantId={tenantId} />
      <UsageEventsSection tenantId={tenantId} />

      {attachOpen && (
        <AttachProductModal
          tenantId={tenantId}
          onClose={() => setAttachOpen(false)}
          onAttached={() => {
            detail.reload();
            setAttachOpen(false);
          }}
        />
      )}
      {resourceOpen && (
        <RegisterResourceModal
          tenantId={tenantId}
          onClose={() => setResourceOpen(false)}
          onRegistered={() => {
            detail.reload();
            setResourceOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AttachProductModal({
  tenantId,
  onClose,
  onAttached,
}: {
  tenantId: string;
  onClose: () => void;
  onAttached: () => void;
}) {
  const [productCode, setProductCode] = useState('');
  const [planCode, setPlanCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.tenantProducts.attach(tenantId, {
        productCode,
        planCode: planCode || undefined,
      });
      onAttached();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Attach product" onClose={onClose}>
      {error && <ErrorBanner error={error} />}
      <div className="field">
        <label className="label" htmlFor="attach-product">
          Product code
        </label>
        <select
          id="attach-product"
          className="select mono"
          value={productCode}
          onChange={(event) => setProductCode(event.target.value)}
        >
          <option value="">— pick a product —</option>
          {PRODUCT_CODES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="label" htmlFor="attach-plan">
          Plan code (optional)
        </label>
        <input
          id="attach-plan"
          className="input mono"
          value={planCode}
          onChange={(event) => setPlanCode(event.target.value.toUpperCase())}
          placeholder="JIOPLIX_ENTERPRISE"
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={submitting || !productCode} onClick={submit}>
          {submitting ? 'Attaching…' : 'Attach product'}
        </button>
      </div>
    </Modal>
  );
}

function RegisterResourceModal({
  tenantId,
  onClose,
  onRegistered,
}: {
  tenantId: string;
  onClose: () => void;
  onRegistered: () => void;
}) {
  const [productCode, setProductCode] = useState('');
  const [resourceTypeCode, setResourceTypeCode] = useState('');
  const [isolationMode, setIsolationMode] = useState<IsolationMode>('SCHEMA_PER_TENANT');
  const [environment, setEnvironment] = useState<Environment>('DEVELOPMENT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.tenantResources.register(tenantId, {
        productCode,
        resourceTypeCode,
        isolationMode,
        environment,
      });
      onRegistered();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Register resource" onClose={onClose}>
      {error && <ErrorBanner error={error} />}
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="resource-product">
            Product
          </label>
          <select
            id="resource-product"
            className="select mono"
            value={productCode}
            onChange={(event) => setProductCode(event.target.value)}
          >
            <option value="">— pick —</option>
            {PRODUCT_CODES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="resource-type">
            Resource type
          </label>
          <select
            id="resource-type"
            className="select mono"
            value={resourceTypeCode}
            onChange={(event) => setResourceTypeCode(event.target.value)}
          >
            <option value="">— pick —</option>
            {RESOURCE_TYPES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="resource-isolation">
            Isolation mode
          </label>
          <select
            id="resource-isolation"
            className="select mono"
            value={isolationMode}
            onChange={(event) => setIsolationMode(event.target.value as IsolationMode)}
          >
            {ISOLATION_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="resource-env">
            Environment
          </label>
          <select
            id="resource-env"
            className="select mono"
            value={environment}
            onChange={(event) => setEnvironment(event.target.value as Environment)}
          >
            {ENVIRONMENTS.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={submitting || !productCode || !resourceTypeCode}
          onClick={submit}
        >
          {submitting ? 'Registering…' : 'Register resource'}
        </button>
      </div>
    </Modal>
  );
}

function ExternalIdsSection({ tenantId }: { tenantId: string }) {
  const externalData = useAsyncData(() => api.externalIds.list(tenantId), [tenantId]);
  const [provider, setProvider] = useState('');
  const [productId, setProductId] = useState('');
  const [externalId, setExternalId] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!provider || !productId || !externalId) return;
    setAdding(true);
    setError(null);
    try {
      await api.externalIds.register(tenantId, { provider, productId, externalId });
      setProvider('');
      setProductId('');
      setExternalId('');
      externalData.reload();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm('Remove external mapping?')) return;
    try {
      await api.externalIds.remove(tenantId, id);
      externalData.reload();
    } catch (err) {
      alert(describeError(err));
    }
  }

  const items = externalData.data?.data ?? [];

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">
          External Mappings <span className="muted">({items.length})</span>
        </h2>
      </div>
      {error && <ErrorBanner error={error} />}
      <form onSubmit={handleRegister} className="flex gap-3 mb-4 items-end">
        <div>
          <label className="label">Provider</label>
          <input className="input" placeholder="e.g. auth0" value={provider} onChange={(e) => setProvider(e.target.value)} />
        </div>
        <div>
          <label className="label">Product ID</label>
          <input className="input" placeholder="UUID or code" value={productId} onChange={(e) => setProductId(e.target.value)} />
        </div>
        <div>
          <label className="label">External ID</label>
          <input className="input" placeholder="Ext tenant ID" value={externalId} onChange={(e) => setExternalId(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={adding || !provider || !productId || !externalId}>
          {adding ? 'Mapping...' : '+ Map External ID'}
        </button>
      </form>

      {externalData.loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <Empty>No external identifier mappings.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Product ID</th>
                <th>External Tenant ID</th>
                <th>Mapped At</th>
                <th className="cell-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.mappingId}>
                  <td className="mono">{item.provider}</td>
                  <td className="mono muted">{item.productId}</td>
                  <td className="mono">{item.externalId}</td>
                  <td className="muted small">{formatDate(item.createdAt)}</td>
                  <td className="cell-actions">
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemove(item.mappingId)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UsageEventsSection({ tenantId }: { tenantId: string }) {
  const usageData = useAsyncData(() => api.usage.list(tenantId, { limit: 10 }), [tenantId]);
  const events = usageData.data?.data ?? [];

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="card-title">
          Recent Usage Events <span className="muted">({usageData.data?.meta?.total ?? events.length})</span>
        </h2>
      </div>
      {usageData.loading ? (
        <LoadingBlock />
      ) : events.length === 0 ? (
        <Empty>No usage recorded for this tenant.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Recorded At</th>
                <th>Product ID</th>
                <th>Event Type</th>
                <th>Quantity</th>
                <th>Idempotency Key</th>
              </tr>
            </thead>
            <tbody>
              {events.map((item) => (
                <tr key={item.usageEventId}>
                  <td className="muted small">{formatDate(item.recordedAt)}</td>
                  <td className="mono muted">{item.productId}</td>
                  <td className="mono">{item.eventType}</td>
                  <td className="mono font-bold">{item.quantity}</td>
                  <td className="mono small muted">{item.idempotencyKey ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}