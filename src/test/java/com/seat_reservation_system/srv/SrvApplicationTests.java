package com.seat_reservation_system.srv;

import com.seat_reservation_system.srv.util.AppTime;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Pure unit tests so the build never needs Postgres/Redis (the previous @SpringBootTest
 * had no package and required live infrastructure, which breaks `mvn package` on CI/Render).
 */
class SrvApplicationTests {

    @Test
    void offsetKeepsBusinessWallClock() {
        AppTime.configure("Asia/Kolkata");
        LocalDateTime local = LocalDateTime.of(2026, 9, 29, 10, 5);
        OffsetDateTime offset = AppTime.toOffset(local);

        assertEquals("+05:30", offset.getOffset().getId());
        assertEquals(local, offset.toLocalDateTime());
    }

    @Test
    void nullIsHandled() {
        assertNull(AppTime.toOffset(null));
    }
}
