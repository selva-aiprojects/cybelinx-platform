package com.cybelinx.platform.api.common.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cybelinx.platform.api.common.error.ApiHttpException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitInterceptorTest {

    private RateLimitInterceptor interceptor(int requestsPerWindow) {
        return new RateLimitInterceptor(true, requestsPerWindow, 60);
    }

    @Test
    void allowsRequestsWithinBudget() {
        RateLimitInterceptor limiter = interceptor(3);
        HttpServletRequest request = new MockHttpServletRequest("GET", "/tenants");
        HttpServletResponse response = new MockHttpServletResponse();
        assertThat(limiter.preHandle(request, response, new Object())).isTrue();
        assertThat(limiter.preHandle(request, response, new Object())).isTrue();
        assertThat(limiter.preHandle(request, response, new Object())).isTrue();
    }

    @Test
    void rejectsRequestOverBudgetWith429() {
        RateLimitInterceptor limiter = interceptor(2);
        HttpServletRequest request = new MockHttpServletRequest("GET", "/tenants");
        HttpServletResponse response = new MockHttpServletResponse();
        limiter.preHandle(request, response, new Object());
        limiter.preHandle(request, response, new Object());
        assertThatThrownBy(() -> limiter.preHandle(request, response, new Object()))
                .isInstanceOf(ApiHttpException.class)
                .satisfies(ex -> assertThat(((ApiHttpException) ex).getStatus()).isEqualTo(429));
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
    }

    @Test
    void clientsAreLimitedIndependently() {
        RateLimitInterceptor limiter = interceptor(1);
        MockHttpServletRequest requestA = new MockHttpServletRequest("GET", "/tenants");
        MockHttpServletRequest requestB = new MockHttpServletRequest("GET", "/tenants");
        requestA.setRemoteAddr("10.0.0.1");
        requestB.setRemoteAddr("10.0.0.2");
        assertThat(limiter.preHandle(requestA, new MockHttpServletResponse(), new Object())).isTrue();
        assertThat(limiter.preHandle(requestB, new MockHttpServletResponse(), new Object())).isTrue();
        assertThatThrownBy(() -> limiter.preHandle(requestA, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(ApiHttpException.class);
    }

    @Test
    void disabledLimiterAlwaysAllows() {
        RateLimitInterceptor limiter = new RateLimitInterceptor(false, 1, 60);
        HttpServletRequest request = new MockHttpServletRequest("GET", "/tenants");
        assertThat(limiter.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
        assertThat(limiter.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
    }
}