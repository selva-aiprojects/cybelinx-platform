'use client';

import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  getSupabaseClient,
  getCurrentSupabaseUser,
  signOutSupabase,
  syncSupabaseToken,
} from '@/lib/supabase';
import { Alert } from './ui';

export function SupabaseAuthWidget({ onTokenChange }: { onTokenChange?: (token: string | null) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');
  const [msg, setMsg] = useState<{ kind: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      const { user, session } = await getCurrentSupabaseUser();
      setUser(user);
      setSession(session);
      const token = syncSupabaseToken(session);
      if (onTokenChange && token) onTokenChange(token);
      setLoading(false);
    }
    init();

    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      const token = syncSupabaseToken(session);
      if (onTokenChange) onTokenChange(token);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [onTokenChange]);

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setMsg({ kind: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setSubmitting(true);
    setMsg(null);

    const supabase = getSupabaseClient();

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
        });
        if (error) throw error;
        setMsg({ kind: 'success', text: 'Check your email for the magic sign-in link!' });
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setMsg({
          kind: 'success',
          text: data.session
            ? 'Account created and signed in successfully!'
            : 'Confirmation email sent! Please verify your inbox.',
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setMsg({ kind: 'success', text: 'Signed in successfully via Supabase Auth!' });
      }
    } catch (err: unknown) {
      setMsg({ kind: 'error', text: (err as Error).message || 'Authentication failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await signOutSupabase();
    setUser(null);
    setSession(null);
    if (onTokenChange) onTokenChange(null);
    setMsg({ kind: 'info', text: 'Signed out of Supabase Auth session.' });
  }

  if (loading) {
    return <div className="hint">Initializing Supabase Auth…</div>;
  }

  if (user && session) {
    return (
      <div className="card card-pad" style={{ background: 'var(--card-bg, #f8fafc)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
              <strong style={{ fontSize: '0.95rem' }}>Supabase Auth Active</strong>
            </div>
            <div className="muted small" style={{ marginTop: 4 }}>
              Logged in as: <code>{user.email}</code> (sub: {user.id})
            </div>
            <div className="hint small" style={{ marginTop: 2 }}>
              JWT Bearer token synchronized to localStorage key <code>cybelinx_api_token</code>.
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
        {msg && (
          <div style={{ marginTop: '0.8rem' }}>
            <Alert kind={msg.kind}>{msg.text}</Alert>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card card-pad" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.2rem' }}>⚡</span> Supabase Auth Login
      </h3>
      <p className="muted small" style={{ marginTop: '0.2rem' }}>
        Sign in with your Supabase credentials to obtain a valid OIDC JWT token.
      </p>

      {msg && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert kind={msg.kind}>{msg.text}</Alert>
        </div>
      )}

      <form onSubmit={handleAuth} className="stack" style={{ gap: '0.8rem', marginTop: '0.8rem' }}>
        <div className="field">
          <label className="label" htmlFor="supabase-email">Email</label>
          <input
            id="supabase-email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@hospital.com"
            required
          />
        </div>

        {mode !== 'magic' && (
          <div className="field">
            <label className="label" htmlFor="supabase-password">Password</label>
            <input
              id="supabase-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        )}

        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Authenticating…' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Magic Link'}
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
            {mode !== 'signin' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('signin')}>
                Sign In Mode
              </button>
            )}
            {mode !== 'signup' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('signup')}>
                Sign Up Mode
              </button>
            )}
            {mode !== 'magic' && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('magic')}>
                Magic Link
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
