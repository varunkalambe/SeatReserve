package com.seat_reservation_system.srv.dto;

import com.seat_reservation_system.srv.entity.SupportTicket;

import java.time.LocalDateTime;

public record SupportTicketResponse(
        Long id,
        String category,
        String message,
        String status,
        LocalDateTime createdAt
) {
    public static SupportTicketResponse from(SupportTicket t) {
        return new SupportTicketResponse(t.getId(), t.getCategory(), t.getMessage(), t.getStatus(), t.getCreatedAt());
    }
}
