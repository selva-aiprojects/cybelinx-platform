# Cybelinx Platform — Shared Utilities & Language Intelligence
## Sub-Platform Product Requirements Document (PRD)

**Product:** Cybelinx Platform  
**Sub-Platform / Component:** Shared UI, Common Utilities & Language Intelligence  
**Version:** 1.0  
**Status:** Proposed / Architecture Baseline  
**Owner:** Cybelinx Platform Team  
**Parent Document:** [`docs/Cybelinx Central SaaS Platform — Phase 1 PRD.md`](./Cybelinx%20Central%20SaaS%20Platform%20%E2%80%94%20Phase%201%20PRD.md)  
**Target Products:** Jioplix / Healthezee, SynthalystHRM, LIMS, Smartbooks, StaySphere, and future Cybelinx SaaS products  

---

## Document Control & Revision History

| Version | Date | Author | Status | Change Description |
| :--- | :--- | :--- | :--- | :--- |
| `1.0.0` | September 2026 | Cybelinx Platform Team | Proposed | Initial Sub-Platform PRD baseline for Shared UI, Common Utilities, and Language Intelligence |

---

# 1. Executive Summary

Cybelinx operates a growing ecosystem of vertical SaaS products spanning critical industries:
- **Jioplix / Healthezee**: Clinical Healthcare & Hospital Information Management
- **SynthalystHRM**: Human Resource Management & Payroll
- **LIMS**: Laboratory Information Management & Specimen Tracking
- **Smartbooks**: Accounting, Invoicing & Financial Operations
- **StaySphere**: Hospitality & Property Management

Historically, foundational user interface controls and text processing features have been independently built or integrated within each product silo. A comprehensive audit across these product lines reveals heavy functional overlap:
* Form text inputs, textareas, and rich text editors
* Client-side validation, sanitization, and mask formatting
* Localized date/time, number, and currency formatting
* Notification toasts, confirmation modals, and contextual tooltips
* Spell checking, grammar checking, and punctuation correction
* Domain-specific vocabularies (clinical terminology, HR jargon, laboratory acronyms)
* Tenant-specific custom terms and abbreviations
* Audit logging, telemetry, and user writing preferences

### The Problem of Siloed Implementations
Building and maintaining these capabilities independently inside every product team creates severe systemic challenges:
1. **Duplicate Engineering Effort**: Multiple product teams repeatedly solve the same UI, formatting, and text-editing problems.
2. **Inconsistent User Experience**: Different Cybelinx products feel disparate in design language, keyboard accessibility, and behavior.
3. **Fragmented Language Quality**: Varying open-source or browser-native spell checkers yield erratic quality and flag valid industry-standard terminology as errors.
4. **Severe Privacy & Compliance Risks**: Browser extensions or unvetted cloud-based grammar tools (e.g., public Grammarly or third-party web services) risk exfiltrating sensitive Protected Health Information (PHI) and corporate employee/financial data.
5. **High Maintenance Overhead**: Upgrading packages or fixing accessibility defects must be executed across multiple codebases.
6. **AI Fragmentation**: Introducing future generative AI capabilities (rewriting, clinical summaries) becomes disjointed and unmanageable across disparate UI layers.

### The Centralized Solution
This PRD formally specifies the **Cybelinx Platform Shared Utilities & Language Intelligence Sub-Platform**.

The first priority is the delivery of the **SmartTextEditor** and the **Language Intelligence Engine**—delivering sub-300ms localized spelling, contextual grammar assistance, and domain-aware dictionary resolution. This sub-platform provides a robust foundation for shared frontend components (`@cybelinx/ui`), core utilities (`@cybelinx/core`), and centralized language intelligence (`@cybelinx/language` & self-hosted backend service), while strictly adhering to Cybelinx's multi-tenant isolation, compliance, and architectural boundary standards.

---

# 2. Product Vision & Principles

## 2.1 Vision

> **Build a unified, modular Cybelinx platform layer providing enterprise-grade UI components, common utilities, and private, domain-aware language intelligence to every Cybelinx SaaS product.**

Every Cybelinx product engineering team will consume centrally maintained, accessible, and high-performance packages instead of building bespoke text editing, formatting, or spell-checking infrastructure.

```text
                           CYBELINX PLATFORM
               (Shared Utilities & Language Intelligence)
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
     Jioplix/Healthezee       SynthalystHRM                LIMS
     (Clinical Health)           (HRMS)                (Laboratory)
           │                        │                        │
     ┌─────┴──────────┐       ┌─────┴──────────┐       ┌─────┴──────────┐
     │ SmartTextEditor│       │ SmartTextEditor│       │ SmartTextEditor│
     │ Healthcare Dict│       │ HRMS Dictionary│       │ LIMS Dictionary│
     │ Clinical Format│       │ Date/Time Utils│       │ QC/Unit Utils  │
     └────────────────┘       └────────────────┘       └────────────────┘
```

## 2.2 Core Architectural Principles

1. **Centralize Utilities, Preserve Product Autonomy**: Common input, formatting, and language capabilities are centralized in reusable packages and services. Product business logic and workflow state remain strictly inside the respective products.
2. **Privacy & Data Sovereignty First**: Never exfiltrate clinical, financial, or employee text to third-party public cloud APIs. Language checking must execute locally in-browser or against isolated, self-hosted Cybelinx infrastructure.
3. **Fail-Open / Non-Blocking UX**: Language assistance is an enhancement, never a gatekeeper. If the grammar service is unreachable, text input, clinical note submission, or lab report saving must continue uninterrupted.
4. **Strict Multi-Tenant Isolation**: Tenant-specific custom terms and personal user dictionaries must never leak across tenant boundaries or products.
5. **Zero-Latency Feel**: Local spelling checks must respond instantly (<300 ms) via client-side engines; deep grammar analysis must be debounced and asynchronous.
6. **Universal Accessibility (WCAG 2.1 AA)**: All shared components must provide full keyboard navigation, screen reader ARIA contracts, and high-contrast support out-of-the-box.

---

# 3. Business Objectives & Success Metrics

## 3.1 Primary Business Objectives

1. **Eliminate Redundant Development**: Provide single-source-of-truth UI components and utilities across all Cybelinx web applications.
2. **Establish Brand & Interaction Cohesion**: Unify design tokens, modal patterns, form feedback, and editing ergonomics across products.
3. **Deliver Domain-Aware Language Accuracy**: Prevent false positives on industry terms (e.g., `HbA1c`, `MRN`, `HPLC`, `CTC`) through curated, versioned domain dictionaries.
4. **Empower Multi-Tenant Customization**: Allow hospitals, enterprise clients, and laboratories to maintain their own institutional vocabulary.
5. **Guarantee Healthcare & Enterprise Privacy**: Ensure zero data leakage of clinical notes or confidential personnel communications.
6. **Lay the AI Foundation**: Establish the standardized UI hooks and API gateway required for future LLM-based writing assistance, summarization, and translation.

## 3.2 Key Performance Indicators (KPIs) & Targets

