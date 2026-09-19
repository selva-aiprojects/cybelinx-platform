'use client';

import { useState } from 'react';
import {
  getStoredToken,
  resolveApiBaseUrl,
  storeSettings,
  DEFAULT_API_BASE_URL,
} from '@/lib/api';
import { Alert } from '@/components/ui';
import { AdminLoginWidget } from '@/components/AdminLoginWidget';
import { SupabaseAuthWidget } from '@/components/SupabaseAuthWidget';

const KNOWN_SERVICES: Array<[string, string]> = [
  ['Control plane API', `${DEFAULT_API_BASE_URL || '<configured base>'}/health`],
];

export default function SettingsPage() {
  const [token, setToken] = useState(() => getStoredToken() ?? '');
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const [baseUrl, setBaseUrl] = useState(() => {
    const active = resolveApiBaseUrl();
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && (active.startsWith('http://localhost') || active.startsWith('http://127.0.0.1'))) {
      return '/api/v1';
    }
    return active;
  });
  const [saved, setSaved] = useState(false);
  const hasMixedContentRisk = isHttps && baseUrl.startsWith('http://');

  async function testConnection() {
    try {
      const res = await fetch(`${resolveApiBaseUrl()}/health`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { status?: string; mode?: string };
      window.alert(`API reachable (status ${res.status}) — health ${body.status ?? 'ok'}${body.mode ? ` [${body.mode}]` : ''}`);
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
          <p>Connect the Admin Portal to the control plane API.</p>
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
          <div className="flex" style={{ marginTop: '0.5rem', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? '')
              }
            >
              Reset to default
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setBaseUrl('http://localhost:3001/api/v1')}
            >
              Use Local Spring Boot (localhost:3001)
            </button>
          </div>
          {hasMixedContentRisk && (
            <div style={{ marginTop: '0.5rem' }}>
              <Alert kind="info">
                You are accessing the portal over HTTPS ({typeof window !== 'undefined' ? window.location.origin : ''}). Browsers block requests to insecure HTTP endpoints (Mixed Content). Use <code>/api/v1</code> for the cloud API or an HTTPS tunnel if connecting to a remote backend.
              </Alert>
            </div>
          )}
          <div className="hint" style={{ marginTop: '0.5rem' }}>
            Defaults to <code>{DEFAULT_API_BASE_URL || 'NEXT_PUBLIC_API_BASE_URL (unset)'}</code>. Configure the
            control plane URL via <code>NEXT_PUBLIC_API_BASE_URL</code>, or set it here to override.
          </div>
        </div>
        <div className="flex">
          <button type="button" className="btn" onClick={testConnection}>
            Test connection
          </button>
        </div>
      </section>

      <AdminLoginWidget onTokenChange={(t) => setToken(t ?? '')} />

      <SupabaseAuthWidget onTokenChange={(t) => setToken(t ?? '')} />

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
            style={{ fontFamily: 'var(--mono)', minHeight: 90 }}
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