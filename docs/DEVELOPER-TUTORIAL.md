# Cybelinx Platform — Developer Integration Tutorial

Welcome to the **Cybelinx Platform Developer Guide**. This hands-on tutorial teaches product engineering teams how to consume central Cybelinx capabilities—including **Multi-Tenant Context**, **Universal SSO**, **Shared UI Controls**, **Core Formatting/Validation**, and **Domain-Aware Language Intelligence**.

Whether you are building for **Jioplix** (Healthcare), **SynthalystHRM** (HRMS), **LIMS** (Laboratory), **Smartbooks** (Finance), **StaySphere** (Hospitality/Real-Estate), **Tradinx** (Trading), or **Cartlinx** (eCommerce), this tutorial provides copy-pasteable examples to integrate in minutes.

---

## Table of Contents

1. [Architectural Overview & Packages](#1-architectural-overview--packages)
2. [Quickstart & Installation](#2-quickstart--installation)
3. [Backend: Tenant Context & SSO Integration (`@cybelinx/sdk`)](#3-backend-tenant-context--sso-integration-cybelinxsdk)
4. [Frontend: SmartTextEditor & UI Library (`@cybelinx/ui`)](#4-frontend-smarttexteditor--ui-library-cybelinxui)
5. [Core Utilities: Formatters & Validators (`@cybelinx/core`)](#5-core-utilities-formatters--validators-cybelinxcore)
6. [Headless Language Intelligence (`@cybelinx/language`)](#6-headless-language-intelligence-cybelinxlanguage)
7. [End-to-End Vertical Examples](#7-end-to-end-vertical-examples)
   - [7.1 Jioplix: Doctor Consultation Note & ABHA Validation](#71-jioplix-doctor-consultation-note--abha-validation)
   - [7.2 SynthalystHRM: Appraisal Review & PAN/CTC Formatter](#72-synthalysthrm-appraisal-review--panctc-formatter)
   - [7.3 Smartbooks: Invoice Entry & GSTIN Verification](#73-smartbooks-invoice-entry--gstin-verification)
   - [7.4 StaySphere: Front Desk Guest Log & ADR / Folio Tracking](#74-staysphere-front-desk-guest-log--adr--folio-tracking)
   - [7.5 Tradinx: Trader Journal & Order Execution Vocabulary](#75-tradinx-trader-journal--order-execution-vocabulary)
   - [7.6 Cartlinx: eCommerce Merchandising & SKU Management](#76-cartlinx-ecommerce-merchandising--sku-management)
8. [Best Practices & Fail-Open Guarantees](#8-best-practices--fail-open-guarantees)

---

# 1. Architectural Overview & Packages

The Cybelinx Platform provides a modular ecosystem of packages published under the `@cybelinx` scope:

```text
                                  CYBELINX PLATFORM
                                          │
       ┌──────────────────┬───────────────┴───────────────┬──────────────────┐
       ▼                  ▼                               ▼                  ▼
 @cybelinx/sdk      @cybelinx/core                  @cybelinx/language    @cybelinx/ui
 (Tenant Context,   (Currency, Date,                (Trie Spell Engine,   (SmartTextEditor,
  SSO Exchange,      National IDs,                   4-Tier Dictionary,    Inputs, Popovers,
  PostgreSQL Auth)   Validation, Async)              Grammar Client)       Modals, Tokens)
```

| Package | Role | Primary Use Cases |
| :--- | :--- | :--- |
| **`@cybelinx/sdk`** | Backend Multi-Tenancy | Tenant isolation, schema-per-tenant resolution, JWT SSO exchange, entitlement checks. |
| **`@cybelinx/core`** | Isomorphic Utilities | Currency formatting (INR/USD), date/relative time, Aadhaar/ABHA/PAN/GSTIN validation, debounce. |
| **`@cybelinx/language`** | Language Intelligence | Sub-300ms in-browser spell checker, 4-tier dictionary resolution, self-hosted grammar client. |
| **`@cybelinx/ui`** | Component Library | `<SmartTextEditor />`, `<Input />`, `<TextArea />`, `<SearchInput />`, `<SuggestionPopover />`. |

---

# 2. Quickstart & Installation

Install the packages needed by your application:

```bash
# In your product web app (React / Next.js / Vite)
npm install @cybelinx/core @cybelinx/language @cybelinx/ui

# In your product backend (Node.js / Express / Fastify / Next.js API)
npm install @cybelinx/sdk @cybelinx/core
```

### Import Stylesheet
In your React app root (`app/layout.tsx`, `src/main.tsx`, or `src/App.tsx`), import the Cybelinx design tokens:

```tsx
// Global Cybelinx UI variables and squiggly error animations
import '@cybelinx/ui/styles.css';
```

---

# 3. Backend: Tenant Context & SSO Integration (`@cybelinx/sdk`)

Every Cybelinx product operates in an isolated tenant context. The `@cybelinx/sdk` automatically resolves the tenant from incoming request headers, subdomains, or SSO tokens.

### 3.1 Resolving Tenant Context in Express / Node.js
```ts
import express from 'express';
import { cybelinxTenantMiddleware, createTenantContext } from '@cybelinx/sdk';

const app = express();
app.use(express.json());

// 1. Attach Cybelinx Tenant Middleware
// Extracts tenant from: X-Tenant-Id, X-Tenant-Code, or Subdomain (e.g. apollo.jioplix.com)
app.use(cybelinxTenantMiddleware({
  baseDomain: 'jioplix.com',
  jwtSecret: process.env.CYBELINX_JWT_SECRET,
}));

// 2. Access Tenant Context in route handlers
app.get('/api/patients', async (req, res) => {
  const context = (req as any).cybelinxContext;

  // Check product entitlements
  if (!context.hasEntitlement('clinical_notes')) {
    return res.status(403).json({ error: 'Tenant is not subscribed to clinical notes module' });
  }

  // Get safe PostgreSQL search path for tenant schema
  const schemaName = context.schemaName; // e.g. "tenant_apollo_hospitals"
  const searchPathSql = context.getSearchPathSql(); // SET search_path TO "tenant_apollo_hospitals", public;

  // Query tenant-specific database safely...
  res.json({ tenantId: context.tenantId, schema: schemaName });
});
```

### 3.2 Universal SSO Launch Token Exchange
When users launch your product from the Cybelinx Admin Portal via `?sso_token=...`, exchange the token to establish a product session:

```ts
import { verifySsoLaunchToken } from '@cybelinx/sdk';

app.post('/api/auth/sso/exchange', async (req, res) => {
  const { sso_token } = req.body;

  try {
    // Validates HMAC-SHA256 signature and 24-hour expiration
    const payload = verifySsoLaunchToken(sso_token, process.env.CYBELINX_JWT_SECRET!);

    const { cybelinx_tenant_id, user_id, email, roles, product_code } = payload;

    // Self-healing JIT provisioning: ensure user exists in tenant schema
    await ensureTenantUserExists(cybelinx_tenant_id, user_id, email, roles);

    // Issue product-native session cookie / JWT
    res.json({
      success: true,
      tenantId: cybelinx_tenant_id,
      user: { id: user_id, email, roles },
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired Cybelinx SSO token' });
  }
});
```

---

# 4. Frontend: SmartTextEditor & UI Library (`@cybelinx/ui`)

The `<SmartTextEditor />` is a drop-in replacement for standard `<textarea>` elements, providing instant spelling checks and debounced grammar checks without blocking input.

### 4.1 Basic Usage

```tsx
import React, { useState } from 'react';
import { SmartTextEditor } from '@cybelinx/ui';

export function ClinicalNotesForm() {
  const [note, setNote] = useState('');

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
        Doctor Observation & Findings
      </label>
      
      <SmartTextEditor
        domain="healthcare"                   // Activates Healthcare dictionary
        tenantId="tenant-apollo-01"           // Scopes custom tenant words
        value={note}
        onChange={setNote}
        placeholder="Document symptoms, examination, and diagnosis..."
        minRows={5}
        spellCheck={true}
        grammarCheck={true}
      />
    </div>
  );
}
```

### 4.2 Available Supported Domains
Set `domain="..."` to match your application vertical:

| `domain` Attribute | Industry Vertical | Typical Consuming Product |
| :--- | :--- | :--- |
| `"healthcare"` | Clinical, Hospital HMS | Jioplix, Healthezee |
| `"hrms"` | Human Resources, Payroll | SynthalystHRM |
| `"lims"` | Laboratory, Assays, Quality | LIMS Suite |
| `"finance"` | Accounting, Billing, Taxation | Smartbooks |
| `"hospitality"` | Hotels, Lodging, Front Desk | StaySphere |
| `"realestate"` | Property Leasing, Land Title | Real-Estate SaaS |
| `"trading"` | Equities, Derivatives, Orders | Tradinx |
| `"pharma"` | Formulations, Regulatory, CDMO | PharmaSaaS |
| `"ecommerce"` | Merchandising, Storefronts | Cartlinx |
| `"supplychain"` | Warehousing, Logistics, WMS | SCM Suite |

---

## 4.3 Common UI Form Controls

### Input with Validation Error & Label
```tsx
import { Input } from '@cybelinx/ui';

<Input
  label="PAN Number"
  placeholder="ABCDE1234F"
  value={pan}
  onChange={(e) => setPan(e.target.value.toUpperCase())}
  error={isPanValid ? undefined : 'Invalid PAN format (e.g. ABCDE1234F)'}
/>
```

### SearchInput with Automatic Debounce
```tsx
import { SearchInput } from '@cybelinx/ui';

<SearchInput
  placeholder="Search patients by MRN or Name..."
  debounceMs={300}
  onSearch={(query) => {
    fetchSearchResults(query);
  }}
/>
```

### Notification Toast & Confirmation Modal
```tsx
import { NotificationToast, ConfirmationModal } from '@cybelinx/ui';

export function StatusBanner() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <NotificationToast
        type="success"
        title="Consultation Saved"
        message="Patient record synchronized with hospital EHR."
        onDismiss={() => {}}
      />

      <ConfirmationModal
        isOpen={showModal}
        title="Discharge Patient?"
        message="This action finalizes the inpatient folio and generates discharge summary."
        confirmLabel="Confirm Discharge"
        isDestructive={false}
        onConfirm={() => executeDischarge()}
        onCancel={() => setShowModal(false)}
      />
    </>
  );
}
```

---

# 5. Core Utilities: Formatters & Validators (`@cybelinx/core`)

Centralize all formatting and input sanitization using `@cybelinx/core`.

### 5.1 Currency & Date/Time Formatters

```ts
import {
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  formatFileSize,
} from '@cybelinx/core';

// Currency Formatting
formatCurrency(125000, 'INR');               // "₹ 1,25,000.00"
formatCurrency(4500.5, 'USD');               // "$4,500.50"
formatCurrency(890.25, 'EUR', { fractionDigits: 0 }); // "€890"

// Date & Time Formatting (default timezone: Asia/Kolkata)
formatDateTime('2026-09-22T06:30:00Z');      // "22 Sep 2026"
formatDateTime(new Date(), { includeTime: true }); // "22 Sep 2026, 12:00:00 pm"

// Human Relative Timestamps
formatRelativeTime(Date.now() - 5 * 60 * 1000);   // "5 minutes ago"
formatRelativeTime(Date.now() - 86400 * 1000);   // "1 day ago"

// File Size Humanizer
formatFileSize(2097152);                     // "2 MB"
```

### 5.2 National ID & Field Validators

```ts
import {
  validateABHA,
  validateAadhaar,
  validatePAN,
  validateGSTIN,
  validateEmail,
  validatePhone,
} from '@cybelinx/core';

// Indian National Healthcare & Tax IDs
validateABHA('12-3456-7890-1234');           // true (14 digits)
validateAadhaar('2345 6789 0123');          // true (12 digits)
validatePAN('ABCDE1234F');                  // true
validateGSTIN('27ABCDE1234F1Z5');           // true (State + PAN + Checksum)

// Standard Contact Validators
validateEmail('doctor@apollo.hospital.com'); // true
validatePhone('+91 9876543210');            // true
```

---

# 6. Headless Language Intelligence (`@cybelinx/language`)

If you are building custom text areas or headless editors (like Quill, TipTap, or Slate), use the engine directly without `@cybelinx/ui`:

```ts
import { SpellChecker, DictionaryResolver } from '@cybelinx/language';

// 1. Initialize 4-Tier Dictionary Resolver
const resolver = new DictionaryResolver();

// Load base common + domain vocabulary
resolver.loadCommonDictionary(['patient', 'report', 'doctor', 'appointment']);
resolver.loadDomainDictionary('healthcare', ['HbA1c', 'MRN', 'UHID', 'Metformin']);

// Add tenant-specific custom words
resolver.addTenantTerms('hospital-apollo', ['ApolloSuperSpecialty', 'Ward10B']);

// 2. Resolve Effective Runtime Terms (<5ms)
const terms = resolver.resolveEffectiveTerms({
  domain: 'healthcare',
  tenantId: 'hospital-apollo',
});

// 3. Instantiate Instant Spell Checker
const spellChecker = new SpellChecker(terms);

// Check single word
spellChecker.checkWord('HbA1c'); // true (recognized domain term!)
spellChecker.checkWord('fevr');  // false (misspelled)

// Get Phonetic Suggestions
spellChecker.getSuggestions('fevr'); // ["fever", "feverish"]

// Check Full Narrative Text (<300ms)
const matches = spellChecker.checkText('Patient diagnosed with fevr and elevated HbA1c.');
// matches: [{ word: 'fevr', offset: 23, length: 4, suggestions: ['fever'] }]
```

---

# 7. End-to-End Vertical Examples

Here are complete, production-ready examples for primary Cybelinx SaaS products:

### 7.1 Jioplix: Doctor Consultation Note & ABHA Validation

```tsx
import React, { useState } from 'react';
import { SmartTextEditor, Input, NotificationToast } from '@cybelinx/ui';
import { validateABHA, formatDateTime } from '@cybelinx/core';

export function JioplixConsultationScreen({ tenantId }: { tenantId: string }) {
  const [abha, setAbha] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const isValidAbha = abha ? validateABHA(abha) : true;

  const handleSave = () => {
    // Non-blocking: saves immediately, language checks are purely advisory
    setIsSaved(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '650px' }}>
      <h2>Clinical Consultation Encounter</h2>

      <Input
        label="Patient ABHA ID"
        placeholder="XX-XXXX-XXXX-XXXX"
        value={abha}
        onChange={(e) => setAbha(e.target.value)}
        error={!isValidAbha ? 'Invalid ABHA number (must be 14 digits)' : undefined}
        helperText="Ayushman Bharat Health Account ID"
      />

      <div>
        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Clinical Progress Notes</label>
        <SmartTextEditor
          domain="healthcare"
          tenantId={tenantId}
          value={clinicalNote}
          onChange={setClinicalNote}
          placeholder="e.g. Patient presents with Dyspnea. Checked HbA1c and prescribed Metformin..."
          minRows={6}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        style={{
          padding: '10px 18px',
          backgroundColor: '#0284c7',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Save Patient Note
      </button>

      {isSaved && (
        <NotificationToast
          type="success"
          title="Clinical Note Recorded"
          message={`Encounter synchronized at ${formatDateTime(new Date(), { includeTime: true })}`}
          onDismiss={() => setIsSaved(false)}
        />
      )}
    </div>
  );
}
```

---

### 7.2 SynthalystHRM: Appraisal Review & PAN/CTC Formatter

```tsx
import React, { useState } from 'react';
import { SmartTextEditor, Input } from '@cybelinx/ui';
import { formatCurrency, validatePAN } from '@cybelinx/core';

export function HrmsAppraisalForm({ tenantId }: { tenantId: string }) {
  const [pan, setPan] = useState('');
  const [annualCtc, setAnnualCtc] = useState(1200000);
  const [reviewText, setReviewText] = useState('');

  return (
    <div style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3>Performance Appraisal & Compensation Review</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input
          label="Employee PAN"
          value={pan}
          onChange={(e) => setPan(e.target.value.toUpperCase())}
          error={pan && !validatePAN(pan) ? 'Invalid PAN format' : undefined}
        />

        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Proposed Annual CTC</label>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', padding: '8px 0' }}>
            {formatCurrency(annualCtc, 'INR')}
          </div>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Appraisal Remarks (HRMS Domain)</label>
        <SmartTextEditor
          domain="hrms"
          tenantId={tenantId}
          value={reviewText}
          onChange={setReviewText}
          placeholder="Document evaluation regarding KRA achievements, CTC revision, and PIP status..."
          minRows={5}
        />
      </div>
    </div>
  );
}
```

---

### 7.3 Smartbooks: Invoice Entry & GSTIN Verification

```tsx
import React, { useState } from 'react';
import { SmartTextEditor, Input } from '@cybelinx/ui';
import { validateGSTIN, formatCurrency } from '@cybelinx/core';

export function SmartbooksInvoiceEntry({ tenantId }: { tenantId: string }) {
  const [gstin, setGstin] = useState('');
  const [amount, setAmount] = useState(45000);
  const [invoiceTerms, setInvoiceTerms] = useState('');

  return (
    <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h3>Smartbooks — Tax Invoice Generator</h3>

      <Input
        label="Customer GSTIN"
        placeholder="27ABCDE1234F1Z5"
        value={gstin}
        onChange={(e) => setGstin(e.target.value.toUpperCase())}
        error={gstin && !validateGSTIN(gstin) ? 'Invalid GSTIN number' : undefined}
      />

      <div style={{ padding: '8px 0', fontSize: '0.95rem' }}>
        Taxable Total: <strong>{formatCurrency(amount, 'INR')}</strong>
      </div>

      <div>
        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Invoice Notes & Payment Terms</label>
        <SmartTextEditor
          domain="finance"
          tenantId={tenantId}
          value={invoiceTerms}
          onChange={setInvoiceTerms}
          placeholder="Specify HSN/SAC codes, reverse charge terms, and bank reconciliation details..."
          minRows={4}
        />
      </div>
    </div>
  );
}
```

---

### 7.4 StaySphere: Front Desk Guest Log & ADR / Folio Tracking

```tsx
import React, { useState } from 'react';
import { SmartTextEditor } from '@cybelinx/ui';
import { formatCurrency } from '@cybelinx/core';

export function StaySphereFrontDeskLog({ tenantId }: { tenantId: string }) {
  const [log, setLog] = useState('');
  const adr = 6500; // Average Daily Rate

  return (
    <div style={{ maxWidth: '600px' }}>
      <h3>StaySphere — Front Desk & Night Audit Log</h3>
      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
        Current ADR: <strong>{formatCurrency(adr, 'INR')}</strong> | Occupancy: <strong>88%</strong>
      </p>

      <SmartTextEditor
        domain="hospitality"
        tenantId={tenantId}
        value={log}
        onChange={setLog}
        placeholder="Record Folio adjustments, OTA reservations, RevPAR notes, or LateCheckOut requests..."
        minRows={5}
      />
    </div>
  );
}
```

---

### 7.5 Tradinx: Trader Journal & Order Execution Vocabulary

```tsx
import React, { useState } from 'react';
import { SmartTextEditor } from '@cybelinx/ui';

export function TradinxTradeJournal({ tenantId }: { tenantId: string }) {
  const [journal, setJournal] = useState('');

  return (
    <div style={{ maxWidth: '600px' }}>
      <h3>Tradinx — Trade Execution Journal</h3>

      <SmartTextEditor
        domain="trading"
        tenantId={tenantId}
        value={journal}
        onChange={setJournal}
        placeholder="Document OrderBook liquidity, VWAP execution, Slippage, and StopLoss triggers..."
        minRows={4}
      />
    </div>
  );
}
```

---

### 7.6 Cartlinx: eCommerce Merchandising & SKU Management

```tsx
import React, { useState } from 'react';
import { SmartTextEditor } from '@cybelinx/ui';

export function CartlinxProductEditor({ tenantId }: { tenantId: string }) {
  const [desc, setDesc] = useState('');

  return (
    <div style={{ maxWidth: '600px' }}>
      <h3>Cartlinx — Storefront Product Description</h3>

      <SmartTextEditor
        domain="ecommerce"
        tenantId={tenantId}
        value={desc}
        onChange={setDesc}
        placeholder="Document product SKU variant details, CartAbandonment offers, and Dropshipping terms..."
        minRows={5}
      />
    </div>
  );
}
```

---

# 8. Best Practices & Fail-Open Guarantees

When consuming the Cybelinx platform in production:

1. **Never Block Form Submission on Grammar Checks**:
   - The `<SmartTextEditor />` treats language checking as an advisory layer. If your backend service or network is offline, the editor automatically switches to **Offline Mode** (`isDegraded = true`).
   - Your form submission buttons (`Save Note`, `Submit Review`, `Generate Invoice`) must **never await** language checking.
2. **Always Provide `tenantId`**:
   - Passing `tenantId` guarantees that custom terminology approved by the tenant's administrator is automatically recognized and never flagged as a spelling mistake.
3. **Zero PII Exposure Guarantee**:
   - Never configure the language engine to connect to third-party public cloud endpoints (`api.languagetool.org` or public LLM APIs).
   - All server-side grammar checking runs exclusively inside the private Cybelinx VPC against self-hosted containers.

---
*For support or architectural questions, consult the [Cybelinx Central SaaS Platform PRD](file:///d:/Training/working/Cybelinx-platform/docs/Cybelinx%20Central%20SaaS%20Platform%20%E2%80%94%20Phase%201%20PRD.md) and [Sub-Platform TRD](file:///d:/Training/working/Cybelinx-platform/docs/Cybelinx%20Platform%20%E2%80%94%20Shared%20Utilities%20&%20Language%20Intelligence%20TRD.md).*