| Metric | Target | Measurement Method |
| :--- | :--- | :--- |
| **Product Adoption** | $\ge 3$ core products in Phase 1 | Jioplix, SynthalystHRM, and LIMS consuming `@cybelinx/ui` |
| **Code Duplication Reduction** | $> 50\%$ reduction | Elimination of redundant text inputs, formatters, and custom spell checkers |
| **Client-Side Spell-Check Latency** | $< 300\text{ ms}$ | Performance timing from keypress debounce to highlight rendering |
| **Server Grammar Check Latency** | $< 2.0\text{ s}$ target ($p95 < 1.5\text{ s}$) | End-to-end API response time via debounced grammar check |
| **Domain Terminology Coverage** | $\ge 95\%$ | Accuracy on domain test corpus without flagging valid technical terms |
| **Form Adoption Coverage** | $> 70\%$ of eligible textareas | Percentage of narrative text entry points converted to `SmartTextEditor` |
| **Production Incident Defect Rate** | $< 1\%$ | Regression bugs attributed to shared component library |
| **External Service Leakage** | $0\%$ default | Audit verification that zero text payloads leave Cybelinx VPC |
| **Cache Hit Ratio (Dictionary API)** | $> 90\%$ | Edge/Browser caching and Redis hit rate for dictionary lookups |

---

# 4. Problem Statement & Gap Analysis

```text
CURRENT STATE: Fragmented & Vulnerable
--------------------------------------------------------------------------------------
Jioplix            SynthalystHRM         LIMS                 Smartbooks
  │                      │                 │                      │
  ├─ Custom Editor       ├─ React-Quill    ├─ HTML Textarea       ├─ Plain Input
  ├─ Browser Spellcheck  ├─ No Spellcheck  ├─ Browser Spellcheck  ├─ No Spellcheck
  ├─ Flags "HbA1c"       ├─ Flags "KRA"    ├─ Flags "ELISA"       ├─ Manual Formatting
  └─ Potential PHI leak  └─ Inconsistent   └─ Risk of 3rd-party   └─ No central audit
     to 3rd party ext.      date format       browser plugins

TARGET STATE: Cybelinx Platform Sub-Platform
--------------------------------------------------------------------------------------
                                Cybelinx Platform
                        ┌───────────────────────────────┐
                        │       @cybelinx/ui            │
                        │       @cybelinx/core          │
                        │       @cybelinx/language      │
                        └───────────────┬───────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
      Jioplix / Health            SynthalystHRM                  LIMS
    <SmartTextEditor             <SmartTextEditor           <SmartTextEditor
       domain="healthcare"          domain="hrms"              domain="lims"
       tenantId={id} />             tenantId={id} />           tenantId={id} />
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        ▼
                        Cybelinx Language Service
                  (Self-Hosted LanguageTool + Dictionaries)
```

### Key Gaps Addressed:
* **The "Red Squiggly" Dilemma**: Standard browser dictionaries highlight vital medical terms (`UHID`, `ABHA`, `SNOMED`, `Dyspnea`) or lab techniques (`HPLC`, `COA`, `LOD`) as spelling errors, causing user frustration and distrust.
* **Compliance Exposure**: Doctors and HR specialists routinely install browser plugins (Grammarly, LanguageTool public extensions) to help compose notes. These plugins capture keystrokes and transmit sensitive patient/personnel data to third-party cloud servers, violating HIPAA, GDPR, and Indian Digital Personal Data Protection Act (DPDPA) mandates.
* **Inconsistent UX & Engineering Drag**: Every product team implements their own currency input masks, date pickers, error popups, and confirmation dialogs, leading to fragmented styling and duplicated QA cycles.

---

# 5. Scope & Boundary Definition

## 5.1 In-Scope (Phase 1 MVP)

### 1. Shared UI Component Library (`@cybelinx/ui`)
* **`SmartTextEditor`**: Rich/Plain text entry component with dual-tier spell and grammar intelligence, context popups, suggestion replacement, and dictionary management actions.
* **Common Form Controls**: `Input`, `TextArea`, `SearchInput`, `Select`, `Checkbox`, `RadioGroup`.
* **Feedback & Overlay Components**: `NotificationToast`, `ConfirmationModal`, `Tooltip`, `SuggestionPopover`, `Badge`, `SkeletonLoader`.
* **Design Token Integration**: Seamless CSS variable theming supporting light mode, dark mode, and Cybelinx product brand accents.

### 2. Core Utilities Library (`@cybelinx/core`)
* **Validation**: Regex builders, email/phone formatters, Aadhaar/ABHA validators, tax ID validators (PAN/GSTIN), file upload size/MIME validators.
* **Formatting**: Multi-currency formatters (INR, USD, EUR, GBP), locale-aware date/time formatters, relative timestamps, file size humanizers.
* **Client Utilities**: Debounce, throttle, deep-merge, unique ID generators, clipboard helpers.

### 3. Language Intelligence Sub-Platform (`@cybelinx/language`)
* **Dual-Tier Processing Engine**:
  * *Tier 1 (Client-Side)*: High-speed, local spell checking via `nspell` and compiled Hunspell dictionary assets.
  * *Tier 2 (Server-Side)*: Asynchronous, debounced grammar and contextual punctuation checking via self-hosted LanguageTool.
* **Multi-Layered Dictionary Resolution**:
  * Common Cybelinx English Dictionary
  * Vertical Domain Dictionaries (Healthcare, HRMS, LIMS, Finance)
  * Tenant-Specific Custom Terminology
  * User-Specific Personal Custom Words
* **End-User Control Actions**: Accept suggestion, Ignore once, Ignore always, Add word to tenant dictionary (admin), Add word to personal dictionary, Toggle spell-check, Toggle grammar-check.

### 4. Backend Language Service & Dictionaries
* RESTful Language Control Plane endpoints (`/api/v1/language/*`).
* Multi-tenant PostgreSQL dictionary storage schema with complete tenant isolation.
* Distributed caching with Redis and HTTP browser caching.
* Administrative Dictionary Management portal inside `apps/admin-portal`.

## 5.2 Out-of-Scope (Phase 1 Baseline)

The following advanced capabilities are deliberately deferred to subsequent AI phases:
* Autonomous clinical decision support or automated medical diagnosis suggestions.
* Automated rewriting of clinical patient records or legal contracts without explicit user initiation.
* Automated HR disciplinary or termination decision logic.
* Speech-to-text / real-time clinical voice dictation (planned for Phase 2).
* Real-time cross-language multi-lingual translation (planned for Phase 2).
* Unattended text summarization and automatic categorization.

---

