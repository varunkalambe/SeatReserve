package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TopUpRequest(
        @NotNull
        @DecimalMin("1.00")
        @DecimalMax("50000.00")
        @Digits(integer = 5, fraction = 2)
        BigDecimal amount
) {
}
