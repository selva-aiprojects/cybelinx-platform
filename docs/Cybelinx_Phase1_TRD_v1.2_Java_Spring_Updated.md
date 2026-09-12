# Cybelinx Multi-Tenant SaaS Platform

## Phase 1 --- Technical Requirements & Detailed Workflows (TRD)

**Version:** 1.2\
**Status:** Reworked — Java/Spring Edition\
**Scope:** Central SaaS plumbing for Cybelinx products\
**Primary Pilot Products:** Jioplix and Jioplix Smart\
**Out of Scope:** Product capability consolidation and business-data
centralization

------------------------------------------------------------------------

# 1. Document Purpose

This Technical Requirements & Detailed Workflows document defines the
technical architecture, platform services, data boundaries, security
model, integration contracts, workflows, technology stack, and
implementation requirements for the **Cybelinx Phase 1 Central SaaS
Platform**.

The objective is to create a reusable platform foundation for multiple
independently deployable Cybelinx products without forcing those
products to share their business databases or business logic.

Phase 1 centralizes:

-   Identity integration and access management
-   Tenant registry and lifecycle
-   User membership
-   RBAC foundation
-   Product registry
-   Product entitlements
-   Tenant resource registry
-   Tenant provisioning
-   Storage/isolation metadata
-   Platform audit
-   Messaging and event processing
-   Usage metering foundation
-   Platform reporting and operational dashboards

Individual products continue to own their domain functionality, product
configuration, workflows, and business data.

------------------------------------------------------------------------

# 2. Architectural Principle

> **Centralize SaaS plumbing, not business data.**

The Cybelinx platform owns the relationship between:

**User → Tenant → Product → Entitlement → Resource → Access**

The product owns:

**Business capability → Business workflow → Business data**

Therefore:

``` text
                 CYBELINX CENTRAL PLATFORM
                           |
       +-------------------+-------------------+
       |                   |                   |
      IAM             Tenant/Product       Messaging
       |                Management             |
       |                   |                   |
       +-------------------+-------------------+
                           |
                    Tenant Context
                           |
        +------------------+------------------+
        |                  |                  |
     Jioplix          Jioplix Smart         LIMS
        |                  |                  |
   Product Nexus      Product Nexus      Product Nexus
        |                  |                  |
   Tenant Data        Tenant Data        Tenant Data
        |                  |                  |
     Outbox              Outbox            Outbox
        +------------------+------------------+
                           |
                 Central Event Processing
                           |
              +------------+------------+
              |                         |
          Usage Data                Audit Data
              |                         |
              +------------+------------+
                           |
                       Reporting
```

------------------------------------------------------------------------

# 3. Scope

## 3.1 In Scope

1.  Central identity integration
2.  User identity mapping
3.  Tenant registry
4.  Tenant lifecycle
5.  Tenant membership
6.  Platform RBAC
7.  Product registry
8.  Product versions
9.  Plans and entitlements
10. Tenant-product relationships
11. Tenant resource registry
12. Storage isolation model
13. Tenant provisioning
14. Database/schema provisioning
15. Resource resolution
16. Platform audit
17. Transactional outbox
18. Messaging/event worker
19. Event processing
20. Usage metering foundation
21. Platform reporting
22. Admin portal
23. Security controls
24. Observability
25. Migration adapters for existing products

## 3.2 Out of Scope

-   Consolidating product business modules
-   Centralizing patient, inventory, HR, laboratory or accounting data
-   Rebuilding product Nexuses
-   Rewriting existing product business logic
-   Enterprise data warehouse
-   Full enterprise BI platform
-   Kafka-scale event infrastructure
-   Usage-based billing implementation
-   Lead-to-capacity forecasting
-   AI platform consolidation

------------------------------------------------------------------------

# 4. Target Architecture

## 4.1 Platform Planes

The Phase 1 architecture consists of six logical planes.

### Plane 1 --- Identity & Access

Responsible for:

-   Authentication integration
-   SSO
-   MFA integration
-   User identity mapping
-   Tenant membership
-   RBAC
-   Product access
-   Entitlement enforcement
-   Service identities

### Plane 2 --- Control Plane

Responsible for:

-   Tenant registry
-   Product registry
-   Entitlements
-   Resource registry
-   Provisioning
-   Tenant lifecycle
-   Platform configuration

### Plane 3 --- Product Control Plane / Nexus

Each product retains its own Nexus for:

-   Product-specific configuration
-   Product-specific metadata
-   Product-specific roles
-   Product-specific workflows
-   Product administration

### Plane 4 --- Product Data Plane

Each product owns:

-   Business tables
-   Business workflows
-   Business transactions
-   Business reporting data

### Plane 5 --- Event / Messaging Plane

Responsible for:

-   Transactional outbox
-   Event publication
-   Queueing
-   Retry
-   Idempotency
-   Dead-letter handling
-   Event consumers

### Plane 6 --- Reporting & Analytics Plane

Responsible for:

-   Platform dashboards
-   Tenant usage
-   Product adoption
-   Provisioning metrics
-   Event health
-   Operational reporting

------------------------------------------------------------------------

# 5. IAM Architecture

## 5.1 IAM Decision

Cybelinx should **not build a new authentication engine** in Phase 1.

The existing or managed Identity Provider should remain responsible for
authentication.

Possible providers include:

-   Supabase Auth
-   Auth0
-   Keycloak
-   Clerk
-   Firebase Authentication
-   Existing custom OIDC provider

The final provider must be selected after inventorying the
authentication implementation of the existing products.

## 5.2 Responsibility Boundary

### Identity Provider

Owns:

-   Login
-   Password management
-   MFA
-   Session management
-   Account recovery
-   Token issuance
-   Identity verification

### Cybelinx IAM / Control Plane

Owns:

-   Cybelinx user mapping
-   Tenant membership
-   Product membership
-   Roles
-   Permissions
-   Entitlements
-   Tenant context
-   Authorization metadata
-   Access audit

The identity provider answers:

> Who is the user?

The Cybelinx Control Plane answers:

> Which tenant and product may the user access, and what can they do?

------------------------------------------------------------------------

# 6. IAM Technical Requirements

The platform shall:

1.  Validate JWT/OIDC tokens.
2.  Validate issuer.
3.  Validate audience.
4.  Validate signature.
5.  Validate expiration.
6.  Map external identity to canonical `user_id`.
7.  Resolve active tenant memberships.
8.  Resolve product entitlements.
9.  Resolve roles and permissions.
10. Prevent suspended tenants from accessing products.
11. Prevent users without product entitlement from entering the product.
12. Support service-to-service authentication.
13. Record administrative access events.
14. Avoid storing identity-provider passwords in the Cybelinx platform.

## 6.1 Canonical User Context

``` java
public record TenantContext(
    UUID userId,
    UUID tenantId,
    String productId,
    UUID membershipId,
    Set<String> roles,
    Set<String> permissions
) {}
```

------------------------------------------------------------------------

# 7. Tenant Management

## 7.1 Canonical Tenant Identity

Every tenant receives a Cybelinx-generated immutable:

``` text
tenant_id
```

The physical database, schema or infrastructure location is not the
tenant identity.

This allows the same tenant to move between:

-   Shared database
-   Schema-per-tenant
-   Dedicated database
-   Dedicated infrastructure

without changing the tenant identity.

## 7.2 Tenant Lifecycle

``` text
PROSPECT
   |
   v
PROVISIONING
   |
   v
ACTIVE
   |
   +----> SUSPENDED
   |
   +----> DEACTIVATING
              |
              v
           DELETED
```

Additional provisioning states:

-   PENDING
-   IN_PROGRESS
-   FAILED
-   RETRYING
-   COMPLETED

------------------------------------------------------------------------

# 8. Tenant Membership

A user can belong to multiple tenants.

Example:

``` text
User A
 ├── Tenant Hospital A
 │      └── Jioplix Admin
 │
 └── Tenant Clinic B
        └── Jioplix Smart Manager
```

The platform must never infer tenant access merely from the
identity-provider account.

Access requires:

``` text
User
  +
Active Membership
  +
Product Entitlement
  +
Permission
```

------------------------------------------------------------------------

# 9. Product Registry

The Control Plane maintains a registry of Cybelinx products.

Example:

  Product         Product ID       Status
  --------------- ---------------- --------
  Jioplix         JIOPLIX          Active
  Jioplix Smart   JIOPLIX_SMART    Active
  LIMS            LIMS             Active
  StoreAI         STOREAI          Active
  SynthalystHRM   SYNTHALYST_HRM   Active

The registry should also support:

-   Product version
-   API version
-   Deployment version
-   Product status
-   Supported regions
-   Supported isolation models

------------------------------------------------------------------------

# 10. Entitlement Model

The platform shall distinguish:

**Product availability** from **tenant entitlement**.

Example:

``` text
Product
   |
   +-- Plan
        |
        +-- Feature
        |
        +-- Limit
```

Tenant:

``` text
Tenant A
   |
   +-- Jioplix
         |
         +-- Enterprise Plan
         +-- Billing = Enabled
         +-- Pharmacy = Enabled
         +-- API = Enabled
```

Product business logic remains product-owned. The Control Plane only
determines whether the tenant is entitled to access a product or
platform-level capability.

------------------------------------------------------------------------

# 11. RBAC

## 11.1 Platform RBAC

Initial roles:

-   Platform Super Admin
-   Platform Operations
-   Platform Security Admin
-   Platform Auditor
-   Tenant Admin
-   Tenant Operator

The product remains responsible for domain roles such as:

-   Doctor
-   Nurse
-   Lab Technician
-   Pharmacist
-   Inventory Manager
-   HR Manager

## 11.2 Permission Model

Example:

``` text
tenant:create
tenant:read
tenant:update
tenant:suspend

product:read
product:assign

resource:read
resource:provision

audit:read
usage:read

user:invite
membership:manage
```

------------------------------------------------------------------------

# 12. Tenant Resource Registry

The Control Plane must not assume that all tenants use the same storage
architecture.

## 12.1 Supported Isolation Models

### Pool

Shared database and shared application data model.

### Schema

One database with a separate schema per tenant.

### Dedicated DB

Dedicated database for the tenant.

### Dedicated Infrastructure

Future option for highly regulated or enterprise customers.

## 12.2 Example Resource Metadata

``` text
tenant_id
product_id
resource_id
isolation_mode
database_id
server_id
schema_name
region
environment
encryption_profile
credential_reference
status
provisioning_status
migration_version
```

The platform does not need to know product tables such as:

``` text
patients
samples
inventory
employees
invoices
```

------------------------------------------------------------------------

# 13. PostgreSQL Security Model

The platform should **not automatically create one PostgreSQL login user
for every tenant schema**.

For schema-per-tenant deployments, use:

-   Schema ownership
-   Least-privilege runtime roles
-   Explicit schema grants
-   Restricted database users

Recommended roles:

``` text
product_runtime
product_provisioner
product_readonly
tenant_schema_owner  -- NOLOGIN
```

The application must never use a PostgreSQL superuser.

Per-tenant database credentials should be used when dedicated database
isolation is selected or when a specific security requirement justifies
them.

## 13.1 Connection Pooling Requirement

If tenant routing uses:

``` sql
SET search_path
```

the tenant context must be transaction/connection scoped and reset
correctly.

A pooled connection must never retain Tenant A's schema context when
subsequently serving Tenant B.

------------------------------------------------------------------------

# 14. Tenant Provisioning

## 14.1 Provisioning Workflow

``` text
Create Tenant
     |
     v
Create tenant registry record
     |
     v
Create owner membership
     |
     v
Assign product entitlement
     |
     v
Resolve resource template
     |
     v
Provision DB / Schema
     |
     v
Apply migrations
     |
     v
Create product configuration
     |
     v
Validate connectivity
     |
     v
Publish TENANT_PROVISIONED
     |
     v
ACTIVE
```

## 14.2 Provisioning Must Be Idempotent

Repeated requests must not create:

-   duplicate tenants
-   duplicate schemas
-   duplicate memberships
-   duplicate resources
-   duplicate provisioning jobs

Every provisioning operation requires an idempotency key.

------------------------------------------------------------------------

# 15. Provisioning Job Model

Core entities:

``` text
provisioning_jobs
provisioning_steps
```

Example steps:

``` text
CREATE_TENANT
CREATE_RESOURCE
CREATE_SCHEMA
APPLY_MIGRATIONS
CREATE_PRODUCT_CONFIG
CREATE_ADMIN
VALIDATE
PUBLISH_EVENT
```

Each step records:

-   start time
-   completion time
-   status
-   attempt count
-   error code
-   error message
-   correlation ID

------------------------------------------------------------------------

# 16. Product Integration

Existing products should not be rewritten immediately.

Use an adapter approach:

``` text
Central Control Plane
        |
        v
Product Adapter
        |
        v
Existing Product Nexus
        |
        v
Existing Product Data Plane
```

The adapter translates:

-   Cybelinx tenant ID
-   Existing tenant ID
-   Product configuration
-   Resource information
-   Entitlements

This enables gradual migration.

------------------------------------------------------------------------

# 17. Tenant ID Migration

Existing products may have their own tenant identifiers.

Maintain a mapping:

``` text
cybelinx_tenant_id
        |
        +---- product_id
                |
                +---- product_tenant_id
```

This avoids forcing immediate changes to existing product databases.

------------------------------------------------------------------------

# 18. Event and Messaging Architecture

Messaging is a **first-class platform service**.

Phase 1 should avoid Kafka/RabbitMQ/AWS EventBridge/Azure Service Bus
unless actual workload justifies it.

## 18.1 Phase 1

``` text
Product Transaction
       |
       v
Product Database
       |
       +--> Business Data
       |
       +--> Outbox Event
                    |
                    v
              Event Worker
                    |
                    v
             Queue / Processing
                    |
          +---------+---------+
          |         |         |
        Usage      Audit   Notifications
```

## 18.2 Recommended Technology

Primary:

-   PostgreSQL Transactional Outbox
-   Spring Boot Worker

Optional as asynchronous demand increases:

-   Redis
-   BullMQ

Future:

-   Managed message broker
-   Kafka
-   Cloud-native event service

------------------------------------------------------------------------

# 19. Transactional Outbox

Business transaction and event creation must happen in the same database
transaction.

Example:

``` text
BEGIN

UPDATE business_table

INSERT INTO outbox_events (...)

COMMIT
```

If the business transaction commits, the event exists.

If the business transaction rolls back, the event does not exist.

This prevents inconsistent dual writes.

------------------------------------------------------------------------

# 20. Standard Event Contract

Every platform event should contain:

``` json
{
  "event_id": "uuid",
  "tenant_id": "uuid",
  "product_id": "JIOPLIX",
  "event_type": "TENANT_PROVISIONED",
  "schema_version": "1.0",
  "entity_type": "tenant",
  "entity_id": "uuid",
  "occurred_at": "timestamp",
  "source": "jioplix",
  "correlation_id": "uuid",
  "payload": {}
}
```

Mandatory fields:

-   event_id
-   tenant_id
-   product_id
-   event_type
-   occurred_at

Recommended:

-   schema_version
-   entity_type
-   entity_id
-   source
-   correlation_id

------------------------------------------------------------------------

# 21. Event Delivery

Phase 1 delivery semantics:

**At-least-once delivery**

Consumers must therefore be idempotent.

Recommended uniqueness:

``` text
(event_id, consumer_id)
```

The system must support:

-   Retry
-   Exponential backoff
-   Dead-letter handling
-   Manual replay
-   Event status tracking
-   Consumer processing status

------------------------------------------------------------------------

# 22. Event Categories

### Tenant Events

-   TENANT_CREATED
-   TENANT_PROVISIONED
-   TENANT_ACTIVATED
-   TENANT_SUSPENDED
-   TENANT_DEACTIVATED
-   TENANT_DELETED

### Membership Events

-   USER_INVITED
-   USER_JOINED_TENANT
-   USER_REMOVED
-   ROLE_ASSIGNED
-   ROLE_REVOKED

### Product Events

-   PRODUCT_ENABLED
-   PRODUCT_DISABLED
-   ENTITLEMENT_CHANGED

### Resource Events

-   RESOURCE_CREATED
-   RESOURCE_PROVISIONED
-   RESOURCE_FAILED
-   RESOURCE_MIGRATED

### Usage Events

-   PRODUCT_LOGIN
-   FEATURE_USED
-   API_REQUEST
-   RECORD_CREATED
-   RECORD_UPDATED

Product-specific business events may be added without requiring the
Control Plane to understand the underlying business tables.

------------------------------------------------------------------------

# 23. Notifications

Notifications should be treated as an **event consumer**, not tightly
coupled to product transactions.

Potential channels:

-   Email
-   SMS
-   WhatsApp
-   In-app notifications

Phase 1 should expose a provider abstraction:

``` text
NotificationService
   |
   +-- EmailProvider
   +-- SMSProvider
   +-- WhatsAppProvider
```

Provider selection should remain configurable.

------------------------------------------------------------------------

# 24. Reporting & Analytics

Reporting is a first-class platform capability.

The Control Plane should provide **platform reporting**, not replace
product reporting.

## 24.1 Platform Reporting

Examples:

-   Total tenants
-   Active tenants
-   Suspended tenants
-   Product adoption
-   Active users
-   Provisioning success/failure
-   Resource utilization
-   Event processing health
-   Feature adoption
-   API usage
-   Product activity

## 24.2 Product Reporting

Product-specific reports remain inside the product.

For example:

``` text
Jioplix
  -> patient / clinical reports

LIMS
  -> sample / test reports

StoreAI
  -> inventory / sales reports

HRMS
  -> employee / payroll reports
```

The Central Platform should not query those business tables directly.

------------------------------------------------------------------------

# 25. Reporting Architecture

``` text
Product
   |
   v
Usage Event
   |
   v
Central Event Processing
   |
   v
Platform Usage Store
   |
   v
Reporting Views / Aggregations
   |
   v
Metabase
   |
   +-- Platform Dashboard
   +-- Tenant Dashboard
   +-- Product Adoption
   +-- Provisioning Dashboard
   +-- Event Health Dashboard
```

## 25.1 Phase 1 Reporting Technology

Recommended:

-   PostgreSQL reporting schema/views
-   Metabase
-   SQL/materialized views where appropriate

Do not introduce Databricks, Snowflake or a dedicated enterprise data
warehouse in Phase 1.

Those may become relevant when Cybelinx has sufficient volume,
cross-cloud analytics requirements, or advanced data engineering needs.

------------------------------------------------------------------------

# 26. Reporting Data Model

Example platform reporting tables:

``` text
usage_events
tenant_usage_daily
product_usage_daily
tenant_activity_daily
provisioning_metrics
resource_usage_metrics
event_processing_metrics
```