# 6. Target User Personas & Use Cases

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               USER PERSONAS                                     │
├───────────────────────┬─────────────────────────┬───────────────────────────────┤
│ 1. Product End Users  │ 2. Product Developers   │ 3. Platform Administrators    │
│ (Doctors, Nurses,     │ (Frontend engineers on  │ (Compliance officers, clinical│
│  HR Specialists,      │  Jioplix, Synthalyst,   │  directors, platform ops,     │
│  Lab Technicians)     │  LIMS, Smartbooks)      │  system administrators)       │
└───────────────────────┴─────────────────────────┴───────────────────────────────┘
```

### Persona 1: Dr. Priya Sharma (Consultant Physician, Jioplix)
* **Context**: Typing rapid outpatient clinical notes in Jioplix during a 15-minute consultation.
* **Needs**: Rapid typing speed without lag; common acronyms (`OPD`, `HbA1c`, `Metformin`, `UHID`, `BID`) must never show red squiggly underlines; common typos (`fevr` -> `fever`) must be corrected in 1 click; zero patient clinical data may leave the hospital perimeter.
* **Failure Mode Prevented**: Dr. Sharma will not be forced to install third-party browser spellcheckers that violate patient confidentiality.

### Persona 2: Rajesh Verma (HR Director, SynthalystHRM)
* **Context**: Composing annual appraisal letters and sensitive performance improvement plans.
* **Needs**: Accurate grammar checking and tone suggestions; standard HR terms (`CTC`, `KRA`, `LWD`, `PF`, `Appraisal`) recognized; ability to add company-specific job role codes to the organization dictionary.

### Persona 3: Ananya Sen (Lead Laboratory Technologist, LIMS)
* **Context**: Entering analytical observations and calibration remarks for automated assay reports.
* **Needs**: Correct spelling recognition of assay acronyms (`ELISA`, `HPLC`, `PCR`, `CAPA`, `LOD`, `LOQ`); ability to review lab-wide custom terms approved by the lab director.

### Persona 4: Frontend Engineer (Cybelinx Product Team)
* **Context**: Building a new patient intake form or employee grievance module.
* **Needs**: Import `<SmartTextEditor domain="healthcare" />` or `<Input mask="currency" />` with minimal boilerplate; fully typed TypeScript interfaces; zero need to configure regex, dictionaries, or grammar debouncing manually.

---

# 7. Sub-Platform Architecture & System Topology

## 7.1 System Topology Diagram

```text
                                  CLIENT BROWSER (React / Vite / Next.js)
  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │  Product Application (Jioplix / SynthalystHRM / LIMS)                                                 │
  │                                                                                                       │
  │   <SmartTextEditor domain="healthcare" tenantId="t-001" value={text} onChange={setText} />            │
  │                                                                                                       │
  │   ┌───────────────────────────────────────────────────────────────────────────────────────────────┐   │
  │   │ @cybelinx/language Client Runtime                                                             │   │
  │   │                                                                                               │   │
  │   │  [Keypress] ──► Immediate Tokenizer ──► Local Spell Engine (nspell)                           │   │
  │   │                                                │                                              │   │
  │   │                                                ├─► Cached Common Dictionary (IndexedDB)       │   │
  │   │                                                ├─► Cached Domain Dictionary (IndexedDB)       │   │
  │   │                                                └─► Cached Tenant/User Dictionary              │   │
  │   │                                                │                                              │   │
  │   │                                                ▼                                              │   │
  │   │                                  [<300ms: Render Red Underlines]                              │   │
  │   │                                                                                               │   │
  │   │  [Debounce 800ms] ────────────────────────────────────────────────────────┐                   │   │
  │   └───────────────────────────────────────────────────────────────────────────┼───────────────────┘   │
  └───────────────────────────────────────────────────────────────────────────────┼───────────────────────┘
                                                                                  │ HTTPS POST /api/v1/language/check
                                                                                  │ (Bearer JWT: cybelinx_tenant_id)
                                                                                  ▼
  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                     CYBELINX CONTROL PLANE / PLATFORM GATEWAY                         │
  │                                                                                                       │
  │   - OIDC / Keycloak JWT Validation                                                                    │
  │   - Tenant Context Extraction (cybelinx_tenant_id)                                                    │
  │   - Entitlement Verification (feature_flags: "language_intelligence" == true)                         │
  │   - Rate Limiting & Input Sanitization                                                                │
  └──────────────────────────────────┬────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                  CYBELINX LANGUAGE SERVICE (Backend Engine)                           │
  │                                                                                                       │
  │   ┌──────────────────────────────────────────────┐     ┌──────────────────────────────────────────┐   │
  │   │ Dictionary Resolver Service                  │     │ Grammar Engine Orchestrator              │   │
  │   │                                              │     │                                          │   │
  │   │ - Fetch & Merge Dictionaries:                │     │ - Strip HTML / Normalize Text            │   │
  │   │     Common + Domain + Tenant + User          │     │ - Call Internal Grammar Engine           │   │
  │   │ - Filter false positives from Grammar match  │     │ - Map character offsets & suggestions    │   │
  │   └──────────────────────┬───────────────────────┘     └────────────────────┬─────────────────────┘   │
  └──────────────────────────┼──────────────────────────────────────────────────┼─────────────────────────┘
                             │                                                  │
              ┌──────────────┴──────────────┐                    ┌──────────────┴──────────────┐
              ▼                             ▼                    ▼                             ▼
     ┌─────────────────┐           ┌─────────────────┐  ┌─────────────────┐           ┌─────────────────┐
     │  Redis Cache    │           │ PostgreSQL DB   │  │ Self-Hosted     │           │ Cybelinx Outbox │
     │ (Domain & Tenant│           │ (cybelinx_      │  │ LanguageTool    │           │ (Audit Events   │
     │  Dictionary Trie│           │  language_*)    │  │ Container (VPC) │           │  & Usage Tele)  │
     └─────────────────┘           └─────────────────┘  └─────────────────┘           └─────────────────┘
```

## 7.2 Integration with Cybelinx Central SaaS Platform

In strict compliance with [`docs/architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) and [`docs/Cybelinx Central SaaS Platform — Phase 1 PRD.md`](./Cybelinx%20Central%20SaaS%20Platform%20%E2%80%94%20Phase%201%20PRD.md):
1. **Tenant Context**: The Language Service does not maintain an independent tenant registry. It ingests and relies upon `cybelinx_tenant_id` resolved by the Cybelinx Gateway.
2. **Entitlements & Feature Flags**: Access to advanced grammar checks and custom tenant dictionaries is governed by central entitlements (e.g., `entitlement_key: "smart_language_v1"`).
3. **No Business Data Storage**: The Language Service processes text in-memory. **It never stores or persists the body of text submitted for grammar or spell checking**.
4. **Audit Logging**: Any modification to dictionaries (adding/removing approved words) emits standard transactional outbox events:
   * `LANGUAGE_DICTIONARY_TERM_ADDED`
   * `LANGUAGE_DICTIONARY_TERM_REMOVED`
   * `LANGUAGE_TENANT_CONFIG_UPDATED`

---

# 8. Monorepo Package Layout & Repository Organization

The Cybelinx Platform monorepo will organize shared UI, core utilities, and language intelligence packages under `packages/`, companion services under `backend/` or `services/`, and domain wordlists under `dictionaries/`:

```text
cybelinx-platform/
├── apps/
│   └── admin-portal/                     # Cybelinx Central Admin Console (Next.js)
│       ├── src/app/admin/
│       │   └── language/                 # Sub-platform admin: Dictionaries, Domains, Usage
│       │       ├── domains/page.tsx
│       │       ├── dictionaries/page.tsx
│       │       └── telemetry/page.tsx
│
├── packages/
│   ├── shared/                           # Existing: Shared platform constants & error models
│   ├── core/                             # [NEW] @cybelinx/core: Validation, formatting, utilities
│   │   ├── src/
│   │   │   ├── formatting/               # Currency, Date/Time, Number, Byte formatters
│   │   │   ├── validation/               # Schema helpers, National ID, Phone, Email
│   │   │   └── utils/                    # Debounce, Throttle, DOM helpers, UUID
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                               # [NEW] @cybelinx/ui: Shared Component Library
│   │   ├── src/
│   │   │   ├── components/               # Input, TextArea, Modal, Tooltip, Toast, Search
│   │   │   ├── editors/                  # SmartTextEditor, SuggestionPopup, ActionMenu
│   │   │   ├── styles/                   # Design tokens, CSS variables, utility classes
│   │   │   └── hooks/                    # useDebounce, useKeyboardShortcut, useOnClickOutside
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── language/                         # [NEW] @cybelinx/language: Language Engine Runtime
│       ├── src/
│       │   ├── spell/                    # nspell integration, Trie index, Hunspell parser
│       │   ├── grammar/                  # Language service client, diff highlighter
│       │   ├── dictionary/               # 4-tier hierarchy resolver & IndexedDB caching
│       │   └── types/                    # Match, Suggestion, Domain, LanguageConfig
│       ├── package.json
│       └── tsconfig.json
│
├── backend/
│   ├── central-api/                      # Control Plane API (Java 21 / Spring Boot)
│   │   └── src/main/java/com/cybelinx/
│   │       └── language/                 # Language module: Dictionaries, Config, Check Proxy
│   │           ├── controller/
│   │           ├── service/
│   │           ├── repository/
│   │           └── model/
│   └── cybelinx-shared/                  # Shared Java library
│
├── dictionaries/                         # Version-controlled base dictionary wordlists
│   ├── common/                           # en-US / en-IN standard base wordlists
│   ├── healthcare/                       # Medical acronyms, pharmacology, anatomy, SNOMED/ICD
│   ├── hrms/                             # HR terminology, payroll, labor codes, compliance
│   ├── lims/                             # Assay types, chemical nomenclature, lab instruments
│   └── finance/                          # Accounting terms, taxation, banking, ledger codes
│
├── infra/
│   └── docker/
│       └── docker-compose.yml            # Ingests self-hosted LanguageTool container
```

---

# 9. SmartTextEditor & Shared Component Specifications

## 9.1 Component API Specification (`<SmartTextEditor />`)

The `<SmartTextEditor />` is the marquee component of this sub-platform. It provides a drop-in replacement for standard `<textarea>` or rich-text inputs across all Cybelinx SaaS products.

```tsx
import React from 'react';

export type LanguageDomain = 'healthcare' | 'hrms' | 'lims' | 'finance' | 'general';

export interface SmartTextEditorProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  domain?: LanguageDomain;
  tenantId?: string;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
  spellCheck?: boolean;       // Enable/disable Tier 1 local spell check (Default: true)
  grammarCheck?: boolean;     // Enable/disable Tier 2 debounced grammar check (Default: true)
  debounceGrammarMs?: number; // Milliseconds to wait before grammar API call (Default: 800ms)
  className?: string;
  onSuggestionAccepted?: (word: string, replacement: string) => void;
  onErrorStateChange?: (isDegraded: boolean) => void;
  ariaLabel?: string;
}
```

### Component Usage Examples

#### In Jioplix / Healthezee (Clinical Note):
```tsx
import { SmartTextEditor } from '@cybelinx/ui';

export const ClinicalProgressNote: React.FC = () => {
  const [note, setNote] = React.useState('');
  const { tenantId } = useTenantContext();

  return (
    <div className="clinical-card">
      <label htmlFor="progress-note">Consultation Observation</label>
      <SmartTextEditor
        id="progress-note"
        domain="healthcare"
        tenantId={tenantId}
        value={note}
        onChange={setNote}
        placeholder="Document patient history, symptoms, and examination..."
        minRows={5}
      />
    </div>
  );
};
```

#### In SynthalystHRM (Performance Review):
```tsx
<SmartTextEditor
  id="appraisal-feedback"
  domain="hrms"
  tenantId={tenant.id}
  value={feedback}
  onChange={setFeedback}
  placeholder="Provide constructive feedback on annual OKRs and key competencies..."
  minRows={4}
/>
```

#### In LIMS (Analytical Sample Observation):
```tsx
<SmartTextEditor
  id="assay-observation"
  domain="lims"
  tenantId={tenant.id}
  value={sampleRemarks}
  onChange={setSampleRemarks}
  placeholder="Record HPLC chromatogram deviations or calibration notes..."
  minRows={3}
/>
```

---

## 9.2 Shared Common UI Components (`@cybelinx/ui`)

To prevent fragmented design systems across Cybelinx products, the sub-platform ships standard atomic and molecular components:

| Component | Responsibility | Key Features |
| :--- | :--- | :--- |
| **`Input`** | Single-line text input | Built-in mask formatting (currency, phone, date), floating labels, clear button, leading/trailing icons. |
| **`TextArea`** | Multi-line text input without language engine | Auto-resizing rows, character count limits, error message display. |
| **`SearchInput`** | High-performance search field | Built-in debounce hook, clearable, loading spinner indicator, keyboard shortcut listener (`Cmd+K`). |
| **`SuggestionPopover`**| Contextual error card | Positioned anchored to misspelled token; shows top 3 suggestions, "Ignore", and "Add to Dictionary". |
| **`ConfirmationModal`**| Destructive action confirmation | Keyboard trapping, ESC to close, primary/danger action buttons, accessibility focus management. |
| **`NotificationToast`**| Platform-wide alert system | Stackable notifications (success, warning, error, info) with auto-dismiss and progress bar. |
| **`Tooltip`** | Accessible helper popup | ARIA `describedby` linking, smart collision detection, customizable delay. |

---

# 10. Language Intelligence Processing Engine

## 10.1 Dual-Tier Processing Flow

The core differentiator of the Cybelinx Language Intelligence engine is its split-execution pipeline:
1. **Tier 1 (Instant Local Spell Checking)** executes completely in-memory inside the browser within **$<300\text{ ms}$**.
2. **Tier 2 (Contextual Grammar Analysis)** executes asynchronously via the self-hosted Cybelinx Language Service, triggered only after a **$700\text{--}1000\text{ ms}$** typing pause.

```text
  User Types Keystroke
          │
          ▼
  [Client-Side Tokenizer] 
          │  Extract words & character offsets
          ▼
  ┌─────────────────────────────────────────────────────────┐
  │ TIER 1: Local Spell Check (<300 ms)                     │
  │                                                         │
  │ 1. Check against Compiled Memory Trie:                  │
  │    - Common English Dictionary (Hunspell)               │
  │    - Loaded Domain Dictionary (e.g. Healthcare)         │
  │    - Cached Tenant Custom Terms                         │
  │    - Cached User Custom Terms                           │
  │ 2. If token NOT in Trie:                                │
  │    - Mark word range with wavy red underline (~~~~)     │
  │    - Generate phonetically close suggestions (nspell)   │
  └─────────────────────────────────────────────────────────┘
          │
          ▼
  [Debounce Timer: 800 ms]
          │ (If user keeps typing, reset timer)
          ▼ (User pauses typing)
  ┌─────────────────────────────────────────────────────────┐
  │ TIER 2: Asynchronous Grammar Check (<2.0 s)             │
  │                                                         │
  │ 1. POST /api/v1/language/check { domain, tenantId, text }│
  │ 2. Backend executes Self-Hosted LanguageTool in VPC     │
  │ 3. Filter matches: Suppress any grammar flags on terms  │
  │    present in the effective domain/tenant dictionary    │
  │ 4. Return array of matches { offset, length, msg, sugg }│
  │ 5. Client renders wavy blue/amber underline (~~~~)      │
  └─────────────────────────────────────────────────────────┘
```

---

## 10.2 Interaction & Correction Lifecycle

