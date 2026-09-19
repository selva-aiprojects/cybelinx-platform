'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  ProductOnboardingDefinition,
  GenericOnboardRequest,
  GenericOnboardResponse,
  GenericOnboardStatusView,
} from '@/lib/types';
import { useProvisioningPolling } from '@/hooks/useProvisioningPolling';

export default function UnifiedOnboardingPage() {
  const [definitions, setDefinitions] = useState<ProductOnboardingDefinition[]>([]);
  const [selectedProductCode, setSelectedProductCode] = useState<string>('JIOPLIX');
  const [activeTab, setActiveTab] = useState<'wizard' | 'lookup' | 'definitions'>('wizard');

  // Form State
  const [externalId, setExternalId] = useState<string>('JIOPLIX_NEXUS');
  const [tenantCode, setTenantCode] = useState<string>('JIOPLIX_APOLLO_01');
  const [tenantName, setTenantName] = useState<string>('Apollo Multispecialty Hospital');
  const [planCode, setPlanCode] = useState<string>('JIOPLIX_ENTERPRISE');
  const [environment, setEnvironment] = useState<string>('DEVELOPMENT');
  const [isolationMode, setIsolationMode] = useState<string>('SCHEMA_PER_TENANT');
  const [schemaName, setSchemaName] = useState<string>('jioplix_apollo_01');
  const [regionCode] = useState<string>('us-east-1');
  
  // Dynamic custom fields keyed by field.key
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({
    hospitalName: 'Apollo Multispecialty Hospital',
    domain: 'https://apollo.jioplix.com',
    contactEmail: 'admin@apollo.org',
    country: 'India',
    timezone: 'Asia/Kolkata',
  });

  // Provisioning Execution State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [provisionResponse, setProvisionResponse] = useState<GenericOnboardResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Poll provisioning status after an async execute that leaves the resource non-terminal.
  const provisioningActive =
    provisionResponse != null &&
    provisionResponse.status === 'SUCCESS' &&
    !['SUCCEEDED', 'ACTIVE', 'FAILED', 'DEACTIVATED', 'DELETED', 'PROVISIONED'].includes(
      String(provisionResponse.resourceStatus || '').toUpperCase(),
    );
  const { status: polledStatus, pollError: pollStatusError, active: polling } = useProvisioningPolling(
    provisioningActive,
    provisionResponse?.productCode,
    provisionResponse?.externalId,
  );

  // Status Lookup State
  const [lookupProductCode, setLookupProductCode] = useState<string>('JIOPLIX');
  const [lookupExternalId, setLookupExternalId] = useState<string>('JIOPLIX_NEXUS');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupResult, setLookupResult] = useState<GenericOnboardStatusView | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Load live definitions from Central API on mount
  useEffect(() => {
    async function loadDefinitions() {
      try {
        const liveDefs = await api.onboarding.listDefinitions();
        if (Array.isArray(liveDefs) && liveDefs.length > 0) {
          setDefinitions(liveDefs);
        }
      } catch {
        setDefinitions([]);
      }
    }
    loadDefinitions();
  }, []);

  const activeDefinition =
    definitions.find((d) => d.productCode === selectedProductCode) ?? definitions[0];

  // When selected product changes, reset defaults matching that product's definition
  const handleSelectProduct = (code: string) => {
    setSelectedProductCode(code);
    const def = definitions.find((d) => d.productCode === code);
    if (!def) return;

    setPlanCode(def.subscription.defaultPlanCode);
    setIsolationMode(def.resource.defaultIsolationMode);
    
    // Seed sensible product-specific defaults
    if (code === 'JIOPLIX') {
      setExternalId('JIOPLIX_NEXUS');
      setTenantCode('JIOPLIX_APOLLO_01');
      setTenantName('Apollo Multispecialty Hospital');
      setSchemaName('jioplix_apollo_01');
      setFieldValues({
        hospitalName: 'Apollo Multispecialty Hospital',
        domain: 'https://apollo.jioplix.com',
        contactEmail: 'admin@apollo.org',
        country: 'India',
        timezone: 'Asia/Kolkata',
      });
    } else if (code === 'STOREAI') {
      setExternalId('STOREAI_NEXUS');
      setTenantCode('STORE_NIKE_01');
      setTenantName('Nike Flagship Store');
      setSchemaName('storeai_nike_01');
      setFieldValues({
        storeName: 'Nike Flagship Store',
        domain: 'https://nike.storeai.com',
        contactEmail: 'merchant@nike.com',
        adminUserId: 'usr_nike_owner_01',
      });
    } else if (code === 'LIMS') {
      setExternalId('LAB_METROPOLIS_01');
      setTenantCode('LAB_METRO_01');
      setTenantName('Metropolis Central Diagnostics');
      setSchemaName('lims_metro_01');
      setFieldValues({
        labName: 'Metropolis Central Diagnostics',
        domain: 'https://lab.metropolis.com',
        contactEmail: 'director@metropolis.com',
      });
    }
    setProvisionResponse(null);
    setErrorMessage(null);
  };

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  // Submit Generic Onboarding
  const handleExecuteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setProvisionResponse(null);

    const payload: GenericOnboardRequest = {
      productCode: selectedProductCode,
      externalId: externalId.trim(),
      tenantCode: tenantCode.trim().toUpperCase(),
      tenantName: tenantName.trim(),
      planCode,
      isolationMode,
      environment,
      schemaName: schemaName.trim() || undefined,
      regionCode,
      adminEmail: fieldValues.contactEmail || fieldValues.merchantEmail || undefined,
      domain: fieldValues.domain || undefined,
      adminUserId: fieldValues.adminUserId || undefined,
      customFields: fieldValues,
    };

    try {
      const resp = await api.onboarding.execute(payload);
      setProvisionResponse(resp);
    } catch (err: unknown) {
      const errorStr = err instanceof Error ? err.message : String(err);
      setErrorMessage(errorStr);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Lookup
  const handleLookupStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupExternalId.trim()) return;
    setIsLookingUp(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const res = await api.onboarding.getStatus(lookupProductCode, lookupExternalId.trim());
      setLookupResult(res);
    } catch (err: unknown) {
      const errorStr = err instanceof Error ? err.message : String(err);
      setLookupError(errorStr);
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Unified Product Onboarding
            </h1>
            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
              Generic Engine
            </span>
          </div>
          <p style={{ color: '#64748b', margin: '6px 0 0 0', fontSize: '0.95rem' }}>
            Single, definition-driven onboarding workflow powered by <code>ProductOnboardingDefinition</code> &amp; Product Adapters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/onboarding/jioplix"
            style={{ padding: '7px 14px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid #cbd5e1', color: '#475569', textDecoration: 'none', background: '#fff' }}
          >
            🏥 Jioplix View
          </Link>
          <Link
            href="/onboarding/storeai"
            style={{ padding: '7px 14px', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid #cbd5e1', color: '#475569', textDecoration: 'none', background: '#fff' }}
          >
            🛍️ StoreAI View
          </Link>
        </div>
      </div>

      {/* Tabs */}
      {definitions.length === 0 && (
        <div
          className="card card-pad"
          style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#64748b',
            border: '1px dashed #cbd5e1',
            borderRadius: '10px',
          }}
        >
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>📦 Loading Product Onboarding Definitions…</div>
          <div style={{ fontSize: '0.85rem' }}>
            Fetching registered product definitions from the control plane API.
          </div>
        </div>
      )}

      {definitions.length > 0 && (
      <>
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px', gap: '24px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('wizard')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'wizard' ? 700 : 500,
            color: activeTab === 'wizard' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'wizard' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          🚀 Onboarding Wizard
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('lookup')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'lookup' ? 700 : 500,
            color: activeTab === 'lookup' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'lookup' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          🔍 Tenant Status Inspector
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('definitions')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            fontWeight: activeTab === 'definitions' ? 700 : 500,
            color: activeTab === 'definitions' ? '#2563eb' : '#64748b',
            borderBottom: activeTab === 'definitions' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '0.95rem',
          }}
        >
          📋 Registered Product Definitions ({definitions.length})
        </button>
      </div>

      {/* TAB 1: ONBOARDING WIZARD */}
      {activeTab === 'wizard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px' }}>
          <div>
            {/* Step 1: Product Selector */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ background: '#2563eb', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</span>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Select Platform Product Workload</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {definitions.map((def) => {
                  const isSelected = def.productCode === selectedProductCode;
                  const icons: Record<string, string> = {
                    JIOPLIX: '🏥',
                    STOREAI: '🛍️',
                    LIMS: '🧪',
                  };
                  return (
                    <div
                      key={def.productCode}
                      onClick={() => handleSelectProduct(def.productCode)}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                        background: isSelected ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{icons[def.productCode] || '📦'}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isSelected ? '#bfdbfe' : '#e2e8f0', color: isSelected ? '#1e40af' : '#475569' }}>
                          v{def.version}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{def.displayName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', lineHeight: '1.3' }}>
                        {def.description.length > 70 ? `${def.description.substring(0, 70)}...` : def.description}
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#475569', display: 'flex', gap: '8px' }}>
                        <span>Code: <code>{def.productCode}</code></span>
                        <span>Schema: <code>{def.resource.schemaPrefix}*</code></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2 & 3: Dynamic Onboarding Form */}
            <form onSubmit={handleExecuteOnboarding}>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ background: '#2563eb', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</span>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                    Tenant Identity &amp; External Mapping
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      {activeDefinition.tenantIdentifier.label} *
                    </label>
                    <input
                      type="text"
                      required
                      value={externalId}
                      onChange={(e) => setExternalId(e.target.value)}
                      placeholder={activeDefinition.tenantIdentifier.placeholder}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      {activeDefinition.tenantIdentifier.hint}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      Canonical Tenant Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={tenantCode}
                      onChange={(e) => setTenantCode(e.target.value)}
                      placeholder="e.g. JIOPLIX_APOLLO_01"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      Unique identifier in Cybelinx central tenant catalog
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                    Customer / Organization Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="e.g. Apollo Healthcare Foundation"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Step 3: Dynamic Custom Fields from Definition */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ background: '#2563eb', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>3</span>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                    {activeDefinition.displayName} Dynamic Attributes
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {activeDefinition.fields.map((field) => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                        {field.label} {field.required && '*'}
                      </label>
                      <input
                        type={field.type === 'url' ? 'url' : field.type === 'email' ? 'email' : 'text'}
                        required={field.required}
                        value={fieldValues[field.key] ?? ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                      {field.hint && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>{field.hint}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 4: Subscription Plan & Schema Isolation */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ background: '#2563eb', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>4</span>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                    Plan &amp; Infrastructure Isolation
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      Subscription Plan
                    </label>
                    <select
                      value={planCode}
                      onChange={(e) => setPlanCode(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                    >
                      {activeDefinition.subscription.availablePlans.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      Isolation Mode
                    </label>
                    <select
                      value={isolationMode}
                      onChange={(e) => setIsolationMode(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                    >
                      {activeDefinition.resource.supportedIsolationModes.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      Environment
                    </label>
                    <select
                      value={environment}
                      onChange={(e) => setEnvironment(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                    >
                      <option value="DEVELOPMENT">DEVELOPMENT</option>
                      <option value="STAGING">STAGING</option>
                      <option value="PRODUCTION">PRODUCTION</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>
                      Dedicated Schema Name
                    </label>
                    <input
                      type="text"
                      value={schemaName}
                      onChange={(e) => setSchemaName(e.target.value)}
                      placeholder={`${activeDefinition.resource.schemaPrefix}custom_name`}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Button & Error */}
              {errorMessage && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '16px', fontSize: '0.9rem' }}>
                  <strong>Onboarding Error:</strong> {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isSubmitting ? '⏳ Provisioning Tenant Workload...' : `🚀 Provision ${activeDefinition.productCode} Tenant`}
              </button>
            </form>

            {/* Execution Result Box */}
            {provisionResponse && (
              <div style={{ marginTop: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.4rem' }}>✅</span>
                    <h3 style={{ margin: 0, color: '#166534', fontSize: '1.15rem' }}>
                      Onboarding Succeeded ({provisionResponse.status})
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    {provisionResponse.productCode}
                  </span>
                </div>

                <p style={{ color: '#15803d', fontSize: '0.9rem', margin: '0 0 16px 0' }}>
                  {provisionResponse.message}
                </p>

                {provisioningActive && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '16px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ color: '#1e40af', fontWeight: 600 }}>
                      {polling ? '⏳ Provisioning in progress — polling status…' : 'Provisioning check finished'}
                      {polledStatus?.resourceStatus ? ` (resource: ${polledStatus.resourceStatus})` : ''}
                    </span>
                    {pollStatusError && <span style={{ color: '#b91c1c' }}>{pollStatusError}</span>}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #dcfce7', marginBottom: '16px', fontSize: '0.85rem' }}>
                  <div><strong>Tenant ID:</strong> <code>{provisionResponse.tenantId || 'N/A'}</code></div>
                  <div><strong>Tenant Code:</strong> <code>{provisionResponse.tenantCode}</code></div>
                  <div><strong>External ID:</strong> <code>{provisionResponse.externalId}</code></div>
                  <div><strong>Schema:</strong> <code>{provisionResponse.schemaName}</code></div>
                  <div><strong>Plan:</strong> <code>{provisionResponse.planCode}</code></div>
                  <div><strong>Provider:</strong> <code>{provisionResponse.provider}</code></div>
                </div>

                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                    Executed Provisioning Pipeline:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {provisionResponse.executedSteps?.map((step, idx) => (
                      <span key={step} style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {idx + 1}. {step}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                  {provisionResponse.tenantId && (
                    <Link
                      href={`/tenants/${provisionResponse.tenantId}`}
                      style={{ padding: '8px 16px', background: '#166534', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      View in Tenant Directory →
                    </Link>
                  )}
                  {provisionResponse.productCode === 'STOREAI' && (
                    <Link
                      href={`/storeai/merchant?tenant=${provisionResponse.tenantCode.toLowerCase()}`}
                      style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      Open Merchant Dashboard →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Pipeline Architecture Spec */}
          <div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px 0', color: '#0f172a' }}>
                Onboarding Architecture
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4', margin: '0 0 14px 0' }}>
                All products fulfill the identical canonical SaaS onboarding contract, ensuring zero Central Platform bloat:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>1.</span>
                  <span><strong>External Tenant ID:</strong> Mapped via <code>TenantExternalIdentifier</code></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>2.</span>
                  <span><strong>Canonical Tenant:</strong> Resolves / saves tenant</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>3.</span>
                  <span><strong>Subscription:</strong> Binds plan in <code>TenantProduct</code></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>4.</span>
                  <span><strong>Schema Isolation:</strong> Creates isolated DB schema</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>5.</span>
                  <span><strong>Outbox Relay:</strong> Fires transactional events</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', marginBottom: '8px' }}>
                Selected Definition Summary
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Provider:</strong> <code>{activeDefinition.provider}</code></div>
                <div><strong>Default Plan:</strong> <code>{activeDefinition.subscription.defaultPlanCode}</code></div>
                <div><strong>Schema Prefix:</strong> <code>{activeDefinition.resource.schemaPrefix}</code></div>
                <div><strong>Health Check:</strong> <code>{activeDefinition.healthCheckEndpoint}</code></div>
                <div><strong>Custom Fields:</strong> {activeDefinition.fields.length} dynamic field(s)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TENANT STATUS INSPECTOR */}
      {activeTab === 'lookup' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px', maxWidth: '720px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 8px 0' }}>
            Lookup Tenant Status by Product &amp; External ID
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 20px 0' }}>
            Inspect schema isolation, subscription tier, and mapping state for any legacy or newly registered tenant.
          </p>

          <form onSubmit={handleLookupStatus} style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select
              value={lookupProductCode}
              onChange={(e) => setLookupProductCode(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
            >
              {definitions.map((d) => (
                <option key={d.productCode} value={d.productCode}>{d.displayName}</option>
              ))}
            </select>

            <input
              type="text"
              required
              value={lookupExternalId}
              onChange={(e) => setLookupExternalId(e.target.value)}
              placeholder="e.g. JIOPLIX_NEXUS or STOREAI_NEXUS"
              style={{ flex: 1, minWidth: '220px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />

            <button
              type="submit"
              disabled={isLookingUp}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              {isLookingUp ? 'Searching...' : 'Lookup'}
            </button>
          </form>

          {lookupError && (
            <div style={{ padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '16px' }}>
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{lookupResult.tenantName}</span>
                <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {lookupResult.tenantStatus}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div><strong>External ID:</strong> <code>{lookupResult.externalId}</code></div>
                <div><strong>Provider:</strong> <code>{lookupResult.provider}</code></div>
                <div><strong>Tenant Code:</strong> <code>{lookupResult.tenantCode}</code></div>
                <div><strong>Tenant ID:</strong> <code>{lookupResult.tenantId}</code></div>
                <div><strong>Subscription:</strong> <code>{lookupResult.subscriptionStatus} ({lookupResult.planCode || 'N/A'})</code></div>
                <div><strong>Schema Isolation:</strong> <code>{lookupResult.schemaName || 'NONE'}</code> ({lookupResult.isolationMode})</div>
                <div><strong>Resource State:</strong> <code>{lookupResult.resourceStatus}</code></div>
                <div><strong>Onboarded At:</strong> {lookupResult.onboardedAt}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REGISTERED DEFINITIONS VIEWER */}
      {activeTab === 'definitions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {definitions.map((def) => (
            <div key={def.productCode} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{def.displayName}</h3>
                  <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>{def.productCode}</code>
                  <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>v{def.version}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectProduct(def.productCode);
                    setActiveTab('wizard');
                  }}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Use in Wizard →
                </button>
              </div>

              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 12px 0' }}>{def.description}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '0.8rem', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <strong>Tenant Identifier:</strong> <code>{def.tenantIdentifier.key}</code> ({def.tenantIdentifier.label})
                </div>
                <div>
                  <strong>Default Plan:</strong> <code>{def.subscription.defaultPlanCode}</code>
                </div>
                <div>
                  <strong>Schema Prefix:</strong> <code>{def.resource.schemaPrefix}</code>
                </div>
                <div>
                  <strong>Health Check:</strong> <code>{def.healthCheckEndpoint}</code>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Dynamic Form Fields:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {def.fields.map((f) => (
                    <span key={f.key} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '3px 8px', fontSize: '0.75rem', color: '#475569' }}>
                      <code>{f.key}</code> ({f.label}){f.required ? ' *' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
