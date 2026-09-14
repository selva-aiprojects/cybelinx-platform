'use client';

import { useState } from 'react';
import {
  getStoredToken,
  resolveApiBaseUrl,
  storeSettings,
  DEFAULT_API_BASE_URL,
} from '@/lib/api';
import { Alert } from '@/components/ui';

const KNOWN_SERVICES: Array<[string, string]> = [
  ['Control plane API', `${DEFAULT_API_BASE_URL}/health`],
  ['Admin portal', '/api/health'],
];

export default function SettingsPage() {
  const [token, setToken] = useState(() => getStoredToken() ?? '');
  const [baseUrl, setBaseUrl] = useState(() => resolveApiBaseUrl());
  const [saved, setSaved] = useState(false);

  async function testConnection() {
    try {
      const res = await fetch(`${resolveApiBaseUrl()}/health`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { status?: string };
      window.alert(`API reachable (status ${res.status}) — health ${body.status ?? 'ok'}`);
    } catch (error) {
      window.alert(`API unreachable via ${resolveApiBaseUrl()}: ${(error as Error).message}`);
    }
  }

  function save() {
    storeSettings(token.trim() || null, baseUrl.trim() || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="stack">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Connect the Admin Portal to the control plane API and mint a development token.</p>
        </div>
      </div>

      <section className="card card-pad">
        <h2 className="card-title" style={{ marginTop: 0 }}>
          API endpoint
        </h2>
        <div className="field" style={{ marginTop: '1rem' }}>
          <label className="label" htmlFor="base-url">
            API base URL
          </label>
          <input
            id="base-url"
            className="input"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder={DEFAULT_API_BASE_URL}
          />
          <div className="hint">
            Defaults to <code>{DEFAULT_API_BASE_URL}</code> (Next.js env{' '}
            <code>NEXT_PUBLIC_API_BASE_URL</code>) when left blank. On Vercel preview, point this
            at your reachable central-api instance — the API is not deployed on Vercel.
          </div>
        </div>
        <div className="flex">
          <button type="button" className="btn" onClick={testConnection}>
            Test connection
          </button>
        </div>
      </section>

      <section className="card card-pad">
        <h2 className="card-title" style={{ marginTop: 0 }}>
          API token
        </h2>
        <div className="field" style={{ marginTop: '1rem' }}>
          <label className="label" htmlFor="api-token">
            Development JWT (Bearer)
          </label>
          <textarea
            id="api-token"
            className="textarea"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…"
            style={{ fontFamily: 'var(--mono)' }}
          />
          <div className="hint">
            Stored locally in your browser (localStorage) and sent as{' '}
            <code>Authorization: Bearer &lt;token&gt;</code>.
          </div>
        </div>
        <div className="flex">
          <button type="button" className="btn btn-primary" onClick={save}>
            Save settings
          </button>
          {saved && <Alert kind="success">Settings saved.</Alert>}
        </div>
      </section>

      <section className="card card-pad">
        <h2 className="card-title" style={{ marginTop: 0 }}>
          Minting a development token
        </h2>
        <p className="muted">
          The control plane signs HS256 tokens with the raw bytes of <code>IDP_JWT_SECRET</code>.
          Create one with <code>scripts/mint-dev-jwt.mjs</code>, then paste it above.
        </p>
        <pre
          className="mono small"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.9rem 1rem',
            overflowX: 'auto',
          }}
        >
{`# 1. Pick a secret (>= 32 chars) and set it on the API (application.yml / env)
set IDP_JWT_SECRET=change-me-development-secret-key-1234

# 2. (Re)start the API so the HMAC verifier picks it up
npm run dev:api

# 3. Mint a token for the seeded dev admin (provider "generic")
npm run mint:jwt -- --sub seed-dev-admin-0001 --email dev.admin@cybelinx.test
`}
        </pre>
        <p className="hint">
          The dev admin <code>seed-dev-admin-0001</code> is created by migration{' '}
          <code>V6__seed_reference_data.sql</code> and carries the{' '}
          <code>CYBELINX_PLATFORM_ADMIN</code> role, which bypasses permission checks.
        </p>
      </section>

      <section className="card card-pad">
        <h2 className="card-title" style={{ marginTop: 0 }}>
          Health endpoints
        </h2>
        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
          {KNOWN_SERVICES.map(([name, path]) => (
            <li key={path} className="muted small">
              <strong className="mono">{name}</strong> <code>{path}</code>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}