```text
Example 1: Spelling Error
--------------------------------------------------------------------------------------
User Types:    "Patient has fevr and chills."
                           ~~~~ (Tier 1 red underline rendered immediately)

User Clicks on "fevr":
┌──────────────────────────────────────────────┐
│ fevr                                         │
│ ──────────────────────────────────────────── │
│ Suggestions:                                 │
│   ✓ fever                                    │
│     feverish                                 │
│                                              │
│ Actions:                                     │
│   Ignore Once                                │
│   Add "fevr" to Personal Dictionary          │
└──────────────────────────────────────────────┘
User selects "fever" -> Text is replaced -> Offset map dynamically updated.
```

```text
Example 2: Grammar & Contextual Error
--------------------------------------------------------------------------------------
User Types:    "Patient have fever since 3 days."
                       ^^^^
                       (Tier 2 amber underline appears after 800ms debounce)

User Clicks on "have":
┌──────────────────────────────────────────────┐
│ Possible subject-verb agreement error        │
│ ──────────────────────────────────────────── │
│ Did you mean:                                │
│   ✓ has                                      │
│                                              │
│ Explanation:                                 │
│   Singular noun "Patient" requires "has".    │
└──────────────────────────────────────────────┘
```

---

# 11. Domain Intelligence & Dictionary Hierarchy

## 11.1 The 4-Tier Dictionary Resolution Hierarchy

A key failure of generic spellcheckers is flagging valid organizational or industry jargon. Cybelinx resolves dictionaries through a strict 4-tier inheritance model:

```text
       ┌────────────────────────────────────────────────────────┐
       │ TIER 1: Cybelinx Common Base Dictionary                │
       │ (Standard en-US / en-IN English Vocabulary)            │
       └───────────────────────────┬────────────────────────────┘
                                   │ +
       ┌───────────────────────────▼────────────────────────────┐
       │ TIER 2: Domain Dictionary                              │
       │ (Healthcare / HRMS / LIMS / Finance Curated Terms)     │
       └───────────────────────────┬────────────────────────────┘
                                   │ +
       ┌───────────────────────────▼────────────────────────────┐
       │ TIER 3: Tenant Custom Dictionary                       │
       │ (Hospital X, Company Y, or Lab Z Approved Words)       │
       └───────────────────────────┬────────────────────────────┘
                                   │ +
       ┌───────────────────────────▼────────────────────────────┐
       │ TIER 4: User Personal Dictionary                       │
       │ (Individual Doctor, HR Manager, or Scientist Terms)    │
       └───────────────────────────┬────────────────────────────┘
                                   │ =
                                   ▼
                   EFFECTIVE RUNTIME DICTIONARY
```

## 11.2 Curated Domain Terminology Packs (Phase 1 Baseline)

### Domain A: Healthcare (`domain="healthcare"`)
Curated for Jioplix / Healthezee clinical workflows:
* **Administrative & Regulatory**: `OPD`, `IPD`, `MRN`, `UHID`, `ABHA`, `ABDM`, `Ayushman`, `TPA`, `MLC`, `DAMA`, `LAMA`.
* **Diagnostic & Clinical Acronyms**: `HbA1c`, `HTN`, `CAD`, `COPD`, `T2DM`, `ECG`, `ECHO`, `MRI`, `CT`, `PET`, `USG`, `CBC`, `LFT`, `KFT`, `RFT`.
* **Clinical Terminology**: `Dyspnea`, `Tachycardia`, `Bradycardia`, `Auscultation`, `Sphygmomanometer`, `Metformin`, `Paracetamol`, `Amoxicillin`, `Atorvastatin`.
* **Classifications**: `ICD-10`, `SNOMED-CT`, `CPT`, `LOINC`.

### Domain B: HRMS (`domain="hrms"`)
Curated for SynthalystHRM personnel and payroll workflows:
* **Compensation & Benefits**: `CTC`, `HRA`, `PF`, `EPFO`, `ESI`, `ESIC`, `TDS`, `Form16`, `Gratuity`, `Variable Pay`.
* **Performance & Governance**: `KPI`, `KRA`, `OKR`, `PMS`, `Appraisal`, `PIP`, `Probation`, `Attrition`.
* **Lifecycle & Operations**: `DOJ`, `LWD`, `F&F`, `Onboarding`, `Offboarding`, `Timesheet`, `Reimbursement`.

### Domain C: LIMS (`domain="lims"`)
Curated for laboratory and specimen testing workflows:
* **Quality & Compliance**: `CAPA`, `COA`, `GLP`, `GMP`, `NABL`, `ISO17025`, `QC`, `QA`, `SOP`.
* **Analytical Techniques**: `HPLC`, `GCMS`, `LCMS`, `ELISA`, `PCR`, `Spectrophotometry`, `Electrophoresis`, `Titration`.
* **Parameters & Metrics**: `LOD`, `LOQ`, `Calibration`, `Reagent`, `Aliquot`, `Supernatant`, `Centrifugation`, `Assay`.

### Domain D: Accounting & Finance (`domain="finance"`)
Curated for Smartbooks accounting and billing workflows:
* **Taxation & Compliance**: `GSTIN`, `CGST`, `SGST`, `IGST`, `UTGST`, `HSN`, `SAC`, `E-Way`, `TDS`, `TCS`.
* **Accounting Entities**: `EBITDA`, `P&L`, `GeneralLedger`, `Debtor`, `Creditor`, `Amortization`, `Depreciation`, `Reconciliation`, `TrialBalance`, `AgingAnalysis`.

### Domain E: Hospitality Management (`domain="hospitality"`)
Curated for StaySphere hotel, resort, and lodging management:
* **Revenue & Metrics**: `ADR`, `RevPAR`, `GOPPAR`, `Occupancy`, `YieldManagement`, `RackRate`, `DynamicPricing`.
* **Front Desk & Operations**: `Folio`, `PMS`, `GDS`, `OTA`, `CRS`, `NightAudit`, `Housekeeping`, `Concierge`, `Keycard`, `LateCheckOut`.

### Domain F: Real-Estate (`domain="realestate"`)
Curated for property development, leasing, and tenancy governance:
* **Legal & Regulatory**: `RERA`, `TitleDeed`, `ConveyanceDeed`, `Encumbrance`, `Escrow`, `StampDuty`.
* **Property Metrics**: `SquareFootage`, `SuperBuiltUp`, `CarpetArea`, `BuiltUpArea`, `CapRate`, `NOI`, `GrossYield`, `RentRoll`, `HOA`.

### Domain G: Trading Platform (`domain="trading"`)
Curated for equities, derivatives, algorithmic trading, and clearing operations:
* **Order Flow & Execution**: `Bid`, `Ask`, `Spread`, `Slippage`, `OrderBook`, `VWAP`, `TWAP`, `StopLoss`, `TakeProfit`, `GTC`, `IOC`, `FOK`.
* **Market Microstructure & Clearing**: `Demat`, `ClearingHouse`, `MarginCall`, `Leverage`, `ImpliedVolatility`, `Arbitrage`, `MarkToMarket`, `MTM`.

### Domain H: Pharma (`domain="pharma"`)
Curated for pharmaceutical manufacturing, formulations, and regulatory compliance:
* **Formulation & Regulatory**: `API`, `Excipient`, `ActivePharmaceuticalIngredient`, `CDMO`, `CRO`, `cGMP`, `USFDA`, `EMA`, `ScheduleH`.
* **Quality & Validation**: `BatchManufacturingRecord`, `BMR`, `Dissolution`, `Bioavailability`, `Pharmacovigilance`, `Serialization`, `ColdChain`.