Metrics should be derived from standardized events.

------------------------------------------------------------------------

# 27. IAM + Messaging + Reporting Relationship

These three services form an important platform chain:

``` text
IAM
 |
 +--> Access Event
 |
 v
Messaging
 |
 +--> Audit
 +--> Usage
 +--> Reporting
 +--> Notifications
```

This avoids creating separate integration mechanisms for every product.

------------------------------------------------------------------------

# 28. Control Plane Database

The Control Plane database contains **control metadata only**.

Recommended logical domains:

``` text
identity
tenancy
membership
rbac
products
entitlements
resources
provisioning
events
audit
usage
reporting
configuration
```

## 28.1 Core Tables

``` text
users
user_identities

tenants
tenant_settings

tenant_memberships

roles
permissions
role_permissions
membership_roles

products
product_versions
plans
entitlements
tenant_products

resources
tenant_resources
databases
schemas
regions

provisioning_jobs
provisioning_steps

outbox_events
platform_events
event_processing

audit_events

usage_events
tenant_usage_daily
product_usage_daily
```

------------------------------------------------------------------------

# 29. API Architecture

Backend:

**Spring Boot + TypeScript**

API style:

**REST + JSON**

Documentation:

**OpenAPI 3.x / Swagger**

Versioning:

``` text
/api/v1/
```

## 29.1 Example APIs

``` text
POST   /api/v1/tenants
GET    /api/v1/tenants/:id
PATCH  /api/v1/tenants/:id
POST   /api/v1/tenants/:id/suspend

POST   /api/v1/memberships
DELETE /api/v1/memberships/:id

GET    /api/v1/products
POST   /api/v1/tenants/:id/products

GET    /api/v1/tenants/:id/resources

POST   /api/v1/provisioning/jobs
GET    /api/v1/provisioning/jobs/:id

GET    /api/v1/audit
GET    /api/v1/usage

GET    /api/v1/health
```

Frontend must never access the platform database directly.

------------------------------------------------------------------------

# 30. Resource Resolver

The application should use a common resolver:

``` text
TenantResourceResolver
```

Input:

``` text
tenant_id
product_id
environment
```

Output:

``` text
resource_id
isolation_mode
database_id
schema_name
region
credential_reference
```

The product does not need to know how the resource is physically
implemented.

------------------------------------------------------------------------

# 31. Application Startup Flow

``` text
User opens product
        |
        v
Identity Provider
        |
        v
JWT
        |
        v
Product/API
        |
        v
Validate Token
        |
        v
Resolve User
        |
        v
Resolve Tenant Membership
        |
        v
Resolve Product Entitlement
        |
        v
Resolve Resource
        |
        v
Create Tenant Context
        |
        v
Product Business API
```

------------------------------------------------------------------------

# 32. Database Access Flow

``` text
Request
   |
   v
JWT Validation
   |
   v
Tenant Context
   |
   v
Resource Resolver
   |
   v
Connection Manager
   |
   +--> Shared Pool
   +--> Tenant Schema
   +--> Dedicated DB
```

No product API may accept an arbitrary database/schema name from the
client.

The resource must always be resolved from trusted platform metadata.

------------------------------------------------------------------------

# 33. Security Requirements

Minimum requirements:

-   TLS everywhere
-   Encryption at rest
-   Managed secrets
-   Least privilege
-   No application superuser
-   Restricted database network access
-   JWT validation
-   RBAC
-   Tenant isolation
-   Audit logging
-   Secure headers
-   Input validation
-   Rate limiting
-   Dependency scanning
-   SAST
-   Secrets scanning

Logs must not contain:

-   passwords
-   access tokens
-   refresh tokens
-   database credentials
-   PHI
-   sensitive personal data

------------------------------------------------------------------------

# 34. GDPR-Oriented Requirements

Where applicable:

-   Data residency metadata
-   Data retention policies
-   Data deletion workflows
-   User access requests
-   Tenant deletion workflow
-   Data minimization
-   Auditability
-   Processor/subprocessor governance

The platform architecture can support GDPR requirements but does not by
itself constitute GDPR compliance.

------------------------------------------------------------------------

# 35. HIPAA-Oriented Requirements

For healthcare products:

-   Minimum necessary access
-   Strong authentication
-   RBAC
-   Audit trails
-   Encryption
-   Secure transmission
-   Tenant isolation
-   Data retention
-   Controlled administrative access
-   Incident response
-   Backup/recovery

Infrastructure architecture alone does not constitute HIPAA compliance.

------------------------------------------------------------------------

# 36. Secrets Management

Credentials must never be stored directly in:

-   source code
-   frontend code
-   Git
-   event payloads
-   normal audit logs

Use:

-   managed secret store
-   environment secrets
-   credential references

The Resource Registry stores:

``` text
credential_reference
```

rather than actual passwords.

------------------------------------------------------------------------

# 36A. Concurrency, Transaction Integrity and Scalability

The Central Platform is a transactional multi-tenant control plane. The implementation must be designed for concurrent requests and horizontal scaling from the beginning.

## 36A.1 Stateless API Requirement

Spring Boot API instances must remain stateless. Do not store tenant context, authorization state or user sessions in JVM-local memory as the source of truth.

Authentication/session lifecycle remains with the external Identity Provider. API instances validate tokens and resolve authorization context server-side.

This allows:

```text
Request 1 -> API Instance A
Request 2 -> API Instance B
Request 3 -> API Instance C
```

without requiring sticky sessions.

## 36A.2 Database Connection Pooling

Use HikariCP with explicitly bounded pool sizes, connection timeouts and leak detection appropriate to the deployment environment.

Do not create one database connection per request.

Connection pool sizing must account for the number of API and worker instances so the aggregate connection count remains within PostgreSQL capacity.

## 36A.3 Transaction Boundaries

Use Spring `@Transactional` for platform operations requiring atomic state changes.

Examples:

- tenant creation + membership + audit + outbox event
- entitlement change + audit + outbox event
- resource state change + audit + outbox event
- provisioning state transitions

Do not use distributed transactions across product databases.

## 36A.4 Idempotency

Mutating APIs that can be retried by clients or gateways should support idempotency keys where appropriate.

Idempotency must be enforced using persistent database state or unique constraints, not JVM memory.

## 36A.5 Optimistic Locking

Entities subject to concurrent updates should use JPA optimistic locking with `@Version` where appropriate.

