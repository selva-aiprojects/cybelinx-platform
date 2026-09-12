# Cybelinx Central SaaS Platform
## Phase 1 — Multi-Tenant SaaS Control Plane & Event Foundation

**Document Type:** Product Requirements Document  
**Version:** 1.0  
**Status:** Proposed / Architecture Baseline  
**Owner:** Cybelinx  
**Phase:** Phase 1  
**Primary Objective:** Centralize common SaaS infrastructure while preserving independent product ownership and deployment.

---

# 1. Executive Summary

Cybelinx currently operates multiple independently developed SaaS products. Each product has its own implementation of tenant management, Nexus/control data, authentication/authorization concepts, provisioning logic, and operational synchronization.

As the number of products and tenants increases, maintaining these capabilities independently creates:

- duplicated functionality
- inconsistent security models
- duplicated tenant-management logic
- duplicated user/RBAC implementations
- difficult cross-product administration
- difficult tenant lifecycle management
- inconsistent auditing
- database-trigger dependencies
- increasing maintenance cost
- difficulty supporting different tenant-isolation requirements

Cybelinx will therefore introduce a **Central SaaS Platform / Control Plane**.

The Control Plane will own **global SaaS concerns**, while individual products continue to own their **business functionality and business data**.

The architecture will follow:

> **Centralize SaaS plumbing, not business applications.**

The platform will provide a common foundation for:

- Identity
- Authentication / SSO
- Tenant Registry
- User Membership
- Global RBAC foundation
- Product Registry
- Product Entitlements
- Tenant Resource Registry
- Tenant Context
- Tenant Provisioning
- Database/resource security metadata
- Event and messaging foundation
- Platform audit
- Usage/metering foundation
- Compliance/security metadata

Individual products will continue to own:

- business workflows
- business entities
- product-specific configuration
- product-specific permissions
- product databases
- tenant business data
- product-specific Nexus functionality

---

# 2. Phase 1 Vision

The target experience is:

```text
                         CYBELINX
                    CENTRAL PLATFORM
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     Identity          Tenant Mgmt       Product Mgmt
        │                  │                  │
        ├──────────────┬───┴───────┬──────────┤
        │              │           │
       RBAC       Resource Registry │
        │              │           │
        └──────────────┼───────────┘
                       │
                 Tenant Context
                       │
       ┌───────────────┼────────────────┐
       │               │                │
       ▼               ▼                ▼
    Jioplix       Jioplix Smart        LIMS
       │               │                │
    Product          Product          Product
    Nexus            Nexus            Nexus
       │               │                │
    Tenant DB       Tenant DB        Tenant DB
       │               │                │
    Outbox          Outbox           Outbox
       └───────────────┼────────────────┘
                       ▼
                Event / Messaging
                       │
              ┌────────┼─────────┐
              ▼        ▼         ▼
            Usage     Audit    Analytics
```

The Central Platform knows:

> **Who the tenant is, which products they use, who can access them, and where their product resources reside.**

It does **not** own the product's business data.

---

# 3. Goals

## 3.1 Primary Goals

### G1 — Centralize Tenant Identity

Create one canonical Cybelinx Tenant ID.

Every product should eventually reference:

```text
cybelinx_tenant_id
```

rather than independently creating an unrelated global tenant identity.

---

### G2 — Centralize Identity

Provide a common identity layer for users accessing multiple Cybelinx products.

A user should not need separate credentials for:

- Jioplix
- Jioplix Smart
- LIMS
- StoreAI
- SynthalystHRM
- future Cybelinx products

---

### G3 — Centralize Membership

Maintain the relationship:

```text
User
  ↓
Tenant
  ↓
Product
  ↓
Role
  ↓
Permissions
```

---

### G4 — Centralize Product Entitlements

The platform should determine whether a tenant is entitled to a particular product.

Example:

```text
Tenant: T001

Jioplix       → Enabled
LIMS          → Enabled
StoreAI       → Disabled
HRM           → Enabled
```

---

### G5 — Centralize Tenant Resource Management

The platform must know where a tenant's product data resides.

The model must NOT assume:

```text
Tenant = Schema
```

Instead:

```text
Tenant
   ↓
Product
   ↓
Resource
   ↓
Isolation Mode
```

Supported isolation modes:

1. Pool/shared
2. Schema-per-tenant
3. Dedicated database
4. Future dedicated infrastructure

---

### G6 — Centralize Tenant Provisioning

Provisioning should become standardized.

Example:

```text
Create Tenant
      ↓
Create Membership
      ↓
Enable Product
      ↓
Resolve Resource
      ↓
Provision Schema / DB
      ↓
Create Product Configuration
      ↓
Create Initial Admin
      ↓
Activate Tenant
```

---

### G7 — Establish Event Architecture

Replace direct cross-system database triggers with an asynchronous event model.

Target:

```text
Business Transaction
       ↓
Outbox
       ↓
Event Worker
       ↓
Central Event Processing
       ↓
Usage / Audit / Platform
```

---

### G8 — Establish Security Foundation

Phase 1 must establish the architecture required to support:

- strong tenant isolation
- least privilege
- encryption
- auditability
- credential separation
- access control
- secure provisioning
- regulatory requirements

The platform should be **designed for GDPR/HIPAA requirements**, while recognizing that technical implementation alone does not constitute legal/regulatory compliance.

---

# 4. Non-Goals

The following are explicitly OUT OF SCOPE for Phase 1.

## 4.1 Business Feature Consolidation

Do not attempt to merge overlapping functionality between products.

For example:

```text
LIMS
StoreAI
Jioplix
HRM
```

remain independent products.

---

## 4.2 Central Business Database

The platform must NOT become a centralized database containing:

- patients
- laboratory samples
- inventory
- invoices
- employees
- prescriptions
- hospital transactions
- product-specific business records

---

## 4.3 Central Product Nexus Replacement

Existing product Nexus implementations will not be removed immediately.

Migration will be gradual.

---

## 4.4 Demand Forecasting

The future concept:

```text
Leads
 ↓
Conversion
 ↓
Expected Tenants
 ↓
Resource Demand
 ↓
Capacity
 ↓
Readiness
```

is reserved for Phase 2+.

---

## 4.5 Advanced Infrastructure Orchestration

Do not initially introduce:

- Kubernetes
- Kafka clusters
- complex service mesh
- multi-region active-active architecture
- dedicated infrastructure per tenant
- complex data lake
- enterprise-scale observability stack

unless actual scale requires them.

---

# 5. Architecture Principles

## P1 — Centralize SaaS Plumbing

The following should eventually be centralized:

- Identity
- Tenant Registry
- Membership
- Global RBAC foundation
- Product Registry
- Entitlements
- Resource Registry
- Provisioning
- Tenant Context
- Platform Audit
- Event Foundation

---

## P2 — Products Own Their Business Domains

Each product owns:

- business rules
- workflows
- domain entities
- business data
- product-specific configuration
- product-specific authorization

---

## P3 — Tenant Identity Is Independent of Storage

Never make the architecture dependent on:

```text
tenant_id = schema_name
```

Instead:

```text
tenant_id
   ↓
resource_id
   ↓
storage_type
```

---

## P4 — Central Platform Must Not Know Product Tables

The Control Plane should not know tables such as:

```text
patient
sample
inventory
invoice
prescription
employee
```

It should only know platform-level concepts.

---

## P5 — Products Must Not Depend on the Physical Storage Model

A product should not care whether the tenant uses:

```text
Schema
```

or:

```text
Dedicated Database
```

The Tenant Resource Resolver abstracts this.

---

## P6 — No Cross-Database Business Queries

The Control Plane must not periodically query every tenant database to determine platform state.

Use:

```text
Event / Usage / Snapshot
```

instead.

---

## P7 — Least Privilege

Applications must never use PostgreSQL superuser credentials.

Database access should use controlled roles.

---

## P8 — Compliance by Design

Security, privacy, auditability, retention, encryption, and data isolation must be considered from the beginning.

---

# 6. High-Level Components

## 6.1 Identity Service

Responsibilities:

- user identity
- authentication
- session/token management
- SSO
- password/MFA integration
- account lifecycle

The platform becomes the identity authority for Cybelinx applications.

---

# 7. Tenant Registry

The Tenant Registry is the authoritative source for Cybelinx tenant identity.

### Core entity

```text
Tenant
```

Suggested attributes:

```text
tenant_id
tenant_code
tenant_name
status
tenant_type
region
country
timezone
created_at
updated_at
```

Possible lifecycle:

```text
PROSPECT
   ↓
PROVISIONING
   ↓
ACTIVE
   ↓
SUSPENDED
   ↓
DEACTIVATED
   ↓
ARCHIVED
```

---

# 8. User & Membership Model

A user is not inherently a tenant administrator.

The relationship is:

```text
User
  │
  ├── Tenant A
  │      └── Admin
  │
  └── Tenant B
         └── User
```

