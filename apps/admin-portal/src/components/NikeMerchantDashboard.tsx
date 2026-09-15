'use client';

import { useState } from 'react';
import type { TenantContext, UserSecurityProfile, RbacEvaluationResult } from '@/lib/rbac';
import { StatusBadge } from './badges';

interface Props {
  tenant: TenantContext;
  profile: UserSecurityProfile;
  rbac: RbacEvaluationResult;
  onSignOut: () => void;
  onSwitchTenant?: (tenantCode: string) => void;
}

export function NikeMerchantDashboard({ tenant, profile, rbac, onSignOut, onSwitchTenant }: Props) {
  const [env, setEnv] = useState<'DEMO' | 'PRODUCTION'>('DEMO');
  const [activeTab, setActiveTab] = useState<'catalog' | 'schema' | 'entitlements' | 'telemetry'>('catalog');

  const activeSchema = env === 'DEMO' ? tenant.demoSchema : tenant.prodSchema;

  // Mock catalog data for Nike Flagship Store
  const NIKE_PRODUCTS = [
    { id: 'NK-001', name: 'Nike Air Max 270 Flyknit', category: 'Footwear', price: '$160.00', stock: 142, status: 'IN_STOCK' },
    { id: 'NK-002', name: 'Nike Pegasus 40 Running Shoes', category: 'Footwear', price: '$130.00', stock: 98, status: 'IN_STOCK' },
    { id: 'NK-003', name: 'Nike Tech Fleece Full-Zip Hoodie', category: 'Apparel', price: '$145.00', stock: 54, status: 'LOW_STOCK' },
    { id: 'NK-004', name: 'Nike Dri-FIT Advantage Shorts', category: 'Apparel', price: '$55.00', stock: 210, status: 'IN_STOCK' },
    { id: 'NK-005', name: 'Nike Vaporfly 3 Racing Shoes', category: 'Elite Footwear', price: '$260.00', stock: 12, status: 'LOW_STOCK' },
  ];

  // Mock Outbox events for Nike Store
  const TELEMETRY_EVENTS = [
    { id: 'evt-nike-901', type: 'STORE_ORDER_CREATED', aggregate: 'Order #NK-9921', timestamp: 'Just now', payload: `{"tenant": "${tenant.tenantCode}", "total": 290.00}` },
    { id: 'evt-nike-902', type: 'INVENTORY_DEDUCTED', aggregate: 'SKU NK-001', timestamp: '2 mins ago', payload: `{"schema": "${activeSchema}", "qty": 2}` },
    { id: 'evt-nike-903', type: 'AI_RECOMMENDATION_SERVED', aggregate: 'User #usr-8812', timestamp: '5 mins ago', payload: '{"model": "storeai-recommend-v2", "latencyMs": 14}' },
  ];

  return (
    <div className="stack" style={{ gap: '1.5rem' }}>
      {/* Top Header Card */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
          border: '1px solid rgba(96, 165, 250, 0.2)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          padding: '1.5rem',
          borderRadius: '12px',
          color: '#f8fafc',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '2rem' }}>⚡</span>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(135deg, #60A5FA, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {tenant.name} Dashboard
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className="mono small" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    {tenant.tenantCode}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>• {tenant.storeDomain}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Environment Switcher */}
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex' }}>
              <button
                type="button"
                className={`btn btn-sm ${env === 'DEMO' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px' }}
                onClick={() => setEnv('DEMO')}
              >
                🧪 DEMO
              </button>
              <button
                type="button"
                className={`btn btn-sm ${env === 'PRODUCTION' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: env === 'PRODUCTION' ? '#10B981' : undefined }}
                onClick={() => setEnv('PRODUCTION')}
              >
                🚀 PRODUCTION
              </button>
            </div>

            <button type="button" className="btn btn-ghost btn-sm" onClick={onSignOut} style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* RBAC Authorization Info Pill */}
        <div
          style={{
            marginTop: '1.2rem',
            padding: '10px 14px',
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
            <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
              Authenticated User: <strong>{profile.email}</strong>
            </span>
            <span style={{ background: rbac.isPlatformAdmin ? '#8B5CF6' : '#3B82F6', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700 }}>
              RBAC: {rbac.userRole || 'TENANT_ADMIN'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {rbac.grantedPermissions.map((perm) => (
              <span key={perm} className="mono" style={{ fontSize: '0.7rem', color: '#4ade80', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                ✓ {perm}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Simulator Quick Switch Banner for Demo Testing */}
      {onSwitchTenant && (
        <div style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
            <strong>StoreAI Tenant Simulator:</strong> Switch active subdomain view to test RBAC context:
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${tenant.tenantCode === 'STOREAI_NIKE_01' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
              onClick={() => onSwitchTenant('STOREAI_NIKE_01')}
            >
              Nike Store (`STOREAI_NIKE_01`)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tenant.tenantCode === 'STOREAI_ADIDAS_01' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
              onClick={() => onSwitchTenant('STOREAI_ADIDAS_01')}
            >
              Adidas Store (`STOREAI_ADIDAS_01`)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tenant.tenantCode === 'STORE_PUMA_01' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
              onClick={() => onSwitchTenant('STORE_PUMA_01')}
            >
              Puma Store (`STORE_PUMA_01`)
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="stats-grid">
        <div className="stat" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="stat-value">2,840</div>
          <div className="stat-label">Active SKUs ({tenant.name})</div>
        </div>
        <div className="stat" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="stat-value" style={{ fontSize: '1.1rem', wordBreak: 'break-all' }}>
            <code>{activeSchema}</code>
          </div>
          <div className="stat-label">PostgreSQL Schema Isolation</div>
        </div>
        <div className="stat" style={{ borderLeft: '4px solid #8B5CF6' }}>
          <div className="stat-value">Active</div>
          <div className="stat-label">Entitlement: AI Recommendations</div>
        </div>
        <div className="stat" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="stat-value">
            <span style={{ color: '#10B981' }}>Connected</span>
          </div>
          <div className="stat-label">Outbox Transactional Relay</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('catalog')}
        >
          👟 Retail Catalog & SKUs
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'schema' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('schema')}
        >
          🗄️ Database Schema Isolation (`{activeSchema}`)
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'entitlements' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('entitlements')}
        >
          ✨ StoreAI Entitlements & API
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'telemetry' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('telemetry')}
        >
          ⚡ Real-time Outbox Telemetry
        </button>
      </div>

      {/* Tab Content 1: Catalog */}
      {activeTab === 'catalog' && (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Nike Flagship Retail Products</h2>
            <div className="hint small">
              Database Search Path: <code>{activeSchema}</code>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product SKU</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock Inventory</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {NIKE_PRODUCTS.map((prod) => (
                  <tr key={prod.id}>
                    <td className="mono bold">{prod.id}</td>
                    <td>
                      <strong>{prod.name}</strong>
                    </td>
                    <td>{prod.category}</td>
                    <td className="bold">{prod.price}</td>
                    <td>{prod.stock} units</td>
                    <td>
                      <StatusBadge value={prod.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab Content 2: Schema Isolation */}
      {activeTab === 'schema' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            PostgreSQL Dynamic DDL Schema Isolation (`SCHEMA_PER_TENANT`)
          </h2>
          <p className="muted small">
            All database read/write queries for tenant <strong>{tenant.tenantCode}</strong> are automatically scoped to its isolated schema.
          </p>

          <div style={{ marginTop: '1rem', background: '#0f172a', color: '#38bdf8', padding: '1rem', borderRadius: '8px' }} className="mono small">
            <div>-- Automatic Cybelinx Middleware SQL execution:</div>
            <div style={{ color: '#4ade80' }}>SET search_path TO {activeSchema}, public;</div>
            <br />
            <div>-- Active PostgreSQL Schema Details:</div>
            <div>Tenant Code: {tenant.tenantCode}</div>
            <div>Tenant ID: {tenant.tenantId}</div>
            <div>Environment: {env}</div>
            <div>Schema Name: {activeSchema}</div>
            <div>Isolation Mode: SCHEMA_PER_TENANT</div>
            <div>Migration Status: Flyway V16__seed_storeai_demo_users_and_env_segregation.sql UP-TO-DATE</div>
          </div>
        </section>
      )}

      {/* Tab Content 3: Entitlements */}
      {activeTab === 'entitlements' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            StoreAI Enterprise Plan Entitlements & Feature Flags
          </h2>
          <div className="stack" style={{ gap: '0.8rem', marginTop: '1rem' }}>
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>AI_RECOMMENDATIONS</strong>
                <div className="muted small">Personalized AI product recommendations powered by StoreAI ML Engine</div>
              </div>
              <StatusBadge value="ACTIVE" />
            </div>

            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>MULTI_CURRENCY_CHECKOUT</strong>
                <div className="muted small">Global localized pricing and multi-currency payment routing</div>
              </div>
              <StatusBadge value="ACTIVE" />
            </div>

            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>CUSTOM_DOMAIN_SSL</strong>
                <div className="muted small">Dedicated SSL binding for custom domain `{tenant.storeDomain}`</div>
              </div>
              <StatusBadge value="ACTIVE" />
            </div>
          </div>
        </section>
      )}

      {/* Tab Content 4: Telemetry Outbox */}
      {activeTab === 'telemetry' && (
        <section className="card card-pad">
          <h2 className="card-title" style={{ marginTop: 0 }}>
            Transactional Outbox Stream (`{tenant.tenantCode}`)
          </h2>
          <p className="muted small">
            Real-time event relay events emitted by StoreAI merchant microservices into Cybelinx Central Outbox Engine.
          </p>

          <div className="stack" style={{ gap: '0.6rem', marginTop: '1rem' }}>
            {TELEMETRY_EVENTS.map((evt) => (
              <div key={evt.id} style={{ padding: '10px 14px', background: '#0f172a', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="mono" style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
                    ⚡ {evt.type}
                  </div>
                  <div className="muted small">{evt.timestamp}</div>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>
                  Aggregate: <code>{evt.aggregate}</code>
                </div>
                <pre className="mono small" style={{ color: '#4ade80', margin: '6px 0 0 0', fontSize: '0.75rem' }}>
                  {evt.payload}
                </pre>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
