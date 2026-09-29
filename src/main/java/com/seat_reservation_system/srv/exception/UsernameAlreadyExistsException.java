package com.seat_reservation_system.srv.exception;

public class UsernameAlreadyExistsException
        extends RuntimeException {

    public UsernameAlreadyExistsException(String message) {
        super(message);
    }
}