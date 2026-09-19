'use client';

import { useState } from 'react';
import { api, clearStoredToken, storeSettings, isApiClientError } from '@/lib/api';
import type { LoginResponse } from '@/lib/types';
import { Alert } from './ui';

/**
 * Admin Portal email+password login against the Spring control-plane
 * {@code POST /api/v1/auth/login} endpoint. The returned HS256 JWT is stored in
 * localStorage under {@code cybelinx_api_token} (the same key every other API
 * call reads), so logging in here immediately authorizes the whole portal.
 */
export function AdminLoginWidget({ onTokenChange }: { onTokenChange?: (token: string | null) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [login, setLogin] = useState<LoginResponse | null>(null);
  const [msg, setMsg] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setMsg({ kind: 'error', text: 'Please enter your email address.' });
      return;
    }
    setSubmitting(true);
    setMsg(null);

    try {
      const response = await api.auth.login({ email: email.trim(), password });
      storeSettings(response.token, null);
      setLogin(response);
      setPassword('');
      setMsg({
        kind: 'success',
        text: `Signed in as ${response.email}${response.roles.length ? ` · ${response.roles.join(', ')}` : ''}. Token expires ${new Date(response.expiresAt).toLocaleString()}.`,
      });
      if (onTokenChange) onTokenChange(response.token);
    } catch (error: unknown) {
      const message = isApiClientError(error) && error.status === 0
        ? error.message
        : 'Sign-in failed. Check your credentials, the API base URL, and that IDP_JWT_SECRET is configured.';
      setMsg({ kind: 'error', text: message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleLogout() {
    clearStoredToken();
    setLogin(null);
    setMsg({ kind: 'info', text: 'Signed out. The local API token has been cleared.' });
    if (onTokenChange) onTokenChange(null);
  }

  return (
    <section className="card card-pad">
      <h2 className="card-title" style={{ marginTop: 0 }}>
        Sign in with email + password
      </h2>
      <p className="muted small" style={{ marginTop: '0.2rem', marginBottom: '0.8rem' }}>
        Authenticate directly with the control plane ({'POST /api/v1/auth/login'}). On first
        sign-in the documented bootstrap password is accepted once and stored as a BCrypt hash.
      </p>

      {msg && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert kind={msg.kind}>{msg.text}</Alert>
        </div>
      )}

      {login ? (
        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="muted small">
            Signed in as <code>{login.email}</code> · roles:{' '}
            <code>{login.roles.join(', ') || 'none'}</code>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="stack" style={{ gap: '0.8rem' }}>
          <div className="field">
            <label className="label" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dev.admin@cybelinx.test"
              autoComplete="email"
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="flex">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}