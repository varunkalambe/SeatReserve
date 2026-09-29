package com.seat_reservation_system.srv.dto;

import com.seat_reservation_system.srv.entity.AppUser;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProfileResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String phone,
        BigDecimal walletBalance,
        LocalDateTime createdAt
) {
    public static ProfileResponse from(AppUser u) {
        return new ProfileResponse(u.getId(), u.getUsername(), u.getFullName(), u.getEmail(), u.getPhone(), u.getWalletBalance(), u.getCreatedAt());
    }
}