This is especially relevant for:

- tenant lifecycle state
- tenant products
- tenant resources
- provisioning jobs
- provisioning steps

## 36A.6 Pessimistic Locking

Use database-level pessimistic locking only for short, contention-sensitive operations where optimistic locking is insufficient.

For outbox workers, PostgreSQL row locking / `FOR UPDATE SKIP LOCKED` or an equivalent safe claiming strategy should be used so multiple workers can operate concurrently without processing the same event incorrectly.

## 36A.7 API Concurrency

The API must support concurrent requests without relying on synchronized global application state.

Avoid:

- static mutable tenant state
- in-memory tenant locks as the only protection
- JVM-local job queues as the only queue
- local session state as the source of truth

## 36A.8 Horizontal Scaling

The Central API must be safe to run with multiple instances behind a load balancer.

The Event Worker must also be safe to run with multiple instances.

Correctness must come from PostgreSQL constraints, transactions, locks and idempotency rather than single-instance assumptions.

## 36A.9 Performance Targets

Initial engineering targets should be validated through load testing rather than treated as contractual SLAs:

- p95 read API latency: target < 300 ms under normal platform load
- p95 transactional API latency: target < 500 ms excluding external provisioning calls
- no unbounded synchronous provisioning from HTTP requests
- database queries should be indexed and paginated
- API endpoints must enforce reasonable page-size limits

Actual targets must be tuned after observing the pilot workload.

## 36A.10 Load and Stress Testing

Before production rollout, perform load tests covering:

- concurrent tenant reads
- concurrent entitlement checks
- concurrent resource resolution
- concurrent tenant membership changes
- concurrent provisioning requests
- concurrent event processing
- API authentication/authorization checks

The test environment should measure API latency, error rate, PostgreSQL CPU, memory, connections, locks and worker throughput.

# 37. Technology Stack

## 37.1 Application

| Layer | Phase 1 Technology | Decision |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Recommended |
| Backend | Java 21 + Spring Boot 3.x | **Selected** |
| API | Spring Web REST + JSON | **Selected** |
| API Documentation | OpenAPI 3.x + springdoc-openapi / Swagger UI | **Selected** |
| API Versioning | `/api/v1/` | **Selected** |
| Persistence | Spring Data JPA | **Selected** |
| ORM | Hibernate | **Selected** |
| Database Driver | pgJDBC | **Selected** |
| Validation | Jakarta Bean Validation | **Selected** |
| Transaction Management | Spring `@Transactional` | **Selected** |
| Connection Pool | HikariCP | **Selected** |
| Testing | JUnit 5 + Mockito + Spring Boot Test + Testcontainers | **Selected** |
| E2E UI Testing | Playwright | Recommended |
| Build | Maven | **Selected** |

## 37.2 IAM

| Component | Technology |
|---|---|
| Authentication | Existing Identity Provider |
| Federation | OIDC / OAuth 2.0 |
| Enterprise SSO | SAML/OIDC where supported |
| MFA | Existing IdP |
| Authorization | Spring Security + Cybelinx RBAC |
| Token | JWT/OIDC token |
| API Security | Spring Security resource server capabilities |

Final IdP selection remains pending assessment of the existing product authentication implementations.

## 37.3 Data

| Component | Technology |
|---|---|
| Control Plane DB | PostgreSQL |
| Product DB | Existing product PostgreSQL where applicable |
| ORM | Spring Data JPA / Hibernate |
| Migrations | Flyway + SQL for database security objects |
| Reporting Store | PostgreSQL initially |

PostgreSQL 16/17/18 are acceptable. Standardize on the version already supported by the deployment environment rather than upgrading solely for the platform.

## 37.4 Messaging

| Component | Phase 1 |
|---|---|
| Outbox | PostgreSQL Transactional Outbox |
| Worker | Spring Boot / Java 21 |
| Queue | PostgreSQL-backed initially |
| Retry | Spring worker + persistent retry state |
| DLQ | PostgreSQL-backed |
| Future | Managed broker / Kafka when justified |

No Kafka, RabbitMQ or cloud event bus is required for Phase 1.

## 37.5 Reporting

| Component | Phase 1 |
|---|---|
| Usage data | PostgreSQL |
| Aggregations | SQL / materialized views where appropriate |
| Dashboard | Metabase |
| BI warehouse | Not required |
| Databricks | Future, if justified |
| Snowflake | Future, if justified |

## 37.6 Platform

| Component | Technology |
|---|---|
| Containerization | Docker |
| CI/CD | GitHub Actions |
| Monitoring | Existing platform monitoring + Spring Actuator |
| Logging | SLF4J/Logback structured JSON |
| Secrets | Managed secret store / environment secrets |
| Cache | None initially; Redis only when justified |
| Orchestration | No Kubernetes in Phase 1 |
| IaC | Terraform where useful |

# 38. Why Databricks and Snowflake Are Not Required in Phase 1

The Central Platform is not initially a large analytical data platform.

PostgreSQL is sufficient for:

-   tenant metrics
-   usage aggregation
-   operational dashboards
-   provisioning metrics
-   event health
-   adoption metrics

Databricks or Snowflake should only be introduced when there is a real
requirement such as:

-   very large data volumes
-   advanced data engineering
-   multi-cloud data platform
-   enterprise warehouse integration
-   complex historical analytics
-   ML/AI feature pipelines

Multicloud alone does not automatically require Databricks or Snowflake.

------------------------------------------------------------------------

# 39. Cache Strategy

Do not introduce Redis simply because it is common in SaaS
architectures.

Phase 1 can operate without Redis.

Introduce Redis when one or more of the following becomes material:

-   queue throughput
-   caching
-   distributed locks
-   rate limiting
-   session/state requirements
-   background job volume

If introduced, Redis can serve both **cache and BullMQ** workloads.

------------------------------------------------------------------------

# 40. Repository Structure

The Phase 1 implementation shall use a Java/Spring modular monolith rather than a collection of microservices.

Recommended repository:

