package com.seat_reservation_system.srv.dto;

import com.seat_reservation_system.srv.entity.WalletTransaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WalletTransactionResponse(
        Long id,
        BigDecimal amount,
        String type,
        String description,
        LocalDateTime createdAt
) {
    public static WalletTransactionResponse from(WalletTransaction t) {
        return new WalletTransactionResponse(t.getId(), t.getAmount(), t.getType(), t.getDescription(), t.getCreatedAt());
    }
}
