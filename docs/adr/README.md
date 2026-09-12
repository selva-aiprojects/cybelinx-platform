# Architecture Decision Records

ADRs capture important architectural decisions. Each record is a short
structured note: **Status · Context · Decision · Consequences**.

## Accepted ADRs

| ID | Title | Short decision | Source |
| --- | --- | --- | --- |
| ADR-001 | Central Control Plane | One Cybelinx control plane owns SaaS metadata, not business data | PRD §59 / TRD §64 |
| ADR-002 | Authentication Provider | Reuse an existing Identity Provider; do not build auth | PRD §59 / TRD §64 |
| ADR-003 | Tenant Identity | Immutable Cybelinx tenant ID independent of physical storage | PRD §59 / TRD §64 |
| ADR-004 | Tenant Storage | Support Pool, Schema and Dedicated DB isolation | PRD §59 / TRD §64 |
| ADR-005 | PostgreSQL Roles | No per-tenant PostgreSQL login by default; least-privilege roles | PRD §59 / TRD §64 |
| ADR-006 | Event Architecture | PostgreSQL transactional outbox + lightweight worker first | PRD §59 / TRD §64 |
| ADR-007 | Messaging | Redis/BullMQ optional and only when justified; no Kafka in Phase 1 | PRD §59 / TRD §64 |
| ADR-008 | Reporting | PostgreSQL reporting model + Metabase; no data warehouse | PRD §59 / TRD §64 |
| ADR-009 | Data Warehouse | No Databricks / Snowflake in Phase 1 | PRD §59 / TRD §64 |
| ADR-010 | Product Nexus | Retain product Nexus; migrate through adapters; no big-bang | PRD §59 / TRD §64 |

New decisions that change the approved architecture must be recorded before
implementation. Use the template: [`ADR-000-template.md`](./ADR-000-template.md).