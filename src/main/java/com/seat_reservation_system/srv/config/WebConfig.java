package com.seat_reservation_system.srv.config;

import com.seat_reservation_system.srv.interceptor.RateLimitInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration(proxyBeanMethods = false)
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    public WebConfig(
            RateLimitInterceptor rateLimitInterceptor
    ) {
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(
            InterceptorRegistry registry
    ) {
        registry.addInterceptor(
                rateLimitInterceptor
        ).addPathPatterns(
                "/api/auth/**",
                "/api/reservations/**",
                "/api/payments/**",
                "/api/wallet/top-up"
        );
    }
}