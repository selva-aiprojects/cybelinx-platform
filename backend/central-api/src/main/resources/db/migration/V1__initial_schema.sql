--
-- PostgreSQL database dump
--


-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DatabaseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DatabaseStatus" AS ENUM (
    'PROVISIONING',
    'ACTIVE',
    'SUSPENDED',
    'RETIRED'
);


--
-- Name: EntitlementStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EntitlementStatus" AS ENUM (
    'PENDING',
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


--
-- Name: Environment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Environment" AS ENUM (
    'DEVELOPMENT',
    'STAGING',
    'PRODUCTION'
);


--
-- Name: EventStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EventStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'DEAD_LETTERED'
);


--
-- Name: IsolationMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IsolationMode" AS ENUM (
    'SHARED_POOL',
    'SCHEMA_PER_TENANT',
    'DEDICATED_DATABASE',
    'DEDICATED_INFRASTRUCTURE'
);


--
-- Name: MembershipStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MembershipStatus" AS ENUM (
    'INVITED',
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED'
);


--
-- Name: PlanStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlanStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'RETIRED'
);


--
-- Name: ProductStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProductStatus" AS ENUM (
    'DRAFT',
    'ACTIVE',
    'DEPRECATED',
    'DISABLED'
);


--
-- Name: ProvisioningOperation; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProvisioningOperation" AS ENUM (
    'PROVISION',
    'REPROVISION',
    'UPGRADE',
    'SUSPEND',
    'RESUME',
    'DEPROVISION'
);


--
-- Name: ProvisioningState; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProvisioningState" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
    'ROLLED_BACK'
);


--
-- Name: ProvisioningStepStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProvisioningStepStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'SUCCEEDED',
    'FAILED',
    'SKIPPED',
    'CANCELLED'
);


--
-- Name: ResourceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ResourceStatus" AS ENUM (
    'ACTIVE',
    'PROVISIONING',
    'DEGRADED',
    'DISABLED',
    'RETIRED'
);


--
-- Name: RoleScope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RoleScope" AS ENUM (
    'PLATFORM',
    'TENANT'
);


--
-- Name: TenantProductStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantProductStatus" AS ENUM (
    'PROVISIONING',
    'ACTIVE',
    'SUSPENDED',
    'LAPSED',
    'DISABLED'
);


--
-- Name: TenantResourceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantResourceStatus" AS ENUM (
    'PENDING',
    'PROVISIONING',
    'ACTIVE',
    'SUSPENDED',
    'DEGRADED',
    'FAILED',
    'RETIRED'
);


