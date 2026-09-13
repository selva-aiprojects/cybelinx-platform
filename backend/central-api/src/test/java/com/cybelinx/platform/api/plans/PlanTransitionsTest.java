package com.cybelinx.platform.api.plans;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.PlanStatus;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import org.junit.jupiter.api.Test;

/** Unit coverage for the guarded plan lifecycle. */
class PlanTransitionsTest {

    @Test
    void draft_canBePublished() {
        assertThat(PlanTransitions.applyTransition(PlanStatus.DRAFT, PlanStatus.ACTIVE))
                .isEqualTo(PlanStatus.ACTIVE);
    }

    @Test
    void active_canBeRetired() {
        assertThat(PlanTransitions.applyTransition(PlanStatus.ACTIVE, PlanStatus.RETIRED))
                .isEqualTo(PlanStatus.RETIRED);
    }

    @Test
    void retired_isTerminal() {
        assertThatThrownBy(() ->
                        PlanTransitions.applyTransition(PlanStatus.RETIRED, PlanStatus.ACTIVE))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PLAN_STATUS_TRANSITION_INVALID));
    }

    @Test
    void draft_cannotBeRetiredDirectly() {
        assertThatThrownBy(() ->
                        PlanTransitions.applyTransition(PlanStatus.DRAFT, PlanStatus.RETIRED))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PLAN_STATUS_TRANSITION_INVALID));
    }

    @Test
    void transitionDetails_captureFromAndTo() {
        assertThat(PlanTransitions.transitionDetails(PlanStatus.DRAFT, PlanStatus.ACTIVE))
                .containsEntry("from", "DRAFT")
                .containsEntry("to", "ACTIVE");
    }
}