Core entities:

```text
users
tenants
tenant_memberships
roles
permissions
role_permissions
membership_roles
```

---

# 9. RBAC

Phase 1 will establish a global RBAC foundation.

Example global roles:

```text
CYBELINX_PLATFORM_ADMIN
CYBELINX_SUPPORT
TENANT_OWNER
TENANT_ADMIN
TENANT_USER
```

Products can extend this with product-specific roles.

Example:

```text
Jioplix:
  Doctor
  Nurse
  Receptionist
  Billing User

LIMS:
  Lab Admin
  Lab Technician
  Quality Manager
```

The platform does not need to understand what a Doctor or Lab Technician does internally.

---

# 10. Product Registry

The Product Registry maintains all Cybelinx SaaS products.

Example:

```text
product_id
product_code
product_name
version
status
base_url
environment
```

Example:

```text
JIOPLIX
JIOPLIX_SMART
LIMS
STOREAI
SYNTHALYST_HRM
```

---

# 11. Tenant Product Subscription / Entitlement

A tenant may have multiple products.

Entity:

```text
tenant_products
```

Suggested fields:

```text
tenant_product_id
tenant_id
product_id
plan_id
status
activated_at
expires_at
```

Example:

```text
Tenant T001

Jioplix       ACTIVE
LIMS          ACTIVE
StoreAI       ACTIVE
HRM           INACTIVE
```

---

# 12. Tenant Resource Registry

This is one of the most important components.

The platform must maintain:

```text
Tenant
   ↓
Product
   ↓
Resource
```

Example:

```text
tenant_id: T001
product_id: JIOPLIX

resource_id: R001
isolation_mode: SCHEMA
database_id: DB-JIOPLIX-PROD
schema_name: tenant_t001
region: INDIA
status: ACTIVE
```

---

# 13. Supported Storage Models

## 13.1 Pool

Multiple tenants share infrastructure/database.

```text
DB
 ├── Tenant A
 ├── Tenant B
 └── Tenant C
```

---

## 13.2 Schema-per-Tenant

Current preferred model for many products.

```text
PostgreSQL
 ├── tenant_a
 ├── tenant_b
 └── tenant_c
```

---

## 13.3 Dedicated Database

For enterprise/regulatory requirements:

```text
Tenant A
   ↓
Dedicated PostgreSQL DB
```

The application stack can still remain shared.

---

## 13.4 Dedicated Infrastructure

Future option:

```text
Tenant
 ↓
Dedicated DB
 ↓
Dedicated Runtime
 ↓
Dedicated Network
```

Reserved for customers with sufficiently strong requirements.

---

# 14. Database Security Model

Phase 1 will use PostgreSQL role-based security.

The following rules apply:

### Rule 1

Applications must not use PostgreSQL superuser accounts.

### Rule 2

Schema owners should preferably be `NOLOGIN` roles.

### Rule 3

Application runtime roles receive only required permissions.

### Rule 4

Provisioning/migration roles are separate from runtime roles.

### Rule 5

Dedicated database tenants receive dedicated credentials.

### Rule 6

Secrets are stored outside the platform database.

The platform stores:

```text
credential_reference
```

not:

```text
password
```

---

# 15. Example PostgreSQL Role Model

For a product:

```text
jioplix_app
jioplix_provisioner
jioplix_readonly
```

For a tenant schema:

```text
tenant_001_owner
tenant_002_owner
```

The owner roles should not necessarily be login roles.

The runtime application connects using the controlled application role.

Per-tenant login credentials should be introduced only when the isolation/security requirements justify the operational complexity.

---

# 16. Tenant Resource Resolver

Products should not construct database/schema information themselves.

Instead:

```text
Product
  ↓
Tenant Context
  ↓
Resource Resolver
  ↓
Resource Registry
  ↓
Database / Schema
```

Input:

```text
tenant_id
product_id
```

Output:

```text
resource_id
database
schema
isolation_mode
region
credential_reference
```

---

# 17. Tenant Context

Every authenticated request should establish:

```text
user_id
tenant_id
product_id
roles
permissions
```

Example:

```text
JWT / Session Context

user_id: U1001
tenant_id: T00045
product_id: LIMS
roles:
  - LAB_ADMIN
```

The product uses this context to determine access.

---

# 18. Tenant Context Security

The tenant context must be:

- authenticated
- validated
- immutable for the request
- derived from trusted identity/authorization
- never blindly accepted from a client-supplied tenant ID

For example, a malicious request must not be able to simply change:

```text
tenant_id=T001
```

