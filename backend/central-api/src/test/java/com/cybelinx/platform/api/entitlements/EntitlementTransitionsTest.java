package com.cybelinx.platform.api.entitlements;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.EntitlementStatus;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import org.junit.jupiter.api.Test;

/** Unit coverage for the guarded entitlement state machine. */
class EntitlementTransitionsTest {

    @Test
    void pending_canBeActivated() {
        assertThat(EntitlementTransitions.applyTransition(EntitlementStatus.PENDING, EntitlementStatus.ACTIVE))
                .isEqualTo(EntitlementStatus.ACTIVE);
    }

    @Test
    void active_canBeSuspendedOrDeactivated() {
        assertThat(EntitlementTransitions.applyTransition(EntitlementStatus.ACTIVE, EntitlementStatus.SUSPENDED))
                .isEqualTo(EntitlementStatus.SUSPENDED);
        assertThat(EntitlementTransitions.applyTransition(EntitlementStatus.ACTIVE, EntitlementStatus.INACTIVE))
                .isEqualTo(EntitlementStatus.INACTIVE);
    }

    @Test
    void suspended_andInactive_canReactivate() {
        assertThat(EntitlementTransitions.applyTransition(EntitlementStatus.SUSPENDED, EntitlementStatus.ACTIVE))
                .isEqualTo(EntitlementStatus.ACTIVE);
        assertThat(EntitlementTransitions.applyTransition(EntitlementStatus.INACTIVE, EntitlementStatus.ACTIVE))
                .isEqualTo(EntitlementStatus.ACTIVE);
    }

    @Test
    void pending_cannotBeSuspendedDirectly() {
        assertThatThrownBy(() ->
                        EntitlementTransitions.applyTransition(EntitlementStatus.PENDING, EntitlementStatus.SUSPENDED))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.ENTITLEMENT_STATUS_TRANSITION_INVALID));
    }

    @Test
    void active_cannotBecomePending() {
        assertThatThrownBy(() ->
                        EntitlementTransitions.applyTransition(EntitlementStatus.ACTIVE, EntitlementStatus.PENDING))
                .isInstanceOf(ApiError.class);
    }

    @Test
    void transitionDetails_captureFromAndTo() {
        assertThat(EntitlementTransitions.transitionDetails(EntitlementStatus.ACTIVE, EntitlementStatus.SUSPENDED))
                .containsEntry("from", "ACTIVE")
                .containsEntry("to", "SUSPENDED");
    }
}