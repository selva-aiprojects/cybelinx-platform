'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { api, ProductOnboardingDefinition } from '@/lib/api';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { StatusBadge, formatDate } from '@/components/badges';
import { Modal } from '@/components/modal';

const PAGE_SIZE = 20;

const KNOWN_REGIONS = ['eu-west-1', 'us-east-1', 'ap-south-1'];

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const fetcher = useCallback(
    () => api.tenants.list({ page, limit: PAGE_SIZE, search: search || undefined }),
    [page, search],
  );
  const { data: rawData, error, loading, reload } = useAsyncData(fetcher, [fetcher]);
  const data = rawData;
  const displayData = data;
  const pages = useMemo(() => Math.max(1, displayData?.meta.totalPages ?? 1), [displayData]);

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Tenants</h1>
          <p>Multi-tenant workspaces — each tenant is provisioned its own resources per product.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + New tenant
        </button>
      </div>

      <section className="card">
        <div className="card-pad search-row">
          <input
            className="input"
            style={{ flex: 1, minWidth: 220 }}
            placeholder="Search by code or name…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {error && <ErrorBanner error={error} />}
        {loading && !displayData && <LoadingBlock />}
        {displayData && displayData.data.length === 0 && (
          <Empty>No tenants yet. Create one to get started.</Empty>
        )}
        {displayData && displayData.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th>Region</th>
                  <th>Country</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {displayData.data.map((tenant) => (
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
                    <td className="mono small muted">{tenant.regionCode ?? '—'}</td>
                    <td className="mono small muted">{tenant.country ?? '—'}</td>
                    <td className="muted small">{formatDate(tenant.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {displayData && (
          <div className="pager">
            <button
              type="button"
              className="btn btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Prev
            </button>
            <span>
              Page {page} / {pages} · {displayData.meta.total} total
            </span>
            <button
              type="button"
              className="btn btn-sm"
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </section>

      {createOpen && (
        <TenantCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            reload();
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

function TenantCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const router = useRouter();
  const [tenantCode, setTenantCode] = useState('');
  const [name, setName] = useState('');
  const [regionCode, setRegionCode] = useState('ap-south-1');
  const [country, setCountry] = useState('IN');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [contactEmail, setContactEmail] = useState('');
  const [productCode, setProductCode] = useState('STOREAI');
  const [planCode, setPlanCode] = useState('STOREAI_ENTERPRISE');
  const [attachProduct, setAttachProduct] = useState(true);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductCode, setCustomProductCode] = useState('');
  const [definitions, setDefinitions] = useState<ProductOnboardingDefinition[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const defs = await api.onboarding.listDefinitions();
        if (Array.isArray(defs) && defs.length > 0) {
          setDefinitions(defs);
          const defaultDef = defs.find((d) => d.productCode === 'STOREAI') || defs[0];
          setProductCode(defaultDef.productCode);
          setPlanCode(defaultDef.subscription.defaultPlanCode || defaultDef.subscription.availablePlans[0] || 'ENTERPRISE');
        }
      } catch (e) {
        console.error('Failed to load product definitions:', e);
      }
    }
    loadProducts();
  }, []);

  const activeDef = definitions.find((d) => d.productCode === productCode);
  const availablePlans = activeDef?.subscription.availablePlans || ['ENTERPRISE', 'PROFESSIONAL', 'STARTER'];

  function handleProductChange(code: string) {
    if (code === '__CUSTOM__') {
      setIsCustomProduct(true);
      setProductCode('');
      setPlanCode('ENTERPRISE');
    } else {
      setIsCustomProduct(false);
      setProductCode(code);
      const def = definitions.find((d) => d.productCode === code);
      if (def) {
        setPlanCode(def.subscription.defaultPlanCode || def.subscription.availablePlans[0] || 'ENTERPRISE');
      }
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const targetProduct = isCustomProduct ? customProductCode.trim().toUpperCase() : productCode.trim().toUpperCase();
      // When attaching a product, use the full onboarding pipeline so email,
      // audit log, outbox events, and tenant-admin provisioning all fire.
      if (attachProduct && targetProduct) {
        const resp = await api.onboarding.execute({
          productCode: targetProduct,
          externalId: tenantCode.trim().toUpperCase(),
          tenantCode: tenantCode.trim().toUpperCase(),
          tenantName: name.trim(),
          planCode: planCode.trim().toUpperCase() || undefined,
          regionCode: regionCode || undefined,
          country: country || undefined,
          timezone: timezone || undefined,
          adminEmail: contactEmail.trim() || undefined,
          isolationMode: 'SCHEMA_PER_TENANT',
          environment: 'PRODUCTION',
        });
        onCreated();
        router.push(`/tenants/${resp.tenantId}`);
      } else {
        const result = await api.tenants.create({
          tenantCode,
          name,
          regionCode: regionCode || undefined,
          country: country || undefined,
          timezone: timezone || undefined,
          contactEmail: contactEmail.trim() || undefined,
        });
        onCreated();
        router.push(`/tenants/${result.tenant.tenantId}`);
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New tenant" onClose={onClose}>
      {error && <ErrorBanner error={error} />}
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="tenant-code">
            Tenant code
          </label>
          <input
            id="tenant-code"
            className="input mono"
            value={tenantCode}
            onChange={(event) => setTenantCode(event.target.value.toUpperCase())}
            placeholder="TEXTRONIC"
          />
          <div className="hint">Uppercase letters, digits, underscores — 2 to 64 chars.</div>
        </div>
        <div className="field">
          <label className="label" htmlFor="tenant-name">
            Display name
          </label>
          <input
            id="tenant-name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Textronic Ltd"
          />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label className="label" htmlFor="tenant-region">
            Region
          </label>
          <select
            id="tenant-region"
            className="select"
            value={regionCode}
            onChange={(event) => setRegionCode(event.target.value)}
          >
            <option value="">— none —</option>
            {KNOWN_REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="tenant-country">
            Country (ISO-3166)
          </label>
          <input
            id="tenant-country"
            className="input mono"
            value={country}
            onChange={(event) => setCountry(event.target.value.toUpperCase())}
            placeholder="IN"
            maxLength={2}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="tenant-timezone">
            Timezone
          </label>
          <input
            id="tenant-timezone"
            className="input"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            placeholder="Asia/Kolkata"
          />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="tenant-contact-email">
          Contact / Admin Email
        </label>
        <input
          id="tenant-contact-email"
          type="email"
          className="input"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="admin@textronic.com"
        />
        <div className="hint">Used for welcome email, credentials, and tenant admin provisioning.</div>
      </div>

      <div className="field" style={{ marginTop: '0.5rem' }}>
        <label>
          <input
            type="checkbox"
            checked={attachProduct}
            onChange={(event) => setAttachProduct(event.target.checked)}
            style={{ marginRight: '0.5rem' }}
          />
          <span className="small">Attach a product on creation (triggers automated provisioning)</span>
        </label>
      </div>

      {attachProduct && (
        <div className="field-row">
          <div className="field" style={{ flex: 1.2 }}>
            <label className="label" htmlFor="tenant-product-select">
              Target Product
            </label>
            <select
              id="tenant-product-select"
              className="select"
              value={isCustomProduct ? '__CUSTOM__' : productCode}
              onChange={(e) => handleProductChange(e.target.value)}
            >
              {definitions.map((def) => (
                <option key={def.productCode} value={def.productCode}>
                  {def.displayName} ({def.productCode})
                </option>
              ))}
              <option value="__CUSTOM__">— Other / Custom Product Code —</option>
            </select>
            {isCustomProduct && (
              <input
                id="tenant-product-custom"
                className="input mono"
                style={{ marginTop: '0.4rem' }}
                value={customProductCode}
                onChange={(e) => setCustomProductCode(e.target.value.toUpperCase())}
                placeholder="e.g. STOREAI, JIOPLIX"
              />
            )}
            <div className="hint">The registered SaaS product this tenant will belong to.</div>
          </div>
          <div className="field" style={{ flex: 0.8 }}>
            <label className="label" htmlFor="tenant-plan-select">
              Plan
            </label>
            {isCustomProduct ? (
              <input
                id="tenant-plan"
                className="input mono"
                value={planCode}
                onChange={(event) => setPlanCode(event.target.value.toUpperCase())}
                placeholder="ENTERPRISE"
              />
            ) : (
              <select
                id="tenant-plan-select"
                className="select"
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
              >
                {availablePlans.map((plan: string) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            )}
            <div className="hint">Subscription tier for the tenant.</div>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" disabled={submitting || !tenantCode || !name} onClick={submit}>
          {submitting ? 'Creating…' : 'Create tenant'}
        </button>
      </div>
    </Modal>
  );
}