package com.seat_reservation_system.srv.dto;

import java.time.Instant;

public record ApiErrorResponse(
        String error,
        int status,
        Instant timestamp
) {
}