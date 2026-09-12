package com.cybelinx.platform.api.tenants;

import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import java.util.EnumMap;
import java.util.Map;

/**
 * Port of {@code tenant-status.ts}: the allowed one-step tenant lifecycle transitions. Deletion
 * is soft and deferred — {@code DELETION_PENDING → DELETED} keeps the row in place.
 */
public final class TenantTransitions {

    private static final Map<TenantRule, Map<TenantStatus, TenantStatus>> RULES = new EnumMap<>(TenantRule.class);

    static {
        RULES.put(TenantRule.suspend, Map.of(TenantStatus.ACTIVE, TenantStatus.SUSPENDED));
        RULES.put(TenantRule.activate, Map.of(TenantStatus.SUSPENDED, TenantStatus.ACTIVE));
        RULES.put(
                TenantRule.deactivate,
                Map.of(
                        TenantStatus.PROVISIONING,
                        TenantStatus.DEACTIVATED,
                        TenantStatus.ACTIVE,
                        TenantStatus.DEACTIVATED,
                        TenantStatus.SUSPENDED,
                        TenantStatus.DEACTIVATED));
        RULES.put(
                TenantRule.markDeletionPending,
                Map.of(
                        TenantStatus.PROVISIONING,
                        TenantStatus.DELETION_PENDING,
                        TenantStatus.ACTIVE,
                        TenantStatus.DELETION_PENDING,
                        TenantStatus.SUSPENDED,
                        TenantStatus.DELETION_PENDING,
                        TenantStatus.DEACTIVATED,
                        TenantStatus.DELETION_PENDING));
        RULES.put(TenantRule.finalizeDeletion, Map.of(TenantStatus.DELETION_PENDING, TenantStatus.DELETED));
    }

    private TenantTransitions() {
    }

    public static TenantStatus applyTransition(TenantRule rule, TenantStatus current) {
        TenantStatus next = RULES.get(rule).get(current);
        if (next == null) {
            throw new ApiError(
                    ErrorCode.TENANT_STATUS_TRANSITION_INVALID,
                    "Tenant cannot be " + describe(rule) + " from status \"" + current + "\"",
                    Map.of("operation", rule.name(), "from", current.name()));
        }
        return next;
    }

    private static String describe(TenantRule rule) {
        // 'markDeletionPending' → 'mark deletion pending'
        return rule.name().replaceAll("([A-Z])", " $1").trim().toLowerCase();
    }

    public enum TenantRule {
        suspend,
        activate,
        deactivate,
        markDeletionPending,
        finalizeDeletion
    }
}