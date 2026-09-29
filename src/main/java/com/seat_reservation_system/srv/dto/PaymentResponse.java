package com.seat_reservation_system.srv.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        Long paymentId,
        Long reservationId,
        String pnr,
        String transactionReference,
        BigDecimal amount,
        String method,
        String status,
        LocalDateTime paidAt,
        ReservationResponse reservation
) {
}
