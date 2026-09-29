package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record HoldSeatRequest(
        @NotNull Long seatId,
        @NotNull Long tripId,
        @NotBlank String passengerName,
        @NotBlank String contactPhone
) {
}
