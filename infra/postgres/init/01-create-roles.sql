-- =====================================================================
-- Cybelinx Central Platform — PostgreSQL role & privilege bootstrap
-- Runs automatically when the postgres container is created for the
-- first time (via docker-entrypoint-initdb.d).
--
-- Postgres 15+ does NOT support CREATE ROLE IF NOT EXISTS, so we
-- use a DO block for safe idempotency.
--
-- This script demonstrates the least-privilege role model from the
-- approved security architecture:
--   cybelinx         — the superuser created by POSTGRES_USER (dev only)
--   cybelinx_app     — application runtime role (NOLOGIN, owned by cybelinx)
--   cybelinx_provisioner — migration / provisioning role (LOGIN)
--   cybelinx_readonly — read-only access role
-- =====================================================================

-- Application runtime role (no login — the container app uses POSTGRES_USER in dev)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cybelinx_app') THEN
    CREATE ROLE cybelinx_app;
  END IF;
END
$$;

-- Provisioner role (used for schema creation / migration runs)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cybelinx_provisioner') THEN
    CREATE ROLE cybelinx_provisioner LOGIN PASSWORD 'cybelinx_provisioner_dev';
  END IF;
END
$$;

-- Read-only role (for future reporting / dashboard access)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'cybelinx_readonly') THEN
    CREATE ROLE cybelinx_readonly;
  END IF;
END
$$;

-- Apply minimal grants on schema public
GRANT USAGE ON SCHEMA public TO cybelinx_app;
GRANT USAGE ON SCHEMA public TO cybelinx_readonly;
GRANT ALL    ON SCHEMA public TO cybelinx_provisioner;

-- Future default privileges: tables created by the provisioning role
-- will grant SELECT to cybelinx_readonly automatically
ALTER DEFAULT PRIVILEGES FOR ROLE cybelinx_provisioner
  GRANT SELECT ON TABLES TO cybelinx_readonly;

COMMENT ON ROLE cybelinx_app            IS 'Application runtime role (NOLOGIN, owned by POSTGRES_USER in dev)';
COMMENT ON ROLE cybelinx_provisioner    IS 'Schema creation and migration role';
COMMENT ON ROLE cybelinx_readonly       IS 'Read-only role for reporting and dashboards';