to:

```text
tenant_id=T002
```

and gain access.

---

# 19. Provisioning Service

The provisioning service manages tenant lifecycle.

## New Tenant

```text
Create Tenant
      ↓
Generate tenant_id
      ↓
Create Membership
      ↓
Enable Product
      ↓
Determine Isolation
      ↓
Allocate Resource
      ↓
Create Schema / DB
      ↓
Run Product Migration
      ↓
Create Product Admin
      ↓
Validate
      ↓
ACTIVE
```

Provisioning should be idempotent.

If provisioning fails halfway:

```text
PROVISIONING_FAILED
```

and the process can safely retry.

---

# 20. Existing Product Migration

Existing products must not be broken.

Migration strategy:

```text
Existing Product
      │
      ▼
Product Nexus
      │
      ▼
Adapter
      │
      ▼
Cybelinx Control Plane
```

The product can initially maintain its existing Nexus while progressively consuming central services.

---

# 21. Product Nexus Responsibilities After Phase 1

Product Nexus remains responsible for:

- product configuration
- product-specific settings
- product feature configuration
- product-specific workflow metadata
- product-specific operational settings

It should gradually stop owning:

- global tenant identity
- global user identity
- cross-product membership
- global product registry
- global provisioning
- global entitlement
- global audit
- global usage metering

---

# 22. Event Architecture

The platform will replace direct database-trigger synchronization with an Outbox/Event architecture.

Target:

```text
Product Transaction
       │
       ├── Business Data
       │
       └── Outbox Event
               │
               ▼
          Event Worker
               │
               ▼
       Central Event Processing
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
     Usage    Audit   Analytics
```

---

# 23. Outbox Pattern

The product database contains an `outbox_events` table.

Example:

```text
event_id
tenant_id
product_id
event_type
entity_type
entity_id
payload
created_at
published_at
retry_count
status
```

The business transaction and event insertion happen in the same transaction.

This prevents the problem:

```text
Business update succeeds
BUT
event publishing fails
```

---

# 24. Event Structure

Standard event:

```json
{
  "event_id": "EVT-123456",
  "event_type": "TENANT_USAGE_UPDATED",
  "tenant_id": "T001",
  "product_id": "LIMS",
  "entity_type": "USAGE",
  "entity_id": "U001",
  "occurred_at": "2026-09-11T10:00:00Z",
  "payload": {}
}
```

Minimum mandatory fields:

- event_id
- tenant_id
- product_id
- event_type
- occurred_at

Recommended:

- entity_type
- entity_id
- correlation_id
- source
- schema_version

---

# 25. Event Types

Phase 1 should focus only on platform-relevant events.

Examples:

```text
TENANT_CREATED
TENANT_UPDATED
TENANT_ACTIVATED
TENANT_SUSPENDED

PRODUCT_ENABLED
PRODUCT_DISABLED

USER_INVITED
USER_ACTIVATED
USER_DEACTIVATED

TENANT_RESOURCE_CREATED
TENANT_RESOURCE_UPDATED

USAGE_UPDATED

AUDIT_EVENT

PROVISIONING_STARTED
PROVISIONING_COMPLETED
PROVISIONING_FAILED
```

Products do NOT need to publish every business-table update.

---

# 26. Event Processing

Initially use a lightweight architecture.

Recommended:

```text
PostgreSQL Outbox
       ↓
Lightweight Worker
       ↓
Central Event Store / Queue
```

Do not introduce Kafka initially.

Kafka or another managed event platform can be introduced later without changing the product event contract.

---

# 27. Idempotency

Every event must have a unique `event_id`.

Consumers must safely process the same event more than once.

Example:

```text
EVT-1001
     ↓
Consumer processes
     ↓
Consumer records EVT-1001
```

If EVT-1001 arrives again:

```text
Already processed
     ↓
Ignore / safely return
```

---

# 28. Usage & Metering Foundation

Phase 1 will establish the event foundation required for future usage reporting.

Potential metrics:

```text
Active Users
Active Tenants
Transactions
API Calls
Storage Usage
Document Count
Records Processed
Product Usage
```

However, advanced billing/metering is not required in Phase 1.

---

# 29. Audit

The platform should capture platform-level audit events.

Examples:

```text
User Login
Tenant Created
User Added
Role Changed
Product Enabled
Tenant Suspended
Resource Provisioned
Resource Changed
Administrative Action
```

Audit record:

```text
audit_id
tenant_id
user_id
product_id
action
resource_type
resource_id
timestamp
source
ip_reference
metadata
```

