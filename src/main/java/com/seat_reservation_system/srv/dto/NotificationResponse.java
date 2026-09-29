package com.seat_reservation_system.srv.dto;

import java.time.LocalDateTime;

public record NotificationResponse(
        String id,
        String title,
        String message,
        String type,
        LocalDateTime createdAt
) {
}
