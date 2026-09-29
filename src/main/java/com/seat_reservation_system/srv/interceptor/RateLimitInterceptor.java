package com.seat_reservation_system.srv.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final String RATE_LIMIT_PREFIX = "ratelimit:";
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final StringRedisTemplate stringRedisTemplate;
    private final long maxRequests;

    public RateLimitInterceptor(
            StringRedisTemplate stringRedisTemplate,
            @Value("${ratelimit.max-requests-per-minute:60}") long maxRequests
    ) {
        this.stringRedisTemplate = stringRedisTemplate;
        this.maxRequests = maxRequests;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) throws Exception {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        // Behind Render/Vercel every request shares the proxy IP unless forwarded headers are honoured
        // (server.forward-headers-strategy=framework). Prefer the authenticated user when known.
        String identifier = request.getUserPrincipal() != null
                ? "user:" + request.getUserPrincipal().getName()
                : "ip:" + request.getRemoteAddr();
        String key = RATE_LIMIT_PREFIX + identifier;

        Long requestCount =
                stringRedisTemplate
                        .opsForValue()
                        .increment(key);

        if (requestCount != null && requestCount == 1) {
            stringRedisTemplate.expire(
                    key,
                    WINDOW
            );
        }

        if (requestCount != null &&
                requestCount > maxRequests) {

            response.setStatus(
                    HttpStatus.TOO_MANY_REQUESTS.value()
            );

            response.setHeader(
                    "Retry-After",
                    "60"
            );

            response.setContentType(
                    "application/json"
            );

            response.setCharacterEncoding(
                    "UTF-8"
            );

            response.getWriter().write(
                    "{\"error\":\"Rate limit exceeded\",\"status\":429}"
            );

            return false;
        }

        return true;
    }
}