Audit data should be append-oriented and protected from normal application modification.

---

# 30. Security Requirements

## Authentication

- Secure authentication
- MFA capability
- session/token expiry
- secure token validation
- logout/revocation support

## Authorization

- tenant-aware authorization
- role-based access
- least privilege
- deny-by-default

## Database

- encrypted connections
- no superuser application access
- restricted network access
- role-based permissions
- credential rotation capability

## Secrets

Never store:

- DB passwords
- API keys
- signing secrets

inside normal application tables.

Store only references where necessary.

---

# 31. GDPR-Oriented Requirements

The architecture should support:

- data minimization
- purpose limitation
- tenant data isolation
- user access requests
- correction
- deletion workflows
- retention policies
- auditability
- consent-related integration where applicable
- data export
- data residency metadata

The platform should maintain metadata identifying where tenant data resides.

---

# 32. HIPAA-Oriented Requirements

For healthcare products such as Jioplix/Jioplix Smart, the architecture should support:

- strong tenant isolation
- least-privilege access
- authentication
- authorization
- audit trails
- encryption in transit
- encryption at rest
- controlled administrative access
- backup/recovery
- incident response capability
- access monitoring

HIPAA compliance will also require organizational, contractual, operational, and policy controls beyond this software platform.

---

# 33. Data Residency

Resource Registry should support:

```text
region
country
data_residency_policy
```

Example:

```text
Tenant T001
Product JIOPLIX
Region: India
Residency: IN
```

This allows future customers to require specific geographic data placement without redesigning the tenant model.

---

# 34. Central Platform Database

The Central Platform DB should contain only platform metadata.

Suggested logical areas:

```text
identity
tenancy
membership
rbac
products
entitlements
resources
provisioning
audit
events
configuration
```

It should NOT contain product business tables.

---

# 35. Suggested Core Tables

## Identity

```text
users
user_identities
sessions
```

## Tenancy

```text
tenants
tenant_settings
tenant_status_history
```

## Membership

```text
tenant_memberships
membership_roles
```

## RBAC

```text
roles
permissions
role_permissions
```

## Products

```text
products
product_versions
tenant_products
plans
entitlements
```

## Resources

```text
resources
tenant_resources
databases
schemas
regions
```

## Provisioning

```text
provisioning_jobs
provisioning_steps
provisioning_history
```

## Audit

```text
audit_events
```

## Events

```text
platform_events
event_consumers
event_processing
```

---

# 36. API Layer

The Control Plane should expose versioned APIs.

Example:

```text
/api/v1/auth
/api/v1/users
/api/v1/tenants
/api/v1/memberships
/api/v1/products
/api/v1/entitlements
/api/v1/resources
/api/v1/provisioning
/api/v1/events
/api/v1/audit
```

---

# 37. Example Tenant APIs

```http
POST /api/v1/tenants
GET /api/v1/tenants/{tenant_id}
PATCH /api/v1/tenants/{tenant_id}
POST /api/v1/tenants/{tenant_id}/activate
POST /api/v1/tenants/{tenant_id}/suspend
```

---

# 38. Example Product APIs

```http
GET /api/v1/products
POST /api/v1/tenants/{tenant_id}/products
DELETE /api/v1/tenants/{tenant_id}/products/{product_id}
GET /api/v1/tenants/{tenant_id}/products
```

---

# 39. Resource APIs

```http
GET /api/v1/tenants/{tenant_id}/resources
POST /api/v1/tenants/{tenant_id}/resources
GET /api/v1/resources/{resource_id}
PATCH /api/v1/resources/{resource_id}
```

---

# 40. Provisioning APIs

```http
POST /api/v1/provisioning/tenants
GET /api/v1/provisioning/{job_id}
POST /api/v1/provisioning/{job_id}/retry
```

---

# 41. Product Integration Model

Each product integrates with the platform through a small SDK/adaptor.

Concept:

```text
@cybelinx/saas-core
```

Possible capabilities:

```text
getCurrentUser()
getTenantContext()
validateTenant()
checkEntitlement()
getResource()
publishEvent()
writeAudit()
```

The SDK should abstract platform implementation details.

---

# 42. Product Request Flow

Example:

```text
User
 ↓
Login
 ↓
Cybelinx Identity
 ↓
Token
 ↓
Jioplix
 ↓
Validate Token
 ↓
Resolve Tenant Context
 ↓
Check Entitlement
 ↓
Resolve Product Resource
 ↓
Access Tenant Data
```

---

