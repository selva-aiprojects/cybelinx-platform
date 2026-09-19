package com.cybelinx.platform.api.config;

import com.cybelinx.platform.api.common.ratelimit.RateLimitInterceptor;
import com.cybelinx.platform.api.security.PrincipalArgumentResolver;
import com.cybelinx.platform.api.security.TenantAuthInterceptor;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Registers the authentication/authorization interceptor for tenant routes and the
 * {@code @CurrentPrincipal} argument resolver.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final TenantAuthInterceptor tenantAuthInterceptor;
    private final RateLimitInterceptor rateLimitInterceptor;
    private final PrincipalArgumentResolver principalArgumentResolver;

    public WebConfig(TenantAuthInterceptor tenantAuthInterceptor, RateLimitInterceptor rateLimitInterceptor,
            PrincipalArgumentResolver principalArgumentResolver) {
        this.tenantAuthInterceptor = tenantAuthInterceptor;
        this.rateLimitInterceptor = rateLimitInterceptor;
        this.principalArgumentResolver = principalArgumentResolver;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantAuthInterceptor)
                .addPathPatterns(
                        "/tenants/**",
                        "/products/**",
                        "/subscriptions/**",
                        "/product-repository/**",
                        "/regions/**",
                        "/usage/**",
                        "/audit/**",
                        "/events/**",
                        "/iam/**",
                        "/broker/**",
                        "/api/v1/onboarding/**",
                        "/onboarding/**")
                .excludePathPatterns(
                        "/api/v1/onboarding/definitions/**",
                        "/onboarding/definitions/**");
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns(
                        "/auth/**",
                        "/tenants/**",
                        "/products/**",
                        "/subscriptions/**",
                        "/product-repository/**",
                        "/regions/**",
                        "/usage/**",
                        "/audit/**",
                        "/events/**",
                        "/iam/**",
                        "/broker/**",
                        "/api/v1/onboarding/**",
                        "/onboarding/**")
                .excludePathPatterns(
                        "/api/v1/onboarding/definitions/**",
                        "/onboarding/definitions/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(principalArgumentResolver);
    }
}