### Domain I: eCommerce (`domain="ecommerce"`)
Curated for Cartlinx, online retail storefronts, merchandising, and checkout flows:
* **Merchandising & Conversions**: `SKU`, `Catalog`, `CartAbandonment`, `AOV`, `CLTV`, `ConversionRate`, `Dropshipping`.
* **Payment & Fulfillment**: `PaymentGateway`, `CashOnDelivery`, `COD`, `GMV`, `RMA`, `Chargeback`, `CrossSelling`, `UpSelling`.

### Domain J: Supply Chain Management (`domain="supplychain"`)
Curated for logistics, freight forwarding, inventory, and warehouse management (WMS/TMS):
* **Procurement & Shipping**: `PurchaseOrder`, `PurchaseRequisition`, `3PL`, `4PL`, `BillOfLading`, `BOL`, `AdvanceShippingNotice`, `ASN`.
* **Warehousing & Inventory**: `CrossDocking`, `LeadTime`, `SafetyStock`, `EconomicOrderQuantity`, `EOQ`, `Demurrage`, `LastMileDelivery`, `RFID`, `Incoterms`.

---

# 12. Privacy, Security & Data Sovereignty

This capability is engineered with strict adherence to healthcare and enterprise privacy laws.

```text
                             SECURITY ARCHITECTURE
  
       Browser Client                     Cybelinx VPC / On-Premise
  ┌───────────────────────┐            ┌──────────────────────────────────────────┐
  │                       │   HTTPS    │  ┌────────────────────────────────────┐  │
  │  - Local Spell Check  │ ─────────► │  │ Cybelinx Language Gateway          │  │
  │  - Zero PII leaves    │   TLS 1.3  │  └─────────────────┬──────────────────┘  │
  │    memory             │            │                    │                     │
  │                       │            │                    ▼                     │
  └───────────────────────┘            │  ┌────────────────────────────────────┐  │
                                       │  │ Self-Hosted LanguageTool Engine    │  │
                                       │  │ (Zero Public Internet Egress)      │  │
                                       │  └────────────────────────────────────┘  │
                                       │                                          │
                                       │  [NO TEXT LOGGED TO DISK OR TELEMETRY]   │
                                       └──────────────────────────────────────────┘
```

### Mandatory Security Controls:
1. **Zero External API Leakage**: Under no circumstance is any text payload forwarded to third-party public spell/grammar APIs (e.g., `api.languagetool.org` or OpenAI). All grammar analysis runs on internal Cybelinx-hosted containers within the private VPC.
2. **Ephemeral In-Memory Processing**: Text submitted to `POST /api/v1/language/check` is processed strictly in RAM and immediately discarded after grammar matches are generated. No submitted text is written to databases, temporary cache files, or log streams.
3. **Tenant Data Segregation**: Custom tenant terms for Tenant A are inaccessible to Tenant B. All database queries for tenant dictionaries require `cybelinx_tenant_id` as a partition/filter key.
4. **Sanitized Telemetry**: Logging captures only operational metrics (latency, HTTP status codes, word count, error match counts). **Raw text snippets or user sentences are strictly scrubbed and never appear in log files or Prometheus metrics**.
5. **Role-Based Access Control (RBAC)**:
   * End-users can add terms only to their personal dictionary.
   * Only authenticated Organization/Tenant Admins (`TENANT_ADMIN`) can approve additions to the Tenant Dictionary.
   * Only Cybelinx Platform Admins (`SUPER_ADMIN`) can modify Global Domain Dictionaries.

---

# 13. Multi-Tenant Data Model & Persistence

The backend dictionary and preference storage resides in the Cybelinx Platform PostgreSQL database under a dedicated `platform_language` schema or table namespace:

```text
                              ENTITY RELATIONSHIP MODEL
  
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │ language_domains          │             │ language_domain_terms     │
   ├───────────────────────────┤             ├───────────────────────────┤
   │ id: UUID (PK)             │1           *│ id: UUID (PK)             │
   │ domain_code: VARCHAR(32)  ├────────────►│ domain_id: UUID (FK)      │
   │ name: VARCHAR(64)         │             │ term: VARCHAR(100)        │
   │ description: TEXT         │             │ part_of_speech: VARCHAR   │
   │ version: VARCHAR(16)      │             │ created_at: TIMESTAMPTZ   │
   └───────────────────────────┘             └───────────────────────────┘
  
   ┌───────────────────────────┐             ┌───────────────────────────┐
   │ language_tenant_terms     │             │ language_user_terms       │
   ├───────────────────────────┤             ├───────────────────────────┤
   │ id: UUID (PK)             │             │ id: UUID (PK)             │
   │ tenant_id: UUID (FK)      │             │ tenant_id: UUID (FK)      │
   │ domain_code: VARCHAR(32)  │             │ user_id: VARCHAR(64)      │
   │ term: VARCHAR(100)        │             │ term: VARCHAR(100)        │
   │ status: VARCHAR(20)       │             │ created_at: TIMESTAMPTZ   │
   │ created_by: VARCHAR(64)   │             └───────────────────────────┘
   │ created_at: TIMESTAMPTZ   │
   └───────────────────────────┘
```

### Database DDL (PostgreSQL Schema)

