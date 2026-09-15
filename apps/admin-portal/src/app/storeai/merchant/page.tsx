'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { User, Session } from '@supabase/supabase-js';
import { getCurrentSupabaseUser, getSupabaseClient, signOutSupabase, syncSupabaseToken } from '@/lib/supabase';
import { getStoredToken } from '@/lib/api';
import {
  resolveTenantFromHostOrQuery,
  parseUserSecurityProfile,
  evaluateTenantRbac,
  STOREAI_TENANTS,
  type TenantContext,
  type UserSecurityProfile,
  type RbacEvaluationResult,
} from '@/lib/rbac';
import { SupabaseAuthWidget } from '@/components/SupabaseAuthWidget';
import { NikeMerchantDashboard } from '@/components/NikeMerchantDashboard';
import { Alert } from '@/components/ui';

function StoreAiMerchantContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tenant, setTenant] = useState<TenantContext>(STOREAI_TENANTS.STOREAI_NIKE_01);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Resolve Tenant Context from Host or Query Params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const paramTenant = searchParams.get('tenant');
      const resolved = resolveTenantFromHostOrQuery(window.location.hostname, paramTenant);
      setTenant(resolved);
    }
  }, [searchParams]);

  // 2. Initialize Supabase Auth & JWT state
  useEffect(() => {
    async function initAuth() {
      setLoading(true);
      const { user: supUser, session: supSession } = await getCurrentSupabaseUser();
      setUser(supUser);
      setSession(supSession);
      const currentToken =
        syncSupabaseToken(supSession) ||
        (typeof window !== 'undefined' ? window.localStorage.getItem('cybelinx_api_token') : null);
      setToken(currentToken);
      setLoading(false);
    }

    initAuth();

    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supSession) => {
      setSession(supSession);
      setUser(supSession?.user ?? null);
      const currentToken =
        syncSupabaseToken(supSession) ||
        (typeof window !== 'undefined' ? window.localStorage.getItem('cybelinx_api_token') : null);
      setToken(currentToken);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleTokenChange = (newToken: string | null) => {
    setToken(newToken);
  };

  const handleSignOut = async () => {
    await signOutSupabase();
    setUser(null);
    setSession(null);
    setToken(null);
  };

  const handleSwitchTenantSimulator = (tenantCode: string) => {
    if (STOREAI_TENANTS[tenantCode]) {
      setTenant(STOREAI_TENANTS[tenantCode]);
      router.push(`/storeai/merchant?tenant=${tenantCode.toLowerCase().replace('storeai_', '').replace('_01', '')}`);
    }
  };

  if (loading) {
    return (
      <div className="card card-pad" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '1.2rem', color: '#60a5fa' }}>🔒 Loading StoreAI Merchant Security Context…</div>
      </div>
    );
  }

  // Parse security profile and evaluate RBAC
  const profile: UserSecurityProfile | null = parseUserSecurityProfile(token, user);
  const rbac: RbacEvaluationResult = evaluateTenantRbac(profile, tenant.tenantCode);

  return (
    <div className="stack">
      {/* ------------------------------------------------------------- */}
      {/* CASE 1: Authenticated & RBAC Authorized                       */}
      {/* ------------------------------------------------------------- */}
      {profile && rbac.authorized && (
        <NikeMerchantDashboard
          tenant={tenant}
          profile={profile}
          rbac={rbac}
          onSignOut={handleSignOut}
          onSwitchTenant={handleSwitchTenantSimulator}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* CASE 2: Authenticated BUT RBAC Unauthorized (Access Denied)   */}
      {/* ------------------------------------------------------------- */}
      {profile && !rbac.authorized && (
        <div className="stack">
          <div
            className="card card-pad"
            style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '2.5rem' }}>⛔</span>
              <div>
                <h2 style={{ margin: 0, color: '#ef4444', fontSize: '1.4rem' }}>
                  RBAC Authorization Violation (Access Denied)
                </h2>
                <div className="muted small" style={{ marginTop: '2px' }}>
                  Multi-Tenant Security Scoping Barrier Enforced
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <Alert kind="error">{rbac.reason || 'You do not have permissions for this tenant.'}</Alert>
            </div>

            <div
              style={{
                marginTop: '1rem',
                padding: '12px',
                background: '#0f172a',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.85rem',
              }}
              className="mono"
            >
              <div>Target Tenant: <strong>{tenant.name}</strong> (`{tenant.tenantCode}`)</div>
              <div>Current User: <strong>{profile.email}</strong> (sub: {profile.userId})</div>
              <div>User Memberships: {JSON.stringify(profile.memberships)}</div>
              <div>Required Role: TENANT_ADMIN / PLATFORM_ADMIN for `{tenant.tenantCode}`</div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {profile.memberships.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSwitchTenantSimulator(profile.memberships[0].tenantCode)}
                >
                  🚀 Switch to Authorized Tenant Dashboard ({profile.memberships[0].tenantCode})
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={handleSignOut} style={{ color: '#ef4444' }}>
                Sign Out & Switch User Account
              </button>
            </div>
          </div>

          {/* Quick Sign-In Options */}
          <div className="card card-pad" style={{ marginTop: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Sign In as Authorized Tenant Admin</h3>
            <p className="muted small">
              Sign in with <code>{tenant.adminEmail}</code> or <code>storeai.admin@cybelinx.com</code> to access <strong>{tenant.name}</strong>.
            </p>
            <SupabaseAuthWidget onTokenChange={handleTokenChange} />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CASE 3: Unauthenticated User (Prompt Login for Merchant)     */}
      {/* ------------------------------------------------------------- */}
      {!profile && (
        <div className="stack" style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <div className="card card-pad" style={{ textAlign: 'center', background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(96,165,250,0.3)', color: '#fff' }}>
            <div style={{ fontSize: '3rem' }}>🛍️</div>
            <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem' }}>{tenant.name} Portal</h1>
            <div style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px' }}>
              Tenant Code: <code>{tenant.tenantCode}</code> • Subdomain: <code>{tenant.storeDomain}</code>
            </div>
            <p className="muted small" style={{ marginTop: '0.8rem', color: '#cbd5e1' }}>
              Please sign in with your Supabase Auth merchant admin credentials to evaluate RBAC access.
            </p>
          </div>

          <SupabaseAuthWidget onTokenChange={handleTokenChange} />
        </div>
      )}
    </div>
  );
}

export default function StoreAiMerchantPage() {
  return (
    <Suspense fallback={<div className="card card-pad" style={{ textAlign: 'center', padding: '3rem', color: '#60a5fa' }}>🔒 Loading StoreAI Merchant Portal...</div>}>
      <StoreAiMerchantContent />
    </Suspense>
  );
}
