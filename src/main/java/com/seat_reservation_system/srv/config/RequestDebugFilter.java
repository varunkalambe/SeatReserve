package com.seat_reservation_system.srv.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Runs before Spring Security and does two jobs:
 * <ol>
 *   <li>Stamps every response with {@code X-SRV-Build} so the browser console can prove which
 *       backend build is really running (a stale Docker container is easy to miss).</li>
 *   <li>Logs one line per API request: method, path, status, duration, origin and whether a token
 *       was sent. 5xx = ERROR, 4xx = WARN, everything else = DEBUG.</li>
 * </ol>
 * Request bodies and tokens are never logged.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestDebugFilter extends OncePerRequestFilter {

    /** Bump this whenever you want to be able to tell two deployments apart. */
    public static final String BUILD_TAG = "2026-09-29-v3";
    public static final String BUILD_HEADER = "X-SRV-Build";

    private static final Logger log = LoggerFactory.getLogger(RequestDebugFilter.class);

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain
    ) throws ServletException, IOException {
        response.setHeader(BUILD_HEADER, BUILD_TAG);

        long startedAt = System.nanoTime();

        try {
            chain.doFilter(request, response);
        } catch (ServletException | IOException | RuntimeException exception) {
            log.error("[REQ] {} -> EXCEPTION escaped the filter chain: {}",
                    describe(request), exception.toString());
            throw exception;
        } finally {
            if (!request.getRequestURI().startsWith("/actuator")) {
                int status = response.getStatus();
                long millis = (System.nanoTime() - startedAt) / 1_000_000;
                String line = String.format("[REQ] %s -> %d in %d ms", describe(request), status, millis);

                if (status >= 500) {
                    log.error(line);
                } else if (status >= 400) {
                    log.warn(line);
                } else {
                    log.debug(line);
                }
            }
        }
    }

    private static String describe(HttpServletRequest request) {
        String query = request.getQueryString();
        String forwarded = request.getHeader("X-Forwarded-For");

        return request.getMethod() + " " + request.getRequestURI()
                + (query == null ? "" : "?" + query)
                + " [token=" + (request.getHeader("Authorization") != null ? "yes" : "no")
                + ", origin=" + request.getHeader("Origin")
                + ", client=" + (forwarded != null ? forwarded : request.getRemoteAddr()) + "]";
    }
}
