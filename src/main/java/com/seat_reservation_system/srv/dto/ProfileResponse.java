package com.seat_reservation_system.srv.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.seat_reservation_system.srv.entity.AppUser;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * {@code token}/{@code expiresIn} are only present after a username change: the JWT subject is the
 * username, so the old token stops working and the client must switch to the new one.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProfileResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String phone,
        BigDecimal walletBalance,
        LocalDateTime createdAt,
        String token,
        Long expiresIn
) {
    public static ProfileResponse from(AppUser u) {
        return new ProfileResponse(u.getId(), u.getUsername(), u.getFullName(), u.getEmail(), u.getPhone(), u.getWalletBalance(), u.getCreatedAt(), null, null);
    }

    public ProfileResponse withToken(String newToken, long newExpiresIn) {
        return new ProfileResponse(id, username, fullName, email, phone, walletBalance, createdAt, newToken, newExpiresIn);
    }
}
