package com.seat_reservation_system.srv.dto;

import com.seat_reservation_system.srv.entity.Seat;
import com.seat_reservation_system.srv.entity.SeatStatus;
import com.seat_reservation_system.srv.entity.TripSeat;

public record SeatResponse(
        Long id,
        String seatNumber,
        SeatStatus status
) {
    public static SeatResponse from(Seat seat) {
        return new SeatResponse(seat.getId(), seat.getSeatNumber(), seat.getStatus());
    }

    public static SeatResponse from(TripSeat tripSeat) {
        return new SeatResponse(tripSeat.getSeat().getId(), tripSeat.getSeat().getSeatNumber(), tripSeat.getStatus());
    }
}
