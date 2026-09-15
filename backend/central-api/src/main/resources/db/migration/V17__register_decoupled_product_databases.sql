-- =====================================================================
-- V17: Register Decoupled Product Target Database Servers
-- Separates Product Application Databases (StoreAI, Jioplix) from the
-- Cybelinx SaaS Control Plane Database.
-- =====================================================================

-- 1. Register Remote Product Target Database Instance Entries
INSERT INTO public.databases (id, name, provider, endpoint, port, region_id, status, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000d10',
    'storeai_production_db_server',
    'aws_rds_postgres',
    'storeai-db-prod.cybelinx.internal',
    5432,
    (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'),
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.databases WHERE name = 'storeai_production_db_server');

INSERT INTO public.databases (id, name, provider, endpoint, port, region_id, status, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000d11',
    'storeai_demo_db_server',
    'aws_rds_postgres',
    'storeai-db-demo.cybelinx.internal',
    5432,
    (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'),
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.databases WHERE name = 'storeai_demo_db_server');

INSERT INTO public.databases (id, name, provider, endpoint, port, region_id, status, created_at, updated_at)
SELECT 
    '00000000-0000-0000-0000-000000000d12',
    'jioplix_production_db_server',
    'aws_rds_postgres',
    'jioplix-db-prod.cybelinx.internal',
    5432,
    (SELECT id FROM public.regions WHERE region_code = 'eu-west-1'),
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM public.databases WHERE name = 'jioplix_production_db_server');


-- 2. Update StoreAI Tenant Resource Records to Point to Product Database Instances
UPDATE public.tenant_resources
SET database_id = (SELECT id FROM public.databases WHERE name = 'storeai_demo_db_server')
WHERE product_id = (SELECT id FROM public.products WHERE product_code = 'STOREAI')
  AND environment = 'DEVELOPMENT';

UPDATE public.tenant_resources
SET database_id = (SELECT id FROM public.databases WHERE name = 'storeai_production_db_server')
WHERE product_id = (SELECT id FROM public.products WHERE product_code = 'STOREAI')
  AND environment = 'PRODUCTION';