```text
cybelinx-platform/
|
+-- pom.xml
|
+-- apps/
|   +-- central-api/
|   +-- event-worker/
|
+-- modules/
|   +-- identity/
|   +-- users/
|   +-- tenants/
|   +-- memberships/
|   +-- rbac/
|   +-- products/
|   +-- entitlements/
|   +-- resources/
|   +-- provisioning/
|   +-- events/
|   +-- audit/
|   +-- usage/
|   +-- health/
|   +-- common/
|
+-- frontend/
|   +-- admin-portal/
|
+-- database/
|   +-- migrations/
|   +-- seed/
|   +-- security/
|
+-- infrastructure/
|   +-- docker/
|   +-- terraform/
|
+-- docs/
|   +-- architecture/
|   +-- api/
|   +-- adr/
+-- tests/
```

The backend should use clear package boundaries such as:

```text
com.cybelinx.platform
+-- identity
+-- users
+-- tenants
+-- memberships
+-- rbac
+-- products
+-- entitlements
+-- resources
+-- provisioning
+-- events
+-- audit
+-- usage
+-- health
+-- common
```

Each module should separate API/controller DTOs, application services, domain objects, repository interfaces and infrastructure implementations where practical.

Do not create a separate deployment for every module in Phase 1.

The architecture must remain extractable into services later if a specific scaling or ownership requirement emerges.

# 41. Admin Portal

The Control Plane Admin Portal should contain:

1.  Dashboard
2.  Tenants
3.  Users
4.  Memberships
5.  Products
6.  Plans
7.  Entitlements
8.  Resources
9.  Provisioning
10. Events
11. Audit
12. Usage
13. Reporting
14. System health

The portal must not expose product business tables.

------------------------------------------------------------------------

# 42. Observability

## Logs

Structured JSON with:

-   timestamp
-   service
-   environment
-   tenant_id
-   product_id
-   user_id where appropriate
-   correlation_id
-   request_id
-   severity
-   event type

## Metrics

Platform metrics:

``` text
tenant_count
active_tenant_count
provisioning_success_rate
provisioning_failure_rate
event_processing_lag
event_failure_rate
active_users
product_adoption
api_latency
api_error_rate
```

------------------------------------------------------------------------

# 43. Health Endpoints

Every platform service should expose:

``` text
/health
/health/live
/health/ready
```

Readiness should validate critical dependencies such as:

-   database
-   queue
-   identity configuration
-   required external dependencies

------------------------------------------------------------------------

# 44. Error Handling

Standard error response:

``` json
{
  "code": "TENANT_NOT_FOUND",
  "message": "Tenant does not exist",
  "correlation_id": "uuid"
}
```

Do not expose:

-   SQL errors
-   stack traces
-   credentials
-   internal infrastructure details

------------------------------------------------------------------------

# 45. CI/CD

Pipeline:

``` text
Git Push
   |
   v
Lint
   |
   v
Type Check
   |
   v
Unit Tests
   |
   v
Integration Tests
   |
   v
Security Scan
   |
   v
Build
   |
   v
Deploy
   |
   v
Smoke Tests
```

Required checks:

-   ESLint
-   TypeScript strict
-   Unit tests
-   API integration tests
-   Tenant isolation tests
-   Dependency vulnerability scan
-   Secret scan
-   Container scan where applicable

------------------------------------------------------------------------

# 46. Testing Strategy

## Unit Testing

Test:

-   tenant resolution
-   authorization
-   entitlement
-   resource resolution
-   event validation
-   provisioning logic

## Integration Testing

Test:

-   PostgreSQL
-   migrations
-   provisioning
-   outbox
-   event worker
-   IAM integration

## End-to-End Testing

Playwright should validate:

``` text
Login
  -> Tenant Selection
  -> Product Access
  -> Authorization
  -> Product Launch
```

## Tenant Isolation Testing

Mandatory scenarios:

``` text
Tenant A cannot read Tenant B
Tenant A cannot write Tenant B
Tenant A cannot resolve Tenant B resource
Tenant A cannot use Tenant B credentials
Tenant A cannot receive Tenant B events
```

------------------------------------------------------------------------

# 47. Event Security

Events must be treated as potentially sensitive.

Rules:

-   Never publish passwords
-   Never publish access tokens
-   Minimize PHI
-   Avoid unnecessary personal data
-   Encrypt event transport
-   Restrict consumer access
-   Audit sensitive consumers

------------------------------------------------------------------------

# 48. Backup and Recovery

Control Plane database:

-   Automated backups
-   Point-in-time recovery where supported
-   Restore testing
-   Retention policy

Product databases remain under the existing product backup strategy, but
the Resource Registry must maintain enough metadata to reconstruct
resource relationships after recovery.

------------------------------------------------------------------------

# 49. Tenant Suspension

Workflow:

``` text
Admin Suspends Tenant
       |
       v
Update Tenant Status
       |
       v
Publish TENANT_SUSPENDED
       |
       +--> Product access blocked
       +--> Sessions rejected
       +--> New provisioning blocked
       +--> Notifications generated
       |
       v
Audit Event
```

Tenant data should not be deleted merely because the tenant is
suspended.

------------------------------------------------------------------------

# 50. Tenant Deletion

Deletion must be controlled and preferably asynchronous.

``` text
Deletion Request
      |
      v
Validation
      |
      v
Approval
      |
      v
Retention Check
      |
      v
Business/Product Cleanup
      |
      v
Resource Deprovisioning
      |
      v
Audit Record
      |
      v
Tenant Deleted
```

Where legal retention applies, data may need to be retained under a
controlled retention state rather than immediately destroyed.

------------------------------------------------------------------------

# 51. Data Residency

Resource Registry must support:

``` text
region
```

Example:

``` text
IN
EU
US
SG
```

Tenant-level region selection may be supported later.

Products must deploy or provision tenant resources according to approved
residency rules.

------------------------------------------------------------------------

# 52. Product SDK

A small Cybelinx SDK should eventually provide:

``` typescript
getTenantContext()
checkEntitlement()
checkPermission()
resolveTenantResource()
publishEvent()
recordUsage()
writeAuditEvent()
```

This avoids each product implementing platform integration differently.

------------------------------------------------------------------------

# 53. Product Integration Contract

Each participating product should expose or consume:

### Required

-   Platform authentication validation
-   Tenant context
-   Product entitlement validation
-   Resource resolution
-   Event publication
-   Audit integration

### Optional

-   Usage reporting
-   Notification integration
-   Platform configuration sync

------------------------------------------------------------------------

# 54. Migration Strategy

Existing products must be migrated gradually.

## Stage 1

Introduce Cybelinx tenant ID mapping.

## Stage 2

Integrate identity.

## Stage 3

Integrate product entitlement.

