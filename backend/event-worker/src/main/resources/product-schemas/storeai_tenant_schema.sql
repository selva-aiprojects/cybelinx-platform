-- =====================================================================
-- Target Database DDL Schema Template for StoreAI Composable Commerce
-- Derived from StoreAI Product Repository DDL Definition
-- Placeholder `${tenant_schema}` is substituted at runtime during provisioning
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS ${tenant_schema};

-- 1. Product Catalog & Inventory Tables
CREATE TABLE IF NOT EXISTS ${tenant_schema}."Product" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) UNIQUE NOT NULL,
    category VARCHAR(100) DEFAULT 'GENERAL',
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ${tenant_schema}."Stock" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES ${tenant_schema}."Product"(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    warehouse_code VARCHAR(64) NOT NULL DEFAULT 'DEFAULT_WH',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sales & Point of Sale (POS) Order Tables
CREATE TABLE IF NOT EXISTS ${tenant_schema}."Sale" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(64) UNIQUE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'CARD',
    customer_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ${tenant_schema}."SaleItem" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES ${tenant_schema}."Sale"(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES ${tenant_schema}."Product"(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL
);

-- 3. AI Recommendation & Analytics Log
CREATE TABLE IF NOT EXISTS ${tenant_schema}."AiRecommendationLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_email VARCHAR(255),
    recommended_product_id UUID REFERENCES ${tenant_schema}."Product"(id),
    confidence_score NUMERIC(5,4),
    applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
