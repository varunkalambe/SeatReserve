package com.seat_reservation_system.srv.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ReleaseHoldsRequest(
        @NotEmpty @Size(max = 6, message = "You can release at most 6 holds at once.") List<Long> reservationIds
) {
}
