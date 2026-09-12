package com.cybelinx.platform.api.common.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.cybelinx.platform.api.tenants.dto.TenantProductRequest;
import com.cybelinx.platform.api.tenants.dto.TenantResourceRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** Port of the DTO validation rules exercised by the tenants controller spec. */
class OneOfValidatorTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }
    }

    @Test
    void productCode_outsideCatalog_isRejected() {
        TenantProductRequest request = new TenantProductRequest();
        request.setProductCode("UNKNOWN");
        Set<ConstraintViolation<TenantProductRequest>> violations = validator.validate(request);
        assertThat(violations).anySatisfy(violation -> {
            assertThat(violation.getPropertyPath().toString()).isEqualTo("productCode");
            assertThat(violation.getMessage()).isEqualTo(
                    "productCode must be one of the following values: "
                            + "JIOPLIX, JIOPLIX_SMART, LIMS, STOREAI, SYNTHALYST_HRM");
        });
    }

    @Test
    void productCode_fromCatalog_passses() {
        TenantProductRequest request = new TenantProductRequest();
        request.setProductCode("JIOPLIX");
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void resourceTypeCode_isRequired() {
        TenantResourceRequest request = new TenantResourceRequest();
        request.setIsolationMode("SHARED_POOL");
        request.setEnvironment("DEVELOPMENT");
        Set<ConstraintViolation<TenantResourceRequest>> violations = validator.validate(request);
        assertThat(violations).anySatisfy(
                violation -> assertThat(violation.getPropertyPath().toString()).isEqualTo("resourceTypeCode"));
    }

    @Test
    void isolationMode_outsideAllowedValues_isRejected() {
        TenantResourceRequest request = new TenantResourceRequest();
        request.setResourceTypeCode("shared_pg_instance");
        request.setIsolationMode("UNKNOWN");
        request.setEnvironment("DEVELOPMENT");
        Set<ConstraintViolation<TenantResourceRequest>> violations = validator.validate(request);
        assertThat(violations).anySatisfy(violation -> {
            assertThat(violation.getPropertyPath().toString()).isEqualTo("isolationMode");
            assertThat(violation.getMessage()).isEqualTo(
                    "isolationMode must be one of the following values: "
                            + "SHARED_POOL, SCHEMA_PER_TENANT, DEDICATED_DATABASE, DEDICATED_INFRASTRUCTURE");
        });
    }

    @Test
    void environment_outsideAllowedValues_isRejected() {
        TenantResourceRequest request = new TenantResourceRequest();
        request.setResourceTypeCode("shared_pg_instance");
        request.setIsolationMode("SHARED_POOL");
        request.setEnvironment("QA");
        Set<ConstraintViolation<TenantResourceRequest>> violations = validator.validate(request);
        assertThat(violations).anySatisfy(violation -> {
            assertThat(violation.getPropertyPath().toString()).isEqualTo("environment");
            assertThat(violation.getMessage())
                    .isEqualTo("environment must be one of the following values: DEVELOPMENT, STAGING, PRODUCTION");
        });
    }
}