package com.cybelinx.platform.api.common.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.Arrays;

/** Validates that a nullable string belongs to {@link OneOf#value()}. */
public final class OneOfValidator implements ConstraintValidator<OneOf, String> {

    private String[] values;

    @Override
    public void initialize(OneOf annotation) {
        this.values = annotation.value();
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || Arrays.asList(values).contains(value);
    }
}