package com.seat_reservation_system.srv.util;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * Single source of truth for the application's business time zone.
 * All LocalDateTime values stored in the database (departure times, hold expiry, ...)
 * are wall-clock times in this zone, no matter where the server is hosted (UTC on Render/Docker).
 */
public final class AppTime {

    public static final String DEFAULT_ZONE_ID = "Asia/Kolkata";
    private static volatile ZoneId zone = ZoneId.of(DEFAULT_ZONE_ID);

    private AppTime() {
    }

    public static void configure(String zoneId) {
        zone = ZoneId.of(
                zoneId == null || zoneId.isBlank() ? DEFAULT_ZONE_ID : zoneId.trim()
        );
    }

    public static ZoneId zone() {
        return zone;
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(zone);
    }

    public static java.time.LocalDate today() {
        return java.time.LocalDate.now(zone);
    }

    /** Attaches the business zone so browsers can parse the instant unambiguously. */
    public static OffsetDateTime toOffset(LocalDateTime value) {
        return value == null ? null : value.atZone(zone).toOffsetDateTime();
    }

    public static OffsetDateTime nowOffset() {
        return OffsetDateTime.now(zone);
    }
}
