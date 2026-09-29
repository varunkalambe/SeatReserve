package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record BatchPaymentRequest(
        @NotEmpty @Size(max = 6, message = "You can pay for at most 6 reservations at once.") List<Long> reservationIds,
        @NotBlank
        @Pattern(regexp = "(?i)UPI|CARD|NET_BANKING|WALLET", message = "Unsupported payment method.")
        String method
) {
}
