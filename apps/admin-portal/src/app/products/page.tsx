'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { ProductStatus } from '@/lib/types';
import { useAsyncData, ErrorBanner, LoadingBlock, Empty, describeError } from '@/components/ui';
import { StatusBadge, formatDate } from '@/components/badges';
import { Modal } from '@/components/modal';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DEPRECATED', label: 'Deprecated' },
  { value: 'DISABLED', label: 'Disabled' },
];

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<string | null>(null);

  const fetcher = useCallback(
    () => api.products.list({ page, limit: PAGE_SIZE, search: search || undefined, status: status || undefined }),
    [page, search, status],
  );
  const { data, error, loading, reload } = useAsyncData(fetcher, [fetcher]);

  const pages = useMemo(() => Math.max(1, data?.meta.totalPages ?? 1), [data]);

  async function changeStatus(productId: string, next: ProductStatus) {
    setActionError(null);
    setActionDone(null);
    try {
      const result = await api.products.setStatus(productId, next);
      setActionDone(`${result.productId} → ${result.status}`);
      reload();
    } catch (err) {
      setActionError(describeError(err));
    }
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Product registry — catalog, versions and plans for the Cybelinx suite.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + New product
        </button>
      </div>

      {actionError && <ErrorBanner error={actionError} />}
      {actionDone && <div className="alert alert-success">Updated: {actionDone}</div>}

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
          <select
            className="select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && <ErrorBanner error={error} />}
        {loading && !data && <LoadingBlock />}
        {data && data.data.length === 0 && (
          <Empty>No products match. Create one to get started.</Empty>
        )}
        {data && data.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Status</th>
                  <th>Current version</th>
                  <th>Created</th>
                  <th className="cell-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((product) => (
                  <tr key={product.productId}>
                    <td>
                      <Link href={`/products/${product.productId}`} className="row-link">
                        <strong>{product.productCode}</strong>
                        <div className="faint small">{product.name}</div>
                      </Link>
                    </td>
                    <td>
                      <StatusBadge value={product.status} />
                    </td>
                    <td className="mono small muted">{product.currentVersionId ? 'current version set' : '—'}</td>
                    <td className="muted small">{formatDate(product.createdAt)}</td>
                    <td className="cell-actions">
                      <Link href={`/products/${product.productId}`} className="btn btn-ghost btn-sm">
                        Open
                      </Link>
                      {product.status !== 'ACTIVE' && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => changeStatus(product.productId, 'ACTIVE')}
                        >
                          Activate
                        </button>
                      )}
                      {product.status !== 'DEPRECATED' && product.status !== 'DISABLED' && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => changeStatus(product.productId, 'DEPRECATED')}
                        >
                          Deprecate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
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
              Page {page} / {pages} · {data.meta.total} total
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
        <ProductCreateModal onClose={() => setCreateOpen(false)} onCreated={() => reload()} />
      )}
    </div>
  );
}

function ProductCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [productCode, setProductCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.products.create({ productCode, name, description: description || undefined });
      onCreated();
      onClose();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New product" onClose={onClose}>
      {error && <ErrorBanner error={error} />}
      <div className="field">
        <label className="label" htmlFor="product-code">
          Product code
        </label>
        <input
          id="product-code"
          className="input mono"
          value={productCode}
          onChange={(event) => setProductCode(event.target.value.toUpperCase())}
          placeholder="JIOPLIX"
        />
        <div className="hint">Uppercase letters, digits, underscores — 2 to 64 chars.</div>
      </div>
      <div className="field">
        <label className="label" htmlFor="product-name">
          Display name
        </label>
        <input
          id="product-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Jioplix"
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="product-description">
          Description
        </label>
        <textarea
          id="product-description"
          className="textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What does this product do?"
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={submitting || !productCode || !name}
          onClick={submit}
        >
          {submitting ? 'Creating…' : 'Create product'}
        </button>
      </div>
    </Modal>
  );
}