package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupportTicketRequest(
        @NotBlank @Size(max = 60) String category,
        @NotBlank @Size(max = 1000) String message
) {
}