```sql
-- 1. Domains Table
CREATE TABLE IF NOT EXISTS platform_language_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_code VARCHAR(32) UNIQUE NOT NULL, -- 'healthcare', 'hrms', 'lims', 'finance'
    name VARCHAR(64) NOT NULL,
    description TEXT,
    version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Domain Standard Terms Table
CREATE TABLE IF NOT EXISTS platform_language_domain_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES platform_language_domains(id) ON DELETE CASCADE,
    term VARCHAR(100) NOT NULL,
    normalized_term VARCHAR(100) NOT NULL, -- lowercase for index lookups
    part_of_speech VARCHAR(32),
    case_sensitive BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_domain_term UNIQUE (domain_id, normalized_term)
);
CREATE INDEX idx_lang_domain_terms ON platform_language_domain_terms(domain_id, normalized_term);

-- 3. Tenant-Specific Custom Dictionary Table
CREATE TABLE IF NOT EXISTS platform_language_tenant_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cybelinx_tenant_id UUID NOT NULL,
    domain_code VARCHAR(32) NOT NULL,
    term VARCHAR(100) NOT NULL,
    normalized_term VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED', -- 'PENDING', 'APPROVED', 'REJECTED'
    added_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_term UNIQUE (cybelinx_tenant_id, domain_code, normalized_term)
);
CREATE INDEX idx_lang_tenant_terms ON platform_language_tenant_terms(cybelinx_tenant_id, domain_code);

-- 4. User Personal Custom Dictionary Table
CREATE TABLE IF NOT EXISTS platform_language_user_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cybelinx_tenant_id UUID NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    term VARCHAR(100) NOT NULL,
    normalized_term VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_term UNIQUE (cybelinx_tenant_id, user_id, normalized_term)
);
CREATE INDEX idx_lang_user_terms ON platform_language_user_terms(cybelinx_tenant_id, user_id);

-- 5. Tenant Preferences & Feature Flags
CREATE TABLE IF NOT EXISTS platform_language_tenant_config (
    cybelinx_tenant_id UUID PRIMARY KEY,
    spell_check_enabled BOOLEAN NOT NULL DEFAULT true,
    grammar_check_enabled BOOLEAN NOT NULL DEFAULT true,
    custom_dictionary_enabled BOOLEAN NOT NULL DEFAULT true,
    default_language VARCHAR(16) NOT NULL DEFAULT 'en-IN',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

# 14. API Contracts & Specifications

All platform APIs conform to Cybelinx REST standards, using JSON payloads, UTC timestamps, and RFC 7807 Problem Details error formats.

## 14.1 Grammar & Context Check Endpoint

```http
POST /api/v1/language/check
Content-Type: application/json
Authorization: Bearer <jwt-token>
X-Tenant-Id: <cybelinx_tenant_id>
```

### Request Body:
```json
{
  "text": "Patient have fever frm 3 days.",
  "domain": "healthcare",
  "language": "en-IN",
  "options": {
    "includeSpelling": false,
    "strictPunctuation": true
  }
}
```

### Response Body (`200 OK`):
```json
{
  "matches": [
    {
      "offset": 8,
      "length": 4,
      "type": "grammar",
      "ruleId": "SUBJECT_VERB_AGREEMENT",
      "message": "Potential subject-verb agreement issue. Did you mean 'has'?",
      "suggestions": ["has"],
      "context": {
        "text": "Patient have fever",
        "offset": 8,
        "length": 4
      }
    },
    {
      "offset": 19,
      "length": 3,
      "type": "spelling",
      "ruleId": "MORFOLOGIK_RULE_EN_IN",
      "message": "Possible spelling mistake. Did you mean 'from' or 'for'?",
      "suggestions": ["from", "for"],
      "context": {
        "text": "fever frm 3 days",
        "offset": 6,
        "length": 3
      }
    }
  ],
  "engineVersion": "LanguageTool-6.4-selfhosted",
  "processingTimeMs": 142
}
```

---

## 14.2 Domain & Tenant Dictionary Retrieval Endpoint

```http
GET /api/v1/language/dictionary/{domain}?version=1.0.0
Authorization: Bearer <jwt-token>
X-Tenant-Id: <cybelinx_tenant_id>
```

### Response Body (`200 OK`):
```json
{
  "domain": "healthcare",
  "version": "1.0.4",
  "termsCount": 4250,
  "domainTerms": [
    "ABHA",
    "ABDM",
    "Dyspnea",
    "HbA1c",
    "Metformin",
    "MRN",
    "OPD",
    "UHID"
  ],
  "tenantTerms": [
    "HospitalCarePlusCode",
    "WardSuperSpecialty"
  ],
  "userTerms": [
    "DrKumarPreferredProtocol"
  ],
  "checksum": "a7b3c9d1e4f2"
}
```
*Note: Returns `304 Not Modified` when requested with matching `If-None-Match: <checksum>` header to conserve client bandwidth.*

---

## 14.3 Add Custom Word Endpoint

```http
POST /api/v1/language/dictionary/words
Content-Type: application/json
Authorization: Bearer <jwt-token>
X-Tenant-Id: <cybelinx_tenant_id>
```

### Request Body:
```json
{
  "term": "NanoHPLC",
  "domain": "lims",
  "scope": "TENANT"
}
```
*(Scope can be `"USER"` or `"TENANT"`. `"TENANT"` requires `TENANT_ADMIN` role).*

### Response Body (`201 Created`):
```json
{
  "id": "e98e4c7a-9694-4d2a-89a3-5c31cf645be2",
  "term": "NanoHPLC",
  "domain": "lims",
  "scope": "TENANT",
  "status": "APPROVED",
  "createdAt": "2026-09-22T12:00:00Z"
}
```

---

# 15. Dictionary Administration UI (`apps/admin-portal`)

Platform administrators and organization managers require dedicated tools within `apps/admin-portal` to govern vocabularies.

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CYBELINX ADMIN PORTAL — Dictionary & Vocabulary Management                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   Domain Selector: [ Healthcare ▾ ]         Tenant: [ Apollo Hospitals ▾ ]      │
│                                                                                 │
│   [ Search Term...          ]   [ + Add Term ]   [ ⇪ Import CSV ]   [ ⇩ Export ]│
│                                                                                 │
│ ┌──────────────────────┬─────────────┬─────────────┬──────────────┬───────────┐ │
│ │ Term                 │ Category    │ Added By    │ Date Added   │ Actions   │ │
│ ├──────────────────────┼─────────────┼─────────────┼──────────────┼───────────┤ │
│ │ ABHA                 │ Domain Core │ System      │ 2026-08-01   │ [View]    │ │
│ │ HbA1c                │ Domain Core │ System      │ 2026-08-01   │ [View]    │ │
│ │ OncoImmunology       │ Tenant Word │ Dr. Sharma  │ 2026-09-15   │ [Delete]  │ │
│ │ Ward-10B-Ext         │ Tenant Word │ AdminUser   │ 2026-09-18   │ [Delete]  │ │
│ └──────────────────────┴─────────────┴─────────────┴──────────────┴───────────┘ │
│                                                                                 │
│   Showing 1–4 of 4,312 terms            [ < Previous ]   [ 1 ] [ 2 ] [ Next > ] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Administrative Capabilities:
1. **Term Lifecycle Management**: Add single term, approve pending suggestions, edit casing, disable/deprecate words, or hard-delete terms.
2. **Bulk Ingestion & Export**: Upload multi-thousand-word CSVs with duplicate detection, validation, and instantaneous rollback versioning.
3. **Audit Trail**: Full visibility into which operator added a term and timestamped logs.

---

# 16. Reliability, Performance & Non-Blocking Resilience

## 16.1 Fail-Open / Non-Blocking Guarantee

The language intelligence capability is strictly classified as an **enhancement layer**, never a transactional gatekeeper.

```text
                               FAIL-OPEN FLOW
  
        User clicks "Save Clinical Note" in Jioplix
                            │
                            ▼
              Is Language Engine Unhealthy?
                 /                     \
               YES                     NO
               /                         \
    ┌───────────────────────────┐    ┌───────────────────────────┐
    │ Log warning degradation   │    │ Normal execution          │
    │ Client disables grammar   │    │ Text submitted cleanly    │
    │ highlights                │    │                           │
    │ DO NOT BLOCK NOTE SAVE    │    │                           │
    └─────────────┬─────────────┘    └─────────────┬─────────────┘
                  │                                │
                  ▼                                ▼
       Clinical Note Saved Successfully to Tenant Database