## Stage 4

Integrate resource registry.

## Stage 5

Integrate provisioning.

## Stage 6

Integrate outbox/event publication.

## Stage 7

Integrate usage reporting.

## Stage 8

Retire redundant platform-level functionality only after stable
operation.

Existing Product Nexus components should not be removed prematurely.

------------------------------------------------------------------------

# 55. Pilot Recommendation

The first implementation should use:

### Pilot 1 --- Jioplix

Why:

-   Strong multi-tenant use case
-   Hospital-level tenant isolation
-   Multiple roles
-   Multiple modules
-   Clear provisioning requirement

### Pilot 2 --- Jioplix Smart

Why:

-   Smaller operational footprint
-   Clinic-oriented tenant model
-   Useful comparison against hospital complexity

The pilot should deliberately avoid using externally owned Healthezee as
the Cybelinx control-plane pilot.

------------------------------------------------------------------------

# 56. Complete Jioplix Tenant Workflow

``` text
Platform Admin
      |
      v
Create Hospital Tenant
      |
      v
Central Tenant Registry
      |
      v
Assign Jioplix
      |
      v
Assign Plan / Entitlements
      |
      v
Resource Resolver
      |
      v
Schema-per-Tenant or Dedicated DB
      |
      v
Provisioning Worker
      |
      +--> Create DB/Schema
      +--> Apply Migrations
      +--> Create Product Config
      +--> Create Tenant Admin
      +--> Validate
      |
      v
TENANT_PROVISIONED
      |
      v
Tenant Admin Invited
      |
      v
Login through IdP
      |
      v
JWT Validation
      |
      v
Tenant Membership
      |
      v
Jioplix Entitlement
      |
      v
Resource Resolution
      |
      v
Jioplix Application
```

------------------------------------------------------------------------

# 57. Reporting Workflow

``` text
User Activity
      |
      v
Product Event
      |
      v
Transactional Outbox
      |
      v
Event Worker
      |
      v
Usage Store
      |
      v
Daily Aggregation
      |
      v
Metabase
      |
      +--> Platform Dashboard
      +--> Tenant Dashboard
      +--> Product Adoption
      +--> Usage Trends
```

------------------------------------------------------------------------

# 58. Messaging Failure Workflow

``` text
Event Created
     |
     v
Worker Picks Event
     |
     v
Consumer
     |
   Success
     |
     v
PROCESSED

Failure
  |
  v
Retry
  |
  +--> Success -> PROCESSED
  |
  +--> Failure
          |
          v
      Retry Limit
          |
          v
      DEAD LETTER
          |
          v
      Alert / Manual Replay
```

------------------------------------------------------------------------

# 59. Technology Evolution

## Phase 1

``` text
PostgreSQL
  |
  +--> Outbox
  |
  +--> Worker
  |
  +--> PostgreSQL Queue / Optional Redis
  |
  +--> Reporting
```

## Phase 2

``` text
PostgreSQL Outbox
       |
       v
Managed Message Broker
       |
       +--> Usage
       +--> Audit
       +--> Notifications
       +--> Integrations
```

## Phase 3

``` text
Enterprise Event Platform
       |
       +--> Kafka / Managed Kafka
       +--> Stream Processing
       +--> Data Platform
       +--> Advanced Analytics
       +--> AI/ML Pipelines
```

The event contract must remain stable so that the messaging
implementation can evolve without forcing product rewrites.

------------------------------------------------------------------------

# 60. Infrastructure Strategy

Phase 1 should reuse existing environments wherever practical.

New logical components:

1.  Control Plane API
2.  Platform PostgreSQL
3.  Event Worker
4.  Admin Portal
5.  Optional Redis
6.  Metabase

Do not introduce:

-   Kubernetes
-   Kafka cluster
-   Data warehouse
-   Databricks
-   Snowflake

unless actual demand justifies them.

------------------------------------------------------------------------

# 61. Cost Strategy

With existing Cybelinx environments available, incremental Phase 1
infrastructure should remain low.

Initial target:

**Approximately ₹500--₹2,500/month incremental**, depending on:

-   message volume
-   database capacity
-   Metabase hosting
-   Redis requirement
-   traffic

The largest additional platform requirement is expected to be the
messaging/event-processing infrastructure, rather than duplicating
complete product environments.

------------------------------------------------------------------------

# 62. Phase 1 Implementation Stages

## Stage 1 --- Foundation

-   Repository
-   Control Plane DB
-   Spring Boot API
-   Next.js admin portal
-   CI/CD
-   Health endpoints

## Stage 2 --- IAM

-   Existing IdP integration
-   User mapping
-   Tenant membership
-   JWT validation
-   RBAC

## Stage 3 --- Tenant & Product Management

-   Tenant registry
-   Product registry
-   Plans
-   Entitlements
-   Tenant-product assignment

## Stage 4 --- Resource Registry

-   DB registry
-   Schema registry
-   Region registry
-   Isolation mode
-   Resource resolver

## Stage 5 --- Provisioning

-   Provisioning jobs
-   Provisioning steps
-   Idempotency
-   Schema/database provisioning
-   Migration execution

## Stage 6 --- Messaging

-   Outbox
-   Event worker
-   Event contract
-   Retry
-   DLQ
-   Idempotent consumers

## Stage 7 --- Reporting

-   Usage events
-   Usage aggregation
-   Reporting views
-   Metabase dashboards

## Stage 8 --- Jioplix Pilot

-   Adapter
-   Tenant mapping
-   IAM
-   Entitlement
-   Resource resolution
-   Provisioning
-   Events
-   Reporting

## Stage 9 --- Jioplix Smart

Repeat the integration using the same platform contracts.

------------------------------------------------------------------------

# 63. Acceptance Criteria

Phase 1 is successful when:

### IAM

-   User can authenticate through the selected IdP.
-   User identity maps to a canonical Cybelinx user.
-   Tenant membership is resolved.
-   Product access is entitlement-controlled.
-   RBAC permissions are enforced.

### Tenant

-   Tenant can be created.
-   Tenant lifecycle can be managed.
-   Tenant can be suspended.
-   Tenant can be deactivated.
-   Tenant identity remains independent of physical storage.

### Resource

-   Shared, schema and dedicated resource models are supported.
-   Resource can be resolved by tenant + product.
-   Application cannot select arbitrary resources.

### Provisioning

