package com.seat_reservation_system.srv.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TicketResponse(
        String pnr,
        String operatorName,
        String busName,
        String busType,
        String fromCity,
        String toCity,
        LocalDateTime departureTime,
        LocalDateTime arrivalTime,
        String seatNumber,
        String passengerName,
        BigDecimal totalFare,
        String paymentMethod,
        String transactionReference
) {
}
