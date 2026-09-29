package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BatchHoldSeatsRequest(
        @NotNull Long tripId,
        @NotEmpty @Size(max = 6, message = "You can hold at most 6 seats at once.") List<@NotNull Long> seatIds,
        @NotBlank String passengerName,
        @NotBlank String contactPhone
) {
}

