package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record PaymentRequest(
        @NotNull Long reservationId,
        @NotBlank
        @Pattern(regexp = "(?i)UPI|CARD|NET_BANKING|WALLET", message = "Unsupported payment method.")
        String method
) {
}
