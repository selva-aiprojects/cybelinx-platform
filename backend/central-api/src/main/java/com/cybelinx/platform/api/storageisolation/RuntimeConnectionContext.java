package com.cybelinx.platform.api.storageisolation;

import com.cybelinx.platform.api.domain.Environment;
import com.cybelinx.platform.api.domain.RuntimeRole;
import java.util.UUID;

/**
 * Runtime connection context for a tenant's storage, produced by the isolation
 * enforcer and consumed by any pooled JDBC client. Captures the least-privilege
 * {@link RuntimeRole} and — for schema-per-tenant — the {@code search_path}
 * contract: {@code SET search_path} is connection/transaction scoped and must be
 * reset ({@link #searchPathResetCommand}) before the pooled connection is
 * returned, so Tenant A's schema is never retained when the connection later
 * serves Tenant B (TRD §13.1).
 */
public record RuntimeConnectionContext(
        UUID tenantId,
        UUID productId,
        UUID resourceId,
        String resourceTypeCode,
        String isolationMode,
        Environment environment,
        String databaseName,
        String databaseEndpoint,
        Integer databasePort,
        String schemaName,
        RuntimeRole runtimeRole,
        String searchPathSetCommand,
        String searchPathResetCommand,
        String regionCode,
        String credentialReference) {}
