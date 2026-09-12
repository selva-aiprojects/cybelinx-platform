package com.cybelinx.platform.api.tenants;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.TenantStatus;
import com.cybelinx.platform.api.tenants.TenantTransitions.TenantRule;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import org.junit.jupiter.api.Test;

/** Port of the {@code tenant-status} rules from {@code tenant-status.ts}. */
class TenantTransitionsTest {

    @Test
    void suspend_requiresActive() {
        assertThat(TenantTransitions.applyTransition(TenantRule.suspend, TenantStatus.ACTIVE))
                .isEqualTo(TenantStatus.SUSPENDED);
    }

    @Test
    void activate_requiresSuspended() {
        assertThat(TenantTransitions.applyTransition(TenantRule.activate, TenantStatus.SUSPENDED))
                .isEqualTo(TenantStatus.ACTIVE);
    }

    @Test
    void deactivate_acceptsProvisioningActiveSuspended() {
        assertThat(TenantTransitions.applyTransition(TenantRule.deactivate, TenantStatus.PROVISIONING))
                .isEqualTo(TenantStatus.DEACTIVATED);
        assertThat(TenantTransitions.applyTransition(TenantRule.deactivate, TenantStatus.ACTIVE))
                .isEqualTo(TenantStatus.DEACTIVATED);
        assertThat(TenantTransitions.applyTransition(TenantRule.deactivate, TenantStatus.SUSPENDED))
                .isEqualTo(TenantStatus.DEACTIVATED);
    }

    @Test
    void markDeletionPending_acceptsLifecycleStatuses() {
        for (TenantStatus from : new TenantStatus[] {
            TenantStatus.PROVISIONING, TenantStatus.ACTIVE, TenantStatus.SUSPENDED, TenantStatus.DEACTIVATED
        }) {
            assertThat(TenantTransitions.applyTransition(TenantRule.markDeletionPending, from))
                    .isEqualTo(TenantStatus.DELETION_PENDING);
        }
    }

    @Test
    void finalizeDeletion_requiresDeletionPending() {
        assertThat(TenantTransitions.applyTransition(TenantRule.finalizeDeletion, TenantStatus.DELETION_PENDING))
                .isEqualTo(TenantStatus.DELETED);
    }

    @Test
    void invalidTransition_throwsTENANT_STATUS_TRANSITION_INVALID() {
        assertThatThrownBy(() -> TenantTransitions.applyTransition(TenantRule.suspend, TenantStatus.PROVISIONING))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> {
                    ApiError apiError = (ApiError) error;
                    assertThat(apiError.getCode()).isEqualTo(ErrorCode.TENANT_STATUS_TRANSITION_INVALID);
                    assertThat(apiError.getMessage())
                            .isEqualTo("Tenant cannot be suspend from status \"PROVISIONING\"");
                });
    }

    @Test
    void invalidDeletionTransitionMessageUsesSpacedRuleName() {
        assertThatThrownBy(
                        () -> TenantTransitions.applyTransition(TenantRule.markDeletionPending, TenantStatus.DELETED))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(error.getMessage())
                        .isEqualTo("Tenant cannot be mark deletion pending from status \"DELETED\""));
    }

    @Test
    void deletePseudoTransition_isNotExposed() {
        assertThat(TenantRule.values()).containsExactly(
                TenantRule.suspend, TenantRule.activate, TenantRule.deactivate,
                TenantRule.markDeletionPending, TenantRule.finalizeDeletion);
    }
}