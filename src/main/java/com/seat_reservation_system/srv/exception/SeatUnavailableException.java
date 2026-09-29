package com.seat_reservation_system.srv.exception;

public class SeatUnavailableException
        extends RuntimeException {

    public SeatUnavailableException(String message) {
        super(message);
    }
}