-   Tenant can be provisioned.
-   Provisioning is idempotent.
-   Failed provisioning can retry.
-   Provisioning status is visible.

### Messaging

-   Product can write transactional outbox events.
-   Worker processes events.
-   Retry works.
-   Duplicate processing is prevented.
-   Dead-letter handling works.
-   Replay is possible.

### Reporting

-   Platform usage events are captured.
-   Tenant usage can be aggregated.
-   Product adoption is visible.
-   Provisioning metrics are visible.
-   Event health is visible.

### Security

-   No cross-tenant access is possible.
-   No application superuser is used.
-   Sensitive credentials are protected.
-   Audit events are generated.

------------------------------------------------------------------------

# 64. Architecture Decision Records

## ADR-001 --- Central Control Plane

**Decision:** Build one Cybelinx Control Plane.

**Reason:** Avoid duplicating SaaS plumbing across products.

------------------------------------------------------------------------

## ADR-002 --- Authentication Provider

**Decision:** Reuse existing Identity Provider.

**Reason:** Avoid rebuilding authentication.

------------------------------------------------------------------------

## ADR-003 --- Tenant Identity

**Decision:** Use immutable Cybelinx tenant ID independent of storage.

**Reason:** Enables storage migration and multiple isolation strategies.

------------------------------------------------------------------------

## ADR-004 --- Tenant Storage

**Decision:** Support Pool, Schema and Dedicated DB.

**Reason:** Different customers require different isolation levels.

------------------------------------------------------------------------

## ADR-005 --- PostgreSQL Roles

**Decision:** Do not create one PostgreSQL login user per tenant by
default.

**Reason:** Excessive operational complexity. Use schema permissions and
least-privilege roles.

------------------------------------------------------------------------

## ADR-006 --- Event Architecture

**Decision:** PostgreSQL Transactional Outbox + Worker initially.

**Reason:** Low cost and operational simplicity.

------------------------------------------------------------------------

## ADR-007 --- Messaging

**Decision:** Redis/BullMQ is optional in Phase 1 and introduced when
asynchronous workload requires it.

**Reason:** Avoid unnecessary infrastructure while retaining a clear
scale path.

------------------------------------------------------------------------

## ADR-008 --- Reporting

**Decision:** PostgreSQL reporting model + Metabase.

**Reason:** Sufficient for Phase 1 operational analytics without
introducing a data warehouse.

------------------------------------------------------------------------

## ADR-009 --- Data Warehouse

**Decision:** Do not introduce Snowflake or Databricks in Phase 1.

**Reason:** Current reporting requirements do not justify their
operational and financial complexity.

------------------------------------------------------------------------

## ADR-010 --- Product Nexus

**Decision:** Retain Product Nexus and migrate through adapters.

**Reason:** Avoid destabilizing existing products.

------------------------------------------------------------------------

# 65. Future Nexus Demand & Resource Readiness

This capability is intentionally deferred beyond Phase 1.

Future model:

``` text
Lead Volume
     |
     v
Conversion Rate
     |
     v
Expected Customers
     |
     v
Product Demand
     |
     v
Resource Requirement
     |
     v
Available Capacity
     |
     v
Readiness Assessment
     |
     v
Provision / Scale
```

This will eventually allow the Nexus platform to anticipate
infrastructure and operational capacity from the commercial pipeline.

It should not be included in Phase 1 implementation.

------------------------------------------------------------------------

# 66. Target End State

``` text
                         CYBELINX USERS
                              |
                              v
                    EXISTING IDENTITY PROVIDER
                              |
                              v
                    CYBELINX IAM / ACCESS
                              |
                              v
                    CENTRAL CONTROL PLANE
        +---------------------+----------------------+
        |                     |                      |
     Tenants              Products              Entitlements
     Membership           Resources             RBAC
     Provisioning         Audit                 Tenant Context
        |                     |                      |
        +---------------------+----------------------+
                              |
                    +---------+---------+
                    |                   |
              Jioplix / Smart        LIMS / StoreAI
                    |                   |
              Product Nexus        Product Nexus
                    |                   |
              Product Data        Product Data
                    |                   |
                 Outbox              Outbox
                    +---------+---------+
                              |
                     EVENT / MESSAGING
                              |
              +---------------+---------------+
              |               |               |
            Audit           Usage       Notifications
              |               |               |
              +---------------+---------------+
                              |
                         REPORTING
                              |
                           Metabase
```

------------------------------------------------------------------------

# 67. Final Technical Stack Summary

| Capability | Phase 1 Choice | Future Evolution |
|---|---|---|
| Frontend | Next.js / React / TypeScript | Same |
| Backend | **Java 21 / Spring Boot 3.x** | Modular services if required |
| API | **Spring Web REST / JSON** | REST + events |
| API Docs | **OpenAPI / Swagger** | Same |
| IAM | Existing IdP + Spring Security + Cybelinx RBAC | Enterprise federation |
| Database | PostgreSQL | Distributed/data platform if justified |
| Persistence | Spring Data JPA / Hibernate | Same |
| Migrations | Flyway | Same |
| Tenant Isolation | Pool / Schema / Dedicated DB | Dedicated infrastructure |
| Provisioning | Spring Boot Worker | Workflow/orchestration platform |
| Outbox | PostgreSQL | Same pattern |
| Messaging | PostgreSQL-backed Outbox + Worker | Managed broker / Kafka |
| Reporting | PostgreSQL + Metabase | Warehouse + BI |
| Cache | None initially | Redis when justified |
| Audit | PostgreSQL | Immutable/central audit platform |
| Secrets | Managed secret store | Enterprise secrets/KMS |
| Containers | Docker | Kubernetes if justified |
| CI/CD | GitHub Actions | GitOps |
| Monitoring | Spring Actuator + existing platform monitoring | Central observability |
| Data Platform | Not required | Snowflake/Databricks when justified |
| Infrastructure | Existing environments | Cloud-native expansion |

# 68. Final Architectural Rule

> **Cybelinx Central Platform owns who the tenant is, what products the
> tenant can use, who can access them, what resources they use, how
> those resources are provisioned, and what platform events and usage
> are generated.**
>
> **The individual product owns what the business does with that
> tenant's data.**

This boundary is the key design principle that allows Cybelinx to scale
from a small product portfolio to a multi-product enterprise SaaS
ecosystem without creating a single tightly coupled application.

**End of TRD**
