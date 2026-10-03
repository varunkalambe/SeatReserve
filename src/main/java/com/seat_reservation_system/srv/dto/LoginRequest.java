package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(

        @NotBlank
        @Size(max = 150)
        String username,

        @NotBlank
        @Size(max = 128)
        String password
) {
}
