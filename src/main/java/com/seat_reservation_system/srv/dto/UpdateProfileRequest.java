package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 100) String fullName,
        @Email @Size(max = 150) String email,
        @Size(max = 30) String phone
) {
}
