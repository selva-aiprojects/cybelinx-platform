-- =====================================================================
-- Target Database DDL Schema Template for Jioplix Clinical Diagnostics
-- Derived from Jioplix Product Repository DDL Definition
-- Placeholder `${tenant_schema}` is substituted at runtime during provisioning
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS ${tenant_schema};

CREATE TABLE IF NOT EXISTS ${tenant_schema}."Patient" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mrn VARCHAR(64) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(20),
    dob DATE,
    phone VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ${tenant_schema}."DiagnosticOrder" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES ${tenant_schema}."Patient"(id),
    order_number VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
