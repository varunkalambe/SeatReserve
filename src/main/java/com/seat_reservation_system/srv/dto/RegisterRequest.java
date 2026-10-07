package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @Size(min = 3, max = 50)
        @Pattern(regexp = "(?i)[a-z0-9._-]*", message = "Username may contain only letters, numbers, dots, dashes and underscores.")
        String username,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Size(max = 100) String fullName,
        @Email @Size(max = 150) String email
) {
}
