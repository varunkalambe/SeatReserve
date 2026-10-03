package com.seat_reservation_system.srv.dto;

import java.math.BigDecimal;

/**
 * Wallet snapshot. The top-up fields let the frontend follow the SERVER's configuration instead of
 * a separate build-time flag, so the UI and the API can never disagree about whether top-up is on.
 */
public record WalletResponse(
        BigDecimal balance,
        boolean topUpEnabled,
        BigDecimal minTopUp,
        BigDecimal maxTopUp,
        BigDecimal dailyTopUpRemaining
) {
}
