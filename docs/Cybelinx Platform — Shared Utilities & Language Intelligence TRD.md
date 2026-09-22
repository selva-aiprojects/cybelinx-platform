# Cybelinx Multi-Tenant SaaS Platform
## Shared Utilities & Language Intelligence Sub-Platform — Technical Requirements & Detailed Workflows (TRD)

**Document Type:** Technical Requirements Document (TRD)  
**Version:** 1.0  
**Status:** Architecture Baseline  
**Owner:** Cybelinx Platform Engineering  
**Parent PRD:** [`docs/Cybelinx Platform — Shared Utilities & Language Intelligence PRD.md`](./Cybelinx%20Platform%20%E2%80%94%20Shared%20Utilities%20&%20Language%20Intelligence%20PRD.md)  
**Platform Architecture:** [`docs/architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md)  
**Target Products:** Jioplix / Healthezee, SynthalystHRM, LIMS, Smartbooks, StaySphere  

---

## 1. Document Purpose & Scope

This Technical Requirements Document (TRD) specifies the architectural blueprints, data models, API contracts, package structures, security boundaries, and execution flows for the **Cybelinx Shared Utilities & Language Intelligence Sub-Platform**.

This sub-platform provides shared, enterprise-grade UI components (`@cybelinx/ui`), core formatting/validation utilities (`@cybelinx/core`), and private, domain-aware language intelligence (`@cybelinx/language` and backend language service) across all Cybelinx SaaS products.

### Technical Scope:
1. **Client-Side Runtime (`@cybelinx/language`)**: Zero-latency ($<300\text{ ms}$), in-browser spell checker using memory-efficient prefix Trie indices and Hunspell morphology.
2. **Shared UI Library (`@cybelinx/ui`)**: Accessible, headless-compatible React components including `<SmartTextEditor />`, `<SuggestionPopover />`, masked inputs, and overlay feedback.
3. **Core Utilities (`@cybelinx/core`)**: Isomorphic validators (National IDs, GSTIN, PAN, email, phone) and formatters (multi-currency, date/time, numbers, bytes).
4. **Backend Language Service**: Modular REST endpoints under `/api/v1/language/*`, integrating self-hosted LanguageTool in private VPC containers, Redis Trie caching, and PostgreSQL multi-tenant dictionary persistence.
5. **Dictionary Hierarchy Resolution**: 4-Tier resolution algorithm: `Common` $\rightarrow$ `Domain` $\rightarrow$ `Tenant` $\rightarrow$ `User`.
6. **Zero-Trust Security & Healthcare Privacy**: Zero data leakage to public third parties, non-blocking fail-open resilience, and sanitized telemetry.

---

## 2. Architectural Principles & Platform Alignment

This sub-platform strictly adheres to the core tenets defined in [`docs/Cybelinx Central SaaS Platform — Phase 1 PRD.md`](./Cybelinx%20Central%20SaaS%20Platform%20%E2%80%94%20Phase%201%20PRD.md):

1. **Centralize Plumbing, Never Business Data**:
   - The platform owns UI components, formatting algorithms, dictionaries, and grammar rules.
   - The platform **never persists, logs, or inspects patient notes, employee reviews, or lab observations**.
2. **Canonical Tenant Context**:
   - Every API request carries the validated `cybelinx_tenant_id` extracted from Keycloak/OIDC JWT tokens. Tenant dictionaries are partitioned and queried strictly by this tenant ID.
3. **Fail-Open Resilience**:
   - Language checking is strictly an advisory layer. An outage in the language service must never block saving a clinical note or submitting an employee review.
4. **Zero External API Leakage**:
   - All language and grammar models run on internal, self-hosted Cybelinx infrastructure (Docker/Kubernetes). Keystrokes and text are never sent to external public SaaS APIs.

---

## 3. High-Level System Architecture & Component Interaction

```text
                                  BROWSER CLIENT (React 18/19 / Vite / Next.js)
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Consuming SaaS Application (e.g. Jioplix Clinical Workspace)                                           │
  │                                                                                                        │
  │  <SmartTextEditor                                                                                      │
  │     domain="healthcare"                                                                                │
  │     tenantId={tenant.id}                                                                               │
  │     value={clinicalNote}                                                                               │
  │     onChange={setClinicalNote} />                                                                      │
  │                                                                                                        │
  │  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
  │  │ @cybelinx/language Runtime                                                                       │  │
  │  │                                                                                                  │  │
  │  │   [User Input] ──► Tokenizer (Word boundary detection)                                           │  │
  │  │                         │                                                                        │  │
  │  │                         ▼                                                                        │  │
  │  │   [Tier 1: Instant Local Spell Engine]                                                           │  │
  │  │         │                                                                                        │  │
  │  │         ├─► In-Memory Prefix Trie (Common + Domain + Cached Tenant/User terms)                   │  │
  │  │         ▼                                                                                        │  │
  │  │   Mark misspelled tokens (Sub-300ms, red squiggly underlines)                                    │  │
  │  │                                                                                                  │  │
  │  │   [Tier 2: Debounced Grammar Trigger (800ms idle)]                                               │  │
  │  │         │                                                                                        │  │
  │  │         ▼ (Async fetch if text changed)                                                          │  │
  │  └─────────┼────────────────────────────────────────────────────────────────────────────────────────┘  │
  └────────────┼───────────────────────────────────────────────────────────────────────────────────────────┘
               │ HTTPS POST /api/v1/language/check
               │ Authorization: Bearer <OIDC-JWT> (claims: cybelinx_tenant_id, user_id)
               ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                   CYBELINX API GATEWAY (Spring Boot 3 / NGINX)                        │
  │                                                                                                        │
  │  - JWT Bearer Validation & Tenant Context Injection (cybelinx_tenant_id)                                │
  │  - Rate Limiting (Token Bucket: 120 req/min per user)                                                  │
  │  - Entitlement Check: Verify tenant has "language_intelligence" feature active                         │
  └────────────────────────────────────┬───────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
  ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                                   CYBELINX LANGUAGE SERVICE (Spring Boot Module)                       │
  │                                                                                                        │
  │   ┌──────────────────────────────────────────────┐     ┌───────────────────────────────────────────┐   │
  │   │ Dictionary Resolver Service                  │     │ Grammar Engine Orchestrator               │   │
  │   │                                              │     │                                           │   │
  │   │  1. Check Redis for Cached Domain/Tenant     │     │  1. Strip HTML tags / normalize encoding  │   │
  │   │     Merged Trie                              │     │  2. Forward to Self-Hosted LanguageTool   │   │
  │   │  2. Fallback to PostgreSQL Tables            │     │     (HTTP POST :8010/v2/check)            │   │
  │   │  3. Return combined whitelist terms          │     │  3. Filter out false positives matching   │   │
  │   │                                              │     │     the Tenant/Domain dictionary          │   │
  │   └──────────────────────┬───────────────────────┘     └─────────────────────┬─────────────────────┘   │
  └──────────────────────────┼───────────────────────────────────────────────────┼─────────────────────────┘
                             │                                                   │
              ┌──────────────┴──────────────┐                     ┌──────────────┴──────────────┐
              ▼                             ▼                     ▼                             ▼
    ┌───────────────────┐         ┌───────────────────┐ ┌───────────────────┐         ┌───────────────────┐
    │ Redis Cache       │         │ PostgreSQL DB     │ │ Self-Hosted       │         │ Cybelinx Outbox   │
    │ (Dictionary Trie  │         │ (platform_language│ │ LanguageTool      │         │ (Audit events:    │
    │  TTL: 1 Hour)     │         │  schema)          │ │ Container (VPC)   │         │  DICT_TERM_ADDED) │
    └───────────────────┘         └───────────────────┘ └───────────────────┘         └───────────────────┘
```

---

## 4. Dual-Tier Execution Engine Specification

### 4.1 Tier 1: Client-Side Spell Checking Engine

```text
[Keypress Event] ──► [Throttle 100ms] ──► [Tokenize Words] ──► [Trie Lookup] ──► [Render Highlight]
```

- **Target Latency**: $\le 300\text{ ms}$ from typing pause.
- **Data Structure**: Prefix Trie (`TrieNode`) holding lowercase normalized tokens.
- **Lookup Complexity**: $\mathcal{O}(L)$, where $L$ is the character length of the target word.
- **Memory Footprint**: Average domain dictionary (5,000 terms) compresses to $< 250\text{ KB}$ in RAM.
- **Suggestion Algorithm**: Bounded Damerau-Levenshtein distance (maximum edit distance: 2). Suggestions are ranked by:
  1. Exact prefix similarity
  2. Edit distance
  3. Domain vocabulary priority

### 4.2 Tier 2: Server-Side Contextual Grammar Engine

```text
[Input Stabilized (800ms)] ──► [POST /api/v1/language/check] ──► [LanguageTool] ──► [Filter Dict] ──► [Render Blue Underline]
```

- **Debounce Delay**: $800\text{ ms}$ standard (configurable $500\text{--}1500\text{ ms}$).
- **Circuit Breaker**: Client maintains a sliding window of the last 5 network calls:
  - If 3 consecutive requests fail or exceed $2500\text{ ms}$, state trips to `DEGRADED`.
  - In `DEGRADED` state, Tier 2 server checks are bypassed for 60 seconds; Tier 1 local spell-checking continues without interruption.
  - After 60 seconds, a single test probe request is dispatched (`HALF_OPEN`). Upon success, state resets to `HEALTHY`.
- **False Positive Elimination**: LanguageTool match ranges that overlap with any word in the effective Domain or Tenant dictionary are automatically suppressed before returning results to the client.

---

## 5. 4-Tier Dictionary Hierarchy & Resolution Workflow

### 5.1 Resolution Workflow
When `<SmartTextEditor domain="healthcare" tenantId="t-001" />` mounts:
1. **Local Cache Check**: The client checks browser `IndexedDB` or `localStorage` for `cybelinx_dict_healthcare_t-001`.
2. **Cache Validation**: If cached, client validates cache checksum via `GET /api/v1/language/dictionary/healthcare/checksum`. If checksum matches, local dictionary is used instantly.
3. **Fetch & Merge**: If missing or invalid, client issues `GET /api/v1/language/dictionary/healthcare`. The server merges:
   - **Tier 1**: Common Cybelinx base English words.
   - **Tier 2**: Curated domain terms (e.g. `HbA1c`, `OPD`, `MRN`, `UHID`, `Metformin`).
   - **Tier 3**: Approved tenant-specific terms for `t-001` (e.g. `ApolloCareProtocol`).
   - **Tier 4**: Authenticated user's personal terms (e.g. `DrSharmaCustomAbbr`).
4. **Runtime Indexing**: The merged term set is inserted into the client's in-memory Trie index.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     DICTIONARY RESOLUTION PRECEDENCE                   │
├────────────────────────────────────────────────────────────────────────┤
│  User Custom Terms         (Highest priority - personal overrides)     │
│         ▲                                                              │
│         │ overrides                                                    │
│  Tenant Custom Terms       (Organization-wide approved jargon)         │
│         ▲                                                              │
│         │ overrides                                                    │
│  Domain Curated Terms      (Healthcare / HRMS / LIMS / Finance)        │
│         ▲                                                              │
│         │ overrides                                                    │
│  Common English Vocabulary (Base standard dictionary)                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Monorepo Package Scaffolding & Specifications

### 6.1 Monorepo Structure

```text
packages/
├── core/                                 # @cybelinx/core
│   ├── src/
│   │   ├── formatting/                   # Currency, Date/Time, Numbers, Bytes
│   │   ├── validation/                   # National IDs (Aadhaar, PAN, GSTIN), Email, Phone
│   │   ├── utils/                        # Debounce, Throttle, DeepMerge, GenerateId
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.build.json
│
├── language/                             # @cybelinx/language
│   ├── src/
│   │   ├── types/                        # Domain, Match, Suggestion, Config interfaces
│   │   ├── spell/                        # Trie implementation & Levenshtein suggestion engine
│   │   ├── dictionary/                   # 4-Tier Resolver, Cache, and Checksum engine
│   │   ├── grammar/                      # Debounced API client, Circuit Breaker, Fail-Open handler
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.build.json
│
├── ui/                                   # @cybelinx/ui
│   ├── src/
│   │   ├── styles/                       # CSS Variables, Design Tokens, Squiggly animations
│   │   ├── hooks/                        # useDebounce, useOnClickOutside, useLanguageCheck
│   │   ├── components/                   # Input, TextArea, SearchInput, Popover, Modal, Toast
│   │   ├── editors/                      # SmartTextEditor marquee component
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── tsconfig.build.json
│
dictionaries/                             # Base Domain Wordlists
├── common/en-common.json
├── healthcare/medical-terms.json
├── hrms/hrms-terms.json
├── lims/lims-terms.json
├── finance/finance-terms.json
├── hospitality/hospitality-terms.json
├── realestate/realestate-terms.json
├── trading/trading-terms.json
├── pharma/pharma-terms.json
├── ecommerce/ecommerce-terms.json
└── supplychain/supplychain-terms.json
```

---

## 7. Database Schemas & Persistence Model

Dictionary data is stored in the Cybelinx Platform PostgreSQL instance under the `platform_language` schema.

```sql
-- Migration: V2_0__create_platform_language_schema.sql

CREATE SCHEMA IF NOT EXISTS platform_language;

-- 1. Language Domains
CREATE TABLE IF NOT EXISTS platform_language.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(64) NOT NULL,
    description TEXT,
    version VARCHAR(16) NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Domain Standard Words
CREATE TABLE IF NOT EXISTS platform_language.domain_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES platform_language.domains(id) ON DELETE CASCADE,
    term VARCHAR(100) NOT NULL,
    normalized_term VARCHAR(100) NOT NULL,
    category VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_domain_term UNIQUE (domain_id, normalized_term)
);
CREATE INDEX idx_domain_terms_lookup ON platform_language.domain_terms(domain_id, normalized_term);

-- 3. Tenant Custom Words
CREATE TABLE IF NOT EXISTS platform_language.tenant_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cybelinx_tenant_id UUID NOT NULL,
    domain_code VARCHAR(32) NOT NULL,
    term VARCHAR(100) NOT NULL,
    normalized_term VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    added_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_domain_term UNIQUE (cybelinx_tenant_id, domain_code, normalized_term)
);
CREATE INDEX idx_tenant_terms_lookup ON platform_language.tenant_terms(cybelinx_tenant_id, domain_code);

-- 4. User Personal Custom Words
CREATE TABLE IF NOT EXISTS platform_language.user_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cybelinx_tenant_id UUID NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    term VARCHAR(100) NOT NULL,
    normalized_term VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_domain_term UNIQUE (cybelinx_tenant_id, user_id, normalized_term)
);
CREATE INDEX idx_user_terms_lookup ON platform_language.user_terms(cybelinx_tenant_id, user_id);

-- 5. Tenant Configuration
CREATE TABLE IF NOT EXISTS platform_language.tenant_config (
    cybelinx_tenant_id UUID PRIMARY KEY,
    spell_check_enabled BOOLEAN NOT NULL DEFAULT true,
    grammar_check_enabled BOOLEAN NOT NULL DEFAULT true,
    custom_dictionary_enabled BOOLEAN NOT NULL DEFAULT true,
    default_language VARCHAR(16) NOT NULL DEFAULT 'en-IN',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. REST API Contracts & Specifications

### 8.1 Check Grammar & Language Endpoint

`POST /api/v1/language/check`

#### Headers:
```http
Authorization: Bearer <JWT>
X-Tenant-Id: <cybelinx_tenant_id>
Content-Type: application/json
```

#### Request:
```json
{
  "text": "Patient have acute dyspnea since 2 days.",
  "domain": "healthcare",
  "language": "en-IN",
  "options": {
    "includeSpelling": false,
    "strictPunctuation": true
  }
}
```

#### Response (`200 OK`):
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
        "text": "Patient have acute dyspnea",
        "offset": 8,
        "length": 4
      }
    }
  ],
  "engineVersion": "LanguageTool-6.4-selfhosted",
  "processingTimeMs": 115
}
```

#### Error Response (RFC 7807 Problem Details):
```json
{
  "type": "https://api.cybelinx.com/errors/rate-limit-exceeded",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Language check rate limit of 120 requests per minute exceeded.",
  "instance": "/api/v1/language/check",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## 9. Accessibility (WCAG 2.1 AA) & Keyboard Contract

The `<SmartTextEditor />` and `<SuggestionPopover />` satisfy strict accessibility guidelines:
- **Focus Management**: Navigating to an error token via keyboard (`Alt + DownArrow` or `Tab`) opens the `<SuggestionPopover />`.
- **Focus Trapping**: Inside the popover, arrow keys navigate suggestions.
- **Hotkeys**:
  - `Enter`: Accepts currently focused suggestion and returns focus to text.
  - `Escape`: Dismisses popover without change, preserving cursor position.
  - `Alt + I`: Ignores once.
  - `Alt + A`: Adds term to dictionary.
- **Screen Reader Announcements**: An `aria-live="polite"` region announces: `"1 spelling error detected: 'fevr'. Press Alt+Down for suggestions."`

---

## 10. Observability, Telemetry & Non-PII Metrics

In adherence to healthcare compliance standards, Prometheus metrics and structured logs capture operational metadata only:

| Metric Name | Type | Labels | Description |
| :--- | :--- | :--- | :--- |
| `cybelinx_lang_requests_total` | Counter | `domain`, `status`, `tenant_id` | Total language check requests |
| `cybelinx_lang_latency_seconds` | Histogram | `domain`, `tier` | Execution latency distribution |
| `cybelinx_lang_cache_hits_total`| Counter | `cache_tier` (indexeddb, redis) | Dictionary cache hit count |
| `cybelinx_lang_circuit_trips` | Counter | `state` (degraded, open, closed) | Circuit breaker status transitions |
| `cybelinx_lang_words_checked` | Counter | `domain` | Total count of words evaluated (NO text stored) |

---
*End of Technical Requirements Document.*
