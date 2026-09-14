package com.cybelinx.platform.api.config;

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
    private final PrincipalArgumentResolver principalArgumentResolver;

    public WebConfig(TenantAuthInterceptor tenantAuthInterceptor, PrincipalArgumentResolver principalArgumentResolver) {
        this.tenantAuthInterceptor = tenantAuthInterceptor;
        this.principalArgumentResolver = principalArgumentResolver;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantAuthInterceptor)
                .addPathPatterns(
                        "/tenants/**",
                        "/products/**",
                        "/audit/**",
                        "/events/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(principalArgumentResolver);
    }
}