package com.seat_reservation_system.srv.dto;

public record AuthResponse(
        String token,
        String username,
        long expiresIn,
        String fullName,
        String email
) {
}