# 43. Tenant Isolation Flow

```text
Request
   ↓
Authenticated User
   ↓
Tenant Context
   ↓
Tenant Membership Validation
   ↓
Product Entitlement
   ↓
Resource Resolution
   ↓
Database / Schema
   ↓
Business Operation
```

Every layer should preserve tenant boundaries.

---

# 44. Error Handling

Standard error codes should be introduced.

Examples:

```text
TENANT_NOT_FOUND
TENANT_INACTIVE
TENANT_ACCESS_DENIED
PRODUCT_NOT_ENTITLED
RESOURCE_NOT_FOUND
RESOURCE_NOT_READY
PROVISIONING_FAILED
INVALID_TENANT_CONTEXT
UNAUTHORIZED
FORBIDDEN
```

---

# 45. Observability

Phase 1 should capture:

- application logs
- API errors
- authentication events
- provisioning status
- event processing failures
- database connection failures
- tenant resource status

Each log should ideally include:

```text
tenant_id
product_id
correlation_id
request_id
```

Sensitive business data must not be logged.

---

# 46. Backup & Recovery

Central platform metadata must have:

- automated backups
- point-in-time recovery where available
- retention policy
- restoration procedure
- backup validation

Product databases retain their existing backup strategy.

---

# 47. Availability

Phase 1 target:

### Control Plane

Target:

```text
99.5%+
```

Initially, avoid expensive high-availability infrastructure unless required by customer commitments.

---

# 48. Performance Targets

Indicative targets:

| Operation | Target |
|---|---:|
| Authentication validation | <500 ms |
| Tenant lookup | <200 ms |
| Entitlement lookup | <200 ms |
| Resource lookup | <200 ms |
| Normal platform API | <500 ms |
| Event processing | <30 sec |
| Provisioning | Depends on resource |

These are initial engineering targets and should be validated under realistic load.

---

# 49. Cost Strategy

Phase 1 should reuse existing infrastructure.

Expected new infrastructure:

```text
Central Platform
      +
Lightweight Event Worker
      +
Messaging/Event Storage
```

Avoid initially:

```text
Kafka Cluster
Kubernetes
Dedicated Redis Cluster
Dedicated API Gateway
Enterprise Service Mesh
Data Lake
```

Target incremental infrastructure budget:

> **Approximately ₹500–₹2,500/month initially**, assuming existing environments can host/reuse the required platform components and usage remains modest.

The architecture should allow infrastructure to scale independently later.

---

# 50. Initial Technology Direction

Technology should remain aligned with the existing Cybelinx ecosystem.

Preferred baseline:

```text
Backend:
Node.js / TypeScript or existing preferred framework

Database:
PostgreSQL

Frontend:
React / Next.js where required

Authentication:
Managed identity or centralized auth implementation

Hosting:
Existing Vercel / current cloud infrastructure

Event:
PostgreSQL Outbox + Lightweight Worker

Secrets:
Managed secrets mechanism

Monitoring:
Existing/free-tier monitoring initially
```

Technology selection should follow the canonical data model rather than drive it.

---

# 51. Phase 1 Implementation Stages

## Stage 1 — Foundation

Build:

- platform repository
- platform DB
- Tenant Registry
- Product Registry
- Resource Registry
- basic API framework

---

## Stage 2 — Identity

Build:

- centralized user identity
- login
- session/token
- tenant membership
- basic roles

---

## Stage 3 — Tenant Context

Build:

- tenant context
- product context
- entitlement validation
- resource resolution

---

## Stage 4 — Provisioning

Build:

- tenant creation
- product activation
- resource allocation
- schema provisioning
- admin creation
- provisioning state machine

---

## Stage 5 — Event Foundation

Build:

- outbox
- event contracts
- event worker
- central event processing
- retry
- idempotency

---

## Stage 6 — Audit & Security

Build:

- platform audit
- security events
- credential references
- access logging
- security policies

---

## Stage 7 — Pilot Integration

Recommended pilot products:

```text
Jioplix
Jioplix Smart
```

Do NOT use Healthezee as the Cybelinx platform pilot because it is externally owned.

---

## Stage 8 — Second-Wave Integration

After validating the platform:

```text
LIMS
StoreAI
SynthalystHRM
Other Cybelinx products
```

---

# 52. Pilot Success Criteria

The pilot is successful when:

### Tenant

A tenant can be created centrally.

### Identity

A user can log in once.

### Membership

The user can belong to multiple tenants.

### Product

A tenant can be entitled to multiple products.

### Resource

