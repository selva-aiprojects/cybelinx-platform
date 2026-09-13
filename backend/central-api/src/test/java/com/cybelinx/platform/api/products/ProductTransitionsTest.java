package com.cybelinx.platform.api.products;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.domain.ProductStatus;
import com.cybelinx.platform.shared.ApiError;
import com.cybelinx.platform.shared.ErrorCode;
import org.junit.jupiter.api.Test;

/** Unit coverage for the guarded product lifecycle. */
class ProductTransitionsTest {

    @Test
    void draft_canBePublished() {
        assertThat(ProductTransitions.applyTransition(ProductStatus.DRAFT, ProductStatus.ACTIVE))
                .isEqualTo(ProductStatus.ACTIVE);
    }

    @Test
    void active_canBeDeprecatedOrDisabled() {
        assertThat(ProductTransitions.applyTransition(ProductStatus.ACTIVE, ProductStatus.DEPRECATED))
                .isEqualTo(ProductStatus.DEPRECATED);
        assertThat(ProductTransitions.applyTransition(ProductStatus.ACTIVE, ProductStatus.DISABLED))
                .isEqualTo(ProductStatus.DISABLED);
    }

    @Test
    void deprecated_canOnlyBeDisabled() {
        assertThat(ProductTransitions.applyTransition(ProductStatus.DEPRECATED, ProductStatus.DISABLED))
                .isEqualTo(ProductStatus.DISABLED);
    }

    @Test
    void disabled_isTerminal() {
        assertThatThrownBy(() ->
                        ProductTransitions.applyTransition(ProductStatus.DISABLED, ProductStatus.ACTIVE))
                .isInstanceOf(ApiError.class)
                .satisfies(error -> assertThat(((ApiError) error).getCode())
                        .isEqualTo(ErrorCode.PRODUCT_STATUS_TRANSITION_INVALID));
    }

    @Test
    void draft_cannotBeDisabledDirectly() {
        assertThatThrownBy(() ->
                        ProductTransitions.applyTransition(ProductStatus.DRAFT, ProductStatus.DISABLED))
                .isInstanceOf(ApiError.class);
    }

    @Test
    void transitionDetails_captureFromAndTo() {
        assertThat(ProductTransitions.transitionDetails(ProductStatus.DRAFT, ProductStatus.ACTIVE))
                .containsEntry("from", "DRAFT")
                .containsEntry("to", "ACTIVE");
    }
}