--
-- Name: TenantStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TenantStatus" AS ENUM (
    'PROVISIONING',
    'ACTIVE',
    'SUSPENDED',
    'DEACTIVATED',
    'DELETION_PENDING',
    'DELETED'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'INVITED',
    'ACTIVE',
    'DISABLED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_events (
    id uuid NOT NULL,
    tenant_id uuid,
    user_id uuid,
    product_id uuid,
    actor_type character varying(16) NOT NULL,
    action character varying(128) NOT NULL,
    entity_type character varying(64) NOT NULL,
    entity_id uuid,
    metadata jsonb,
    ip_address character varying(64),
    request_id character varying(64),
    occurred_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: database_schemas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.database_schemas (
    id uuid NOT NULL,
    database_id uuid NOT NULL,
    region_id uuid,
    schema_name character varying(128) NOT NULL,
    environment public."Environment",
    status public."DatabaseStatus" DEFAULT 'PROVISIONING'::public."DatabaseStatus" NOT NULL,
    migration_version character varying(32),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: databases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.databases (
    id uuid NOT NULL,
    name character varying(128) NOT NULL,
    provider character varying(32) NOT NULL,
    endpoint character varying(255) NOT NULL,
    port integer,
    region_id uuid,
    status public."DatabaseStatus" DEFAULT 'PROVISIONING'::public."DatabaseStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entitlements (
    id uuid NOT NULL,
    plan_id uuid NOT NULL,
    key character varying(128) NOT NULL,
    name character varying(120),
    value jsonb,
    status public."EntitlementStatus" DEFAULT 'ACTIVE'::public."EntitlementStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: event_processing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_processing (
    id uuid NOT NULL,
    event_id uuid NOT NULL,
    worker_id character varying(64) NOT NULL,
    claimed_at timestamp(3) without time zone,
    lease_expires_at timestamp(3) without time zone,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_error text,
    completed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: membership_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_roles (
    id uuid NOT NULL,
    membership_id uuid NOT NULL,
    role_id uuid NOT NULL,
    granted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: notification_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_definitions (
    id uuid NOT NULL,
    code character varying(64) NOT NULL,
    event_type character varying(128) NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    channels jsonb NOT NULL,
    config jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    module character varying(64),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    plan_code character varying(64) NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    status public."PlanStatus" DEFAULT 'DRAFT'::public."PlanStatus" NOT NULL,
    trial_days integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: platform_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_events (
    id uuid NOT NULL,
    event_type character varying(128) NOT NULL,
    schema_version character varying(16) DEFAULT '1.0'::character varying NOT NULL,
    tenant_id uuid,
    product_id uuid,
    entity_type character varying(64),
    entity_id uuid,
    correlation_id character varying(64),
    aggregate_id uuid,
    payload jsonb,
    status public."EventStatus" DEFAULT 'PENDING'::public."EventStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    available_at timestamp(3) without time zone,
    processed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id uuid NOT NULL,
    key text NOT NULL,
    value jsonb,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: product_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_versions (
    id uuid NOT NULL,
    product_id uuid NOT NULL,
    version character varying(32) NOT NULL,
    release_notes text,
    is_current boolean DEFAULT false NOT NULL,
    published_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    product_code character varying(64) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    status public."ProductStatus" DEFAULT 'DRAFT'::public."ProductStatus" NOT NULL,
    current_version_id uuid,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: provisioning_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provisioning_jobs (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    tenant_product_id uuid,
    tenant_resource_id uuid,
    operation public."ProvisioningOperation" NOT NULL,
    state public."ProvisioningState" DEFAULT 'PENDING'::public."ProvisioningState" NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    requested_by_id uuid,
    error_code character varying(128),
    error_message text,
    queued_at timestamp(3) without time zone,
    started_at timestamp(3) without time zone,
    finished_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: provisioning_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provisioning_steps (
    id uuid NOT NULL,
    job_id uuid NOT NULL,
    sequence integer NOT NULL,
    name character varying(160) NOT NULL,
    status public."ProvisioningStepStatus" DEFAULT 'PENDING'::public."ProvisioningStepStatus" NOT NULL,
    input jsonb,
    output jsonb,
    error_message text,
    started_at timestamp(3) without time zone,
    finished_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regions (
    id uuid NOT NULL,
    region_code character varying(32) NOT NULL,
    name character varying(120) NOT NULL,
    provider character varying(32),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: resource_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_catalog (
    id uuid NOT NULL,
    resource_type_code character varying(64) NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    status public."ResourceStatus" DEFAULT 'ACTIVE'::public."ResourceStatus" NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    granted_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(120) NOT NULL,
    description text,
    scope public."RoleScope" DEFAULT 'TENANT'::public."RoleScope" NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: tenant_external_identifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_external_identifiers (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid,
    provider character varying(64) NOT NULL,
    external_id character varying(255) NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tenant_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_memberships (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status public."MembershipStatus" DEFAULT 'INVITED'::public."MembershipStatus" NOT NULL,
    invited_by_id uuid,
    invited_at timestamp(3) without time zone,
    joined_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: tenant_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_products (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status public."TenantProductStatus" DEFAULT 'PROVISIONING'::public."TenantProductStatus" NOT NULL,
    activated_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: tenant_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_resources (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    resource_id uuid NOT NULL,
    isolation_mode public."IsolationMode" NOT NULL,
    database_id uuid,
    schema_id uuid,
    schema_name character varying(128),
    region_id uuid,
    environment public."Environment" DEFAULT 'DEVELOPMENT'::public."Environment" NOT NULL,
    status public."TenantResourceStatus" DEFAULT 'PENDING'::public."TenantResourceStatus" NOT NULL,
    provisioning_state public."ProvisioningState" DEFAULT 'PENDING'::public."ProvisioningState" NOT NULL,
    migration_version character varying(32),
    credential_reference character varying(512),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    tenant_product_id uuid
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid NOT NULL,
    tenant_code character varying(64) NOT NULL,
    name character varying(200) NOT NULL,
    status public."TenantStatus" DEFAULT 'PROVISIONING'::public."TenantStatus" NOT NULL,
    region_id uuid,
    country character varying(2),
    timezone character varying(64),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_events (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid,
    resource_id uuid,
    event_type character varying(128) NOT NULL,
    quantity numeric(20,6) NOT NULL,
    unit character varying(32),
    metadata jsonb,
    dedupe_key character varying(255),
    occurred_at timestamp(3) without time zone NOT NULL,
    ingested_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_identities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_identities (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    identity_provider character varying(64) NOT NULL,
    external_subject character varying(512) NOT NULL,
    email character varying(320),
    is_primary boolean DEFAULT false NOT NULL,
    linked_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(320) NOT NULL,
    "displayName" character varying(200) NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    locale character varying(10),
    timezone character varying(64),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: database_schemas database_schemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_schemas
    ADD CONSTRAINT database_schemas_pkey PRIMARY KEY (id);


--
-- Name: databases databases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.databases
    ADD CONSTRAINT databases_pkey PRIMARY KEY (id);


--
-- Name: entitlements entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT entitlements_pkey PRIMARY KEY (id);


--
-- Name: event_processing event_processing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_processing
    ADD CONSTRAINT event_processing_pkey PRIMARY KEY (id);


--
-- Name: membership_roles membership_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_roles
    ADD CONSTRAINT membership_roles_pkey PRIMARY KEY (id);


--
-- Name: notification_definitions notification_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_definitions
    ADD CONSTRAINT notification_definitions_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: platform_events platform_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: product_versions product_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_versions
    ADD CONSTRAINT product_versions_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: provisioning_jobs provisioning_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_jobs
    ADD CONSTRAINT provisioning_jobs_pkey PRIMARY KEY (id);


--
-- Name: provisioning_steps provisioning_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_steps
    ADD CONSTRAINT provisioning_steps_pkey PRIMARY KEY (id);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: resource_catalog resource_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_catalog
    ADD CONSTRAINT resource_catalog_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: tenant_external_identifiers tenant_external_identifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_external_identifiers
    ADD CONSTRAINT tenant_external_identifiers_pkey PRIMARY KEY (id);


--
-- Name: tenant_memberships tenant_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_pkey PRIMARY KEY (id);


--
-- Name: tenant_products tenant_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_products
    ADD CONSTRAINT tenant_products_pkey PRIMARY KEY (id);


--
-- Name: tenant_resources tenant_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_resources
    ADD CONSTRAINT tenant_resources_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: usage_events usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_pkey PRIMARY KEY (id);


--
-- Name: user_identities user_identities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_identities
    ADD CONSTRAINT user_identities_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_events_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_action_idx ON public.audit_events USING btree (action);


--
-- Name: audit_events_entity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_entity_idx ON public.audit_events USING btree (entity_type, entity_id);


--
-- Name: audit_events_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_occurred_at_idx ON public.audit_events USING btree (occurred_at);


--
-- Name: audit_events_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_tenant_id_idx ON public.audit_events USING btree (tenant_id);


--
-- Name: audit_events_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_events_user_id_idx ON public.audit_events USING btree (user_id);


--
-- Name: database_schemas_database_id_schema_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX database_schemas_database_id_schema_name_key ON public.database_schemas USING btree (database_id, schema_name);


--
-- Name: database_schemas_region_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX database_schemas_region_id_idx ON public.database_schemas USING btree (region_id);


--
-- Name: database_schemas_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX database_schemas_status_idx ON public.database_schemas USING btree (status);


--
-- Name: databases_region_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX databases_region_id_name_key ON public.databases USING btree (region_id, name);


--
-- Name: databases_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX databases_status_idx ON public.databases USING btree (status);


--
-- Name: entitlements_plan_id_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX entitlements_plan_id_key_key ON public.entitlements USING btree (plan_id, key);


--
-- Name: entitlements_plan_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX entitlements_plan_status_idx ON public.entitlements USING btree (plan_id, status);


--
-- Name: event_processing_event_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX event_processing_event_id_key ON public.event_processing USING btree (event_id);


--
-- Name: event_processing_worker_lease_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX event_processing_worker_lease_idx ON public.event_processing USING btree (worker_id, lease_expires_at);


--
-- Name: membership_roles_membership_id_role_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX membership_roles_membership_id_role_id_key ON public.membership_roles USING btree (membership_id, role_id);


--
-- Name: membership_roles_role_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX membership_roles_role_id_idx ON public.membership_roles USING btree (role_id);


--
-- Name: notification_definitions_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_definitions_active_idx ON public.notification_definitions USING btree (is_active);


--
-- Name: notification_definitions_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notification_definitions_code_key ON public.notification_definitions USING btree (code);


--
-- Name: notification_definitions_event_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_definitions_event_type_idx ON public.notification_definitions USING btree (event_type);


--
-- Name: permissions_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissions_code_key ON public.permissions USING btree (code);


--
-- Name: permissions_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX permissions_module_idx ON public.permissions USING btree (module);


--
-- Name: plans_product_id_plan_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX plans_product_id_plan_code_key ON public.plans USING btree (product_id, plan_code);


--
-- Name: plans_product_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plans_product_status_idx ON public.plans USING btree (product_id, status);


--
-- Name: platform_events_correlation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX platform_events_correlation_id_idx ON public.platform_events USING btree (correlation_id);


--
-- Name: platform_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX platform_events_created_at_idx ON public.platform_events USING btree (created_at);


--
-- Name: platform_events_status_available_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX platform_events_status_available_idx ON public.platform_events USING btree (status, available_at);


--
-- Name: platform_events_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX platform_events_tenant_id_idx ON public.platform_events USING btree (tenant_id);


--
-- Name: platform_events_type_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX platform_events_type_created_idx ON public.platform_events USING btree (event_type, created_at);


--
-- Name: platform_settings_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX platform_settings_key_key ON public.platform_settings USING btree (key);


--
-- Name: product_versions_product_id_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX product_versions_product_id_version_key ON public.product_versions USING btree (product_id, version);


--
-- Name: product_versions_product_iscurrent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_versions_product_iscurrent_idx ON public.product_versions USING btree (product_id, is_current);


--
-- Name: products_current_version_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_current_version_id_key ON public.products USING btree (current_version_id);


--
-- Name: products_product_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX products_product_code_key ON public.products USING btree (product_code);


--
-- Name: provisioning_jobs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provisioning_jobs_created_at_idx ON public.provisioning_jobs USING btree (created_at);


--
-- Name: provisioning_jobs_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provisioning_jobs_state_idx ON public.provisioning_jobs USING btree (state);


--
-- Name: provisioning_jobs_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provisioning_jobs_tenant_id_idx ON public.provisioning_jobs USING btree (tenant_id);


--
-- Name: provisioning_jobs_tenant_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provisioning_jobs_tenant_product_id_idx ON public.provisioning_jobs USING btree (tenant_product_id);


--
-- Name: provisioning_jobs_tenant_resource_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provisioning_jobs_tenant_resource_id_idx ON public.provisioning_jobs USING btree (tenant_resource_id);


--
-- Name: provisioning_steps_job_id_sequence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX provisioning_steps_job_id_sequence_key ON public.provisioning_steps USING btree (job_id, sequence);


--
-- Name: provisioning_steps_job_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provisioning_steps_job_status_idx ON public.provisioning_steps USING btree (job_id, status);


--
-- Name: provisioning_steps_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX provisioning_steps_status_idx ON public.provisioning_steps USING btree (status);


--
-- Name: regions_region_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX regions_region_code_key ON public.regions USING btree (region_code);


--
-- Name: resource_catalog_resource_type_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX resource_catalog_resource_type_code_key ON public.resource_catalog USING btree (resource_type_code);


--
-- Name: role_permissions_permission_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX role_permissions_permission_id_idx ON public.role_permissions USING btree (permission_id);


--
-- Name: role_permissions_role_id_permission_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id);


--
-- Name: roles_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_code_key ON public.roles USING btree (code);


--
-- Name: tenant_external_identifiers_provider_product_id_external_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_external_identifiers_provider_product_id_external_id_key ON public.tenant_external_identifiers USING btree (provider, product_id, external_id);


--
-- Name: tenant_external_identifiers_tenant_id_product_id_provider_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_external_identifiers_tenant_id_product_id_provider_key ON public.tenant_external_identifiers USING btree (tenant_id, product_id, provider);


--
-- Name: tenant_external_ids_tenant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_external_ids_tenant_id_idx ON public.tenant_external_identifiers USING btree (tenant_id);


--
-- Name: tenant_memberships_tenant_id_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_memberships_tenant_id_user_id_key ON public.tenant_memberships USING btree (tenant_id, user_id);


--
-- Name: tenant_memberships_tenant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_memberships_tenant_status_idx ON public.tenant_memberships USING btree (tenant_id, status);


--
-- Name: tenant_memberships_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_memberships_user_id_idx ON public.tenant_memberships USING btree (user_id);


--
-- Name: tenant_products_plan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_products_plan_id_idx ON public.tenant_products USING btree (plan_id);


--
-- Name: tenant_products_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_products_product_id_idx ON public.tenant_products USING btree (product_id);


--
-- Name: tenant_products_tenant_id_product_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_products_tenant_id_product_id_key ON public.tenant_products USING btree (tenant_id, product_id);


--
-- Name: tenant_products_tenant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_products_tenant_status_idx ON public.tenant_products USING btree (tenant_id, status);


--
-- Name: tenant_resources_database_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_resources_database_id_idx ON public.tenant_resources USING btree (database_id);


--
-- Name: tenant_resources_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_resources_product_id_idx ON public.tenant_resources USING btree (product_id);


--
-- Name: tenant_resources_provisioning_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_resources_provisioning_state_idx ON public.tenant_resources USING btree (provisioning_state);


--
-- Name: tenant_resources_region_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_resources_region_id_idx ON public.tenant_resources USING btree (region_id);


--
-- Name: tenant_resources_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_resources_status_idx ON public.tenant_resources USING btree (status);


--
-- Name: tenant_resources_tenant_id_product_id_environment_resource__key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenant_resources_tenant_id_product_id_environment_resource__key ON public.tenant_resources USING btree (tenant_id, product_id, environment, resource_id);


--
-- Name: tenant_resources_tenant_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_resources_tenant_product_idx ON public.tenant_resources USING btree (tenant_id, product_id);


--
-- Name: tenant_resources_tenant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenant_resources_tenant_status_idx ON public.tenant_resources USING btree (tenant_id, status);


--
-- Name: tenants_region_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenants_region_id_idx ON public.tenants USING btree (region_id);


--
-- Name: tenants_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tenants_status_idx ON public.tenants USING btree (status);


--
-- Name: tenants_tenant_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tenants_tenant_code_key ON public.tenants USING btree (tenant_code);


--
-- Name: usage_events_dedupe_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usage_events_dedupe_key_key ON public.usage_events USING btree (dedupe_key);


--
-- Name: usage_events_tenant_product_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_events_tenant_product_idx ON public.usage_events USING btree (tenant_id, product_id);


--
-- Name: usage_events_tenant_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_events_tenant_type_idx ON public.usage_events USING btree (tenant_id, event_type);


--
-- Name: usage_events_type_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usage_events_type_occurred_idx ON public.usage_events USING btree (event_type, occurred_at);


--
-- Name: user_identities_identity_provider_external_subject_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_identities_identity_provider_external_subject_key ON public.user_identities USING btree (identity_provider, external_subject);


--
-- Name: user_identities_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_identities_user_id_idx ON public.user_identities USING btree (user_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: audit_events audit_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_events audit_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_events audit_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: database_schemas database_schemas_database_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_schemas
    ADD CONSTRAINT database_schemas_database_id_fkey FOREIGN KEY (database_id) REFERENCES public.databases(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: database_schemas database_schemas_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.database_schemas
    ADD CONSTRAINT database_schemas_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: databases databases_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.databases
    ADD CONSTRAINT databases_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: entitlements entitlements_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entitlements
    ADD CONSTRAINT entitlements_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: event_processing event_processing_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_processing
    ADD CONSTRAINT event_processing_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.platform_events(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: membership_roles membership_roles_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_roles
    ADD CONSTRAINT membership_roles_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.tenant_memberships(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: membership_roles membership_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_roles
    ADD CONSTRAINT membership_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: plans plans_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: platform_events platform_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: platform_events platform_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_events
    ADD CONSTRAINT platform_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_versions product_versions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_versions
    ADD CONSTRAINT product_versions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: products products_current_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_current_version_id_fkey FOREIGN KEY (current_version_id) REFERENCES public.product_versions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: provisioning_jobs provisioning_jobs_requested_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_jobs
    ADD CONSTRAINT provisioning_jobs_requested_by_id_fkey FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: provisioning_jobs provisioning_jobs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_jobs
    ADD CONSTRAINT provisioning_jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: provisioning_jobs provisioning_jobs_tenant_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_jobs
    ADD CONSTRAINT provisioning_jobs_tenant_product_id_fkey FOREIGN KEY (tenant_product_id) REFERENCES public.tenant_products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: provisioning_jobs provisioning_jobs_tenant_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_jobs
    ADD CONSTRAINT provisioning_jobs_tenant_resource_id_fkey FOREIGN KEY (tenant_resource_id) REFERENCES public.tenant_resources(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: provisioning_steps provisioning_steps_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provisioning_steps
    ADD CONSTRAINT provisioning_steps_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.provisioning_jobs(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_external_identifiers tenant_external_identifiers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_external_identifiers
    ADD CONSTRAINT tenant_external_identifiers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tenant_external_identifiers tenant_external_identifiers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_external_identifiers
    ADD CONSTRAINT tenant_external_identifiers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_memberships tenant_memberships_invited_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_invited_by_id_fkey FOREIGN KEY (invited_by_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tenant_memberships tenant_memberships_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_memberships tenant_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_memberships
    ADD CONSTRAINT tenant_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_products tenant_products_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_products
    ADD CONSTRAINT tenant_products_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_products tenant_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_products
    ADD CONSTRAINT tenant_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_products tenant_products_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_products
    ADD CONSTRAINT tenant_products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_resources tenant_resources_database_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_resources
    ADD CONSTRAINT tenant_resources_database_id_fkey FOREIGN KEY (database_id) REFERENCES public.databases(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tenant_resources tenant_resources_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_resources
    ADD CONSTRAINT tenant_resources_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_resources tenant_resources_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_resources
    ADD CONSTRAINT tenant_resources_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tenant_resources tenant_resources_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_resources
    ADD CONSTRAINT tenant_resources_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.resource_catalog(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: tenant_resources tenant_resources_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_resources
    ADD CONSTRAINT tenant_resources_schema_id_fkey FOREIGN KEY (schema_id) REFERENCES public.database_schemas(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tenant_resources tenant_resources_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_resources
    ADD CONSTRAINT tenant_resources_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tenant_resources tenant_resources_tenant_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_resources
    ADD CONSTRAINT tenant_resources_tenant_product_id_fkey FOREIGN KEY (tenant_product_id) REFERENCES public.tenant_products(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tenants tenants_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usage_events usage_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: usage_events usage_events_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.tenant_resources(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: usage_events usage_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: usage_events usage_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_identities user_identities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_identities
    ADD CONSTRAINT user_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