Each tenant-product combination can map to a resource.

### Isolation

A tenant cannot access another tenant's data.

### Provisioning

A new tenant can be provisioned without manually modifying application code.

### Events

Product events reach the central platform reliably.

### Audit

Important platform actions are recorded.

### Existing Product

Jioplix/Jioplix Smart business functionality remains unchanged.

---

# 53. Key Acceptance Scenarios

## Scenario 1 — New Tenant

```text
Admin creates Tenant A
       ↓
Tenant ID generated
       ↓
Jioplix enabled
       ↓
Schema allocated
       ↓
Admin created
       ↓
Tenant ACTIVE
```

---

## Scenario 2 — Same User, Multiple Tenants

```text
User U001

Tenant A → Admin
Tenant B → User
```

The platform must enforce the correct permissions independently.

---

## Scenario 3 — Same Tenant, Multiple Products

```text
Tenant A

Jioplix → Active
LIMS → Active
StoreAI → Active
```

Each product may use a different storage model.

---

## Scenario 4 — Dedicated Database

```text
Tenant A
Jioplix
Isolation = DEDICATED_DB
```

The product must continue working without changing business logic.

---

## Scenario 5 — Unauthorized Tenant

User belonging to:

```text
Tenant A
```

attempts to access:

```text
Tenant B
```

Expected:

```text
403 TENANT_ACCESS_DENIED
```

---

## Scenario 6 — Event Retry

Event processing fails.

Expected:

```text
Retry
 ↓
Retry
 ↓
Successful processing
```

No duplicate business effect.

---

## Scenario 7 — Duplicate Event

Same event arrives twice.

Expected:

```text
First → processed
Second → ignored/idempotent
```

---

# 54. Migration Strategy

Do not perform a big-bang migration.

Use:

```text
Existing Nexus
      │
      ▼
Adapter Layer
      │
      ▼
Central Platform
```

Migration sequence:

1. Register product.
2. Register existing tenants.
3. Map existing tenant IDs.
4. Introduce canonical Cybelinx Tenant ID.
5. Introduce central identity.
6. Introduce entitlement lookup.
7. Introduce resource registry.
8. Introduce provisioning for new tenants.
9. Migrate existing provisioning.
10. Reduce Nexus responsibility gradually.

---

# 55. Backward Compatibility

Existing product APIs should continue functioning during migration.

Where required:

```text
legacy_tenant_id
```

can be mapped to:

```text
cybelinx_tenant_id
```

Example:

```text
Cybelinx Tenant
T000123

Jioplix Tenant
J-7821

LIMS Tenant
L-1029
```

This allows migration without rewriting all existing tenant data immediately.

---

# 56. Security Boundary

The architecture should recognize four boundaries:

```text
Identity Boundary
       ↓
Control Plane Boundary
       ↓
Product Boundary
       ↓
Tenant Data Boundary
```

A compromise of one application should not automatically provide unrestricted access to other products or tenants.

---

# 57. Compliance Boundary

The architecture should support future compliance requirements but must not make unsupported claims.

Compliance requires:

```text
Technology
+
Configuration
+
Processes
+
Policies
+
People
+
Vendor Controls
+
Contracts
+
Audit
```

The platform is therefore:

> **Compliance-ready by architecture**, rather than automatically "HIPAA/GDPR compliant."

---

# 58. Future Phase 2 Capabilities

Once Phase 1 is stable, the following can be introduced.

## Demand & Resource Readiness

```text
Leads
 ↓
Conversion Rate
 ↓
Expected Customers
 ↓
Expected Workload
 ↓
Resource Demand
 ↓
Capacity
 ↓
Readiness
```

---

## Advanced Metering

- usage-based billing
- product usage
- API consumption
- storage consumption
- tenant-level cost allocation

---

## Advanced Resource Management

- automatic scaling
- resource pools
- capacity thresholds
- tenant migration
- database rebalancing
- automated provisioning

---

## Advanced Analytics

- tenant health
- product adoption
- churn indicators
- utilization
- infrastructure cost per tenant

---

# 59. Architectural Decision Records

The following decisions should be formally recorded.

### ADR-001

**Central Control Plane owns SaaS metadata, not business data.**

### ADR-002

**Tenant identity is independent of physical storage.**

### ADR-003

**Schema-per-tenant is a supported isolation model, not a hard-coded assumption.**

### ADR-004

**Dedicated database is supported for enterprise/regulatory tenants.**

### ADR-005

**Product business data remains inside the product data plane.**

### ADR-006

**Cross-system database triggers are replaced by Outbox/Event architecture.**

### ADR-007

**Kafka is not required for Phase 1.**

### ADR-008

**PostgreSQL roles follow least privilege; per-tenant login roles are not mandatory for every schema.**

### ADR-009

**Product Nexus remains during migration and gradually loses global SaaS responsibilities.**

### ADR-010

**Healthezee remains outside the Cybelinx Control Plane because it is externally owned.**

---

# 60. Target End-State

The final Phase 1 architecture should conceptually be:

```text
                           CYBELINX
                      CENTRAL CONTROL PLANE
                              │
       ┌──────────────────────┼─────────────────────┐
       │                      │                     │
    Identity              Tenant Registry      Product Registry
       │                      │                     │
       │                  Membership/RBAC       Entitlements
       │                      │                     │
       └──────────────────────┼─────────────────────┘
                              │
                     Tenant Resource Registry
                              │
                     Tenant Context / APIs
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
     Jioplix             Jioplix Smart             LIMS
        │                     │                     │
     Nexus                  Nexus                  Nexus
        │                     │                     │
     Data Plane             Data Plane             Data Plane
        │                     │                     │
     Outbox                 Outbox                 Outbox
        └─────────────────────┼─────────────────────┘
                              ▼
                       EVENT / MESSAGE PLANE
                              │
                ┌─────────────┼──────────────┐
                ▼             ▼              ▼
              Usage          Audit        Analytics
```

---

# 61. Core Architectural Statement

The most important statement in this PRD is:

> **Cybelinx Central Platform owns the identity of the tenant, the tenant's relationship with Cybelinx products, access, entitlements, resources, provisioning and platform events. Individual products own their business capabilities, product configuration and business data.**

And:

> **A Cybelinx tenant may use different storage isolation models for different products without changing the tenant identity or product business logic.**

---

# 62. Phase 1 Definition of Done

Phase 1 is considered complete when:

- [ ] Central Tenant Registry is operational
- [ ] Canonical Cybelinx Tenant ID exists
- [ ] Product Registry is operational
- [ ] Tenant/Product entitlement is operational
- [ ] Central user identity is operational
- [ ] Tenant membership is operational
- [ ] Global RBAC foundation is operational
- [ ] Tenant Context is available to integrated products
- [ ] Tenant Resource Registry is operational
- [ ] Schema and Dedicated DB isolation models are supported
- [ ] Secure credential references are implemented
- [ ] Tenant provisioning workflow is operational
- [ ] Outbox pattern is implemented
- [ ] Event contract is standardized
- [ ] Event worker is operational
- [ ] Idempotent event processing is implemented
- [ ] Platform audit is operational
- [ ] Security logging is operational
- [ ] Jioplix integration is successful
- [ ] Jioplix Smart integration is successful
- [ ] No cross-tenant access is possible
- [ ] Existing product business functionality remains intact
- [ ] Product Nexus continues to function during migration
- [ ] No central product business database has been introduced
- [ ] Deployment remains within the intended low-cost infrastructure model

---

# 63. Recommended Development Sequence

The development team should NOT start by building the UI.

Recommended order:

```text
1. Canonical Data Model
          ↓
2. Database Schema
          ↓
3. Tenant Registry
          ↓
4. Identity + Membership
          ↓
5. Product + Entitlement
          ↓
6. Resource Registry
          ↓
7. Tenant Context
          ↓
8. Provisioning
          ↓
9. Outbox/Event Contract
          ↓
10. Event Worker
          ↓
11. Audit/Security
          ↓
12. SDK / Integration Layer
          ↓
13. Jioplix Integration
          ↓
14. Jioplix Smart Integration
          ↓
15. Operational Dashboard
```

The dashboard should come **after the underlying platform services are stable**.

---

# 64. Final Product Positioning

This platform should be considered an internal **Cybelinx SaaS Foundation Platform**.

It is not another business application.

Its purpose is to make every future Cybelinx SaaS product easier to build and operate.

The desired future development model becomes:

```text
New Cybelinx Product
        │
        ├── Business Domain → Product Team
        │
        ├── Business Data → Product DB
        │
        └── SaaS Foundation
                  ↓
            Cybelinx Platform
                  │
        ┌─────────┼──────────┐
        ▼         ▼          ▼
     Identity   Tenant     Events
     RBAC       Resource   Audit
     Provision  Context    Usage
```

This allows Cybelinx to add its 11th, 12th or 20th SaaS product without recreating the same tenant-management infrastructure every time.