```

### Resilience Rules:
* **Circuit Breaker**: If the server-side grammar service fails 3 consecutive times or times out ($>2000\text{ ms}$), the client runtime enters degraded mode for 60 seconds, falling back exclusively to local spell-checking.
* **Non-Blocking Forms**: Form submission event handlers must **never await** language engine API responses. Saving clinical notes, HR reviews, or lab reports always takes absolute precedence.

## 16.2 Caching Strategy

To deliver snappy interactions and minimize server overhead, dictionary lookups employ aggressive multi-tiered caching:
1. **Client Tier (Browser IndexedDB)**: Stores compiled dictionary wordlists locally with an ETag/checksum. Lookups complete in $<5\text{ ms}$.
2. **Gateway Tier (HTTP Cache-Control)**: Dictionary downloads return `Cache-Control: public, max-age=86400, stale-while-revalidate=3600`.
3. **Server Tier (Redis Trie)**: The Language Service caches parsed domain and tenant terms in an in-memory Redis Trie to filter LanguageTool grammar false positives in $<10\text{ ms}$.

---

# 17. Phased Implementation Roadmap

```text
                          PHASED IMPLEMENTATION TIMELINE
  
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │   PHASE 1    │──►│   PHASE 2    │──►│   PHASE 3    │──►│   PHASE 4    │
  │ UI & Core    │   │ Language     │   │ Backend Svc  │   │ Product      │
  │ Foundation   │   │ Runtime      │   │ & Dictionaries│  │ Rollout      │
  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
         │                  │                  │                  │
         ▼                  ▼                  ▼                  ▼
  • @cybelinx/ui     • @cybelinx/       • LanguageTool     • Jioplix
  • @cybelinx/core     language           container          Integration
  • Design tokens    • nspell engine    • PostgreSQL DDL   • SynthalystHRM
  • Base Inputs      • Base wordlists   • Redis caching    • LIMS
  • Popovers         • Client trie      • /api/v1/check    • Feedback loops
```

### Phase 1: Shared UI & Core Utility Foundation (Weeks 1–3)
* Scaffold `@cybelinx/core` with formatters, validators, and debounce utilities.
* Scaffold `@cybelinx/ui` with `Input`, `TextArea`, `Modal`, `Toast`, and `Tooltip`.
* Build and package Storybook preview documentation.

### Phase 2: Client Language Engine Runtime (Weeks 4–6)
* Scaffold `@cybelinx/language` package.
* Integrate `nspell` and bundle Hunspell en-US / en-IN dictionaries.
* Build domain dictionaries for Healthcare, HRMS, and LIMS.
* Implement `<SmartTextEditor />` with client-side red underline highlights and suggestions.

### Phase 3: Central Language Service & Backend Pipeline (Weeks 7–9)
* Stand up self-hosted LanguageTool container in `infra/docker/docker-compose.yml`.
* Implement Spring Boot `/api/v1/language/*` endpoints in `backend/central-api`.
* Execute Flyway database migrations for dictionary schema.
* Connect multi-tenant dictionary resolution with Redis caching.

### Phase 4: Product Integration & Admin Console (Weeks 10–12)
* Pilot integration of `<SmartTextEditor />` in **Jioplix** (outpatient clinical notes).
* Secondary rollouts in **SynthalystHRM** (appraisals) and **LIMS** (lab remarks).
* Deploy Dictionary Management UI inside `apps/admin-portal`.

### Phase 5: Advanced AI Writing Intelligence (Future Roadmap)
* Integrate Cybelinx AI Gateway for contextual clinical note rewriting.
* User-confirmed clinical summaries and grammatical tone adjustments.
* Multi-lingual voice transcription and clinical term extraction.

---

# 18. Acceptance Criteria & Quality Gates

To ensure platform reliability before production deployment, the sub-platform must satisfy all quality gates:

### AC-01: Instant Spelling Detection
* **Given** a user types `"Patient has fevr and cough"` in `<SmartTextEditor domain="healthcare" />`,
* **When** typing pauses for $\ge 250\text{ ms}$,
* **Then** `"fevr"` is marked with a red wavy underline, clicking it displays `"fever"` as the top suggestion, and clicking `"fever"` updates the text to `"Patient has fever and cough"`.

### AC-02: Domain Term Protection (Zero False Positives)
* **Given** a user types `"Patient diagnosed with T2DM, elevated HbA1c, and placed on Metformin"` in `<SmartTextEditor domain="healthcare" />`,
* **When** Tier 1 spell-check and Tier 2 grammar-check run,
* **Then** none of `"T2DM"`, `"HbA1c"`, or `"Metformin"` are flagged as spelling or grammar errors.

### AC-03: Asynchronous Contextual Grammar Correction
* **Given** a user types `"Patient have fever since 3 days."`,
* **When** typing pauses for $800\text{ ms}$,
* **Then** the Language Service flags `"have"` as a grammar issue, presenting `"has"` as the recommended replacement.

### AC-04: Tenant Vocabulary Isolation
* **Given** Tenant A (Hospital Alpha) adds the custom term `"AlphaVascularCode"` to its tenant dictionary,
* **When** a user in Tenant B (Hospital Beta) types `"AlphaVascularCode"`,
* **Then** the term is flagged as unrecognized for Tenant B, verifying strict tenant isolation.

### AC-05: Non-Blocking Service Degradation
* **Given** the backend Language Service container is halted or unreachable,
* **When** a user types in `<SmartTextEditor />` and clicks "Save Clinical Note",
* **Then** the editor continues accepting text, local spelling remains operational, and the note saves successfully without any blocking UI exception.

### AC-06: Keyboard Accessibility & ARIA Contract
* **Given** a keyboard-only user navigates to an error highlight using `Tab` and presses `Enter`,
* **When** the `<SuggestionPopover />` opens,
* **Then** focus is trapped within the popover, arrow keys navigate suggestions, `Enter` selects a correction, and `Escape` dismisses the popover returning focus to the text cursor.

### AC-07: Domain Agnostic Reusability
* **Given** the `<SmartTextEditor />` is mounted in SynthalystHRM with `domain="hrms"`,
* **When** the user types `"Employee met KRA and CTC expectations"`,
* **Then** both `"KRA"` and `"CTC"` are accepted without requiring any custom code modifications to the underlying component.

---

# 19. Risk Analysis & Mitigation Matrix

| Risk ID | Description | Severity | Likelihood | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Server Grammar Latency**: LanguageTool execution exceeds 2000ms under high load. | High | Medium | Implement strict client-side debouncing (800ms), payload size capping (max 5,000 characters), and Redis caching of rule matches. |
| **RSK-02** | **Clinical False Negatives / Bad Suggestions**: Grammar engine suggests clinical changes that alter medical meaning. | Critical | Low | All corrections require **explicit user click confirmation**. Automated auto-correct of medical terms is strictly forbidden. |
| **RSK-03** | **Data Leakage of PHI**: Sensitive clinical notes exposed to third-party APIs or unauthorized logs. | Critical | Low | Strictly self-host LanguageTool within private Cybelinx VPC. Sanitize application logs to prohibit capturing request body text. |
| **RSK-04** | **Sub-Platform Single Point of Failure**: Outage in language service blocks business operations. | High | Low | Enforce **fail-open architecture**. Product save operations never depend on language service health. |
| **RSK-05** | **Client Bundle Bloat**: Bundling raw Hunspell dictionaries significantly increases bundle size. | Medium | High | Compile dictionaries into optimized prefix Trie structures; load language dictionaries asynchronously via dynamic chunking. |

---

# 20. Architectural Conclusion & Recommendation

The creation of the **Cybelinx Platform Shared Utilities & Language Intelligence Sub-Platform** marks a vital milestone in transforming Cybelinx from a collection of isolated software products into a cohesive, high-velocity SaaS ecosystem.

By standardizing foundational UI components (`@cybelinx/ui`), core utilities (`@cybelinx/core`), and private, domain-aware language processing (`@cybelinx/language`), Cybelinx eliminates hundreds of hours of duplicate engineering, guarantees healthcare-grade privacy, elevates user experience across all products, and constructs the necessary scaffolding for future generative AI writing assistants.

---
*End of Product Requirements Document.*
