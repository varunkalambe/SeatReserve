package com.seat_reservation_system.srv.config;

import com.seat_reservation_system.srv.util.AppTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.TimeZone;

/**
 * Prints build, clock and config facts at startup so problems are visible in
 * {@code docker compose logs backend}. If you do NOT see the [BUILD] line after a rebuild, the old
 * container is still running: use {@code docker compose up -d --build --force-recreate backend}.
 */
@Component
@Order(0)
public class TimeDiagnostics implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TimeDiagnostics.class);

    private final String corsOrigins;
    private final String rateLimit;

    public TimeDiagnostics(
            @Value("${cors.allowed-origins}") String corsOrigins,
            @Value("${ratelimit.max-requests-per-minute:60}") String rateLimit
    ) {
        this.corsOrigins = corsOrigins;
        this.rateLimit = rateLimit;
    }

    @Override
    public void run(String... args) {
        log.info("[BUILD] tag={} java={} pid={}",
                RequestDebugFilter.BUILD_TAG,
                System.getProperty("java.version"),
                ProcessHandle.current().pid());

        log.info("[TIME] jvmDefaultZone={} appZone={} utcNow={} appNow={}",
                TimeZone.getDefault().getID(), AppTime.zone(), Instant.now(), AppTime.now());

        log.info("[CONFIG] corsOrigins={} rateLimitPerMinute={}", corsOrigins, rateLimit);
    }
}
