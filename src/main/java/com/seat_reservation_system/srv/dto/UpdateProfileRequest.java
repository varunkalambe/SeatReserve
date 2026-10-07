package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(min = 3, max = 50, message = "Username must be 3-50 characters.")
        @Pattern(regexp = "(?i)[a-z0-9._-]*", message = "Username may contain only letters, numbers, dots, dashes and underscores.")
        String username,
        @Size(max = 100) String fullName,
        @Email @Size(max = 150) String email,
        @Pattern(regexp = "^$|^[0-9+()\\-\\s]{7,30}$", message = "Enter a valid phone number.")
        @Size(max = 30) String phone
) {
}
