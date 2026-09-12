package com.cybelinx.platform.api.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/** Port of class-validator {@code @IsIn(...)}: the string value must belong to the given list. */
@Documented
@Constraint(validatedBy = OneOfValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface OneOf {

    String[] value();

    String message() default "must be one of the following values: {value}";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}