package com.seat_reservation_system.srv.dto;

import com.seat_reservation_system.srv.entity.Reservation;
import com.seat_reservation_system.srv.entity.ReservationStatus;
import com.seat_reservation_system.srv.util.AppTime;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

public record ReservationResponse(
        Long reservationId,
        Long seatId,
        String seatNumber,
        String userIdentifier,
        ReservationStatus status,
        // Zone-aware (e.g. 2026-09-29T10:05:00+05:30) so every browser parses it correctly.
        OffsetDateTime expiresAt,
        Long tripId,
        String operatorName,
        String busName,
        String busType,
        String fromCity,
        String toCity,
        LocalDateTime departureTime,
        LocalDateTime arrivalTime,
        BigDecimal fare,
        String passengerName,
        String contactPhone,
        String bookingReference,
        LocalDateTime createdAt,
        // Seconds left in the 5-minute seat lock, computed on the server (immune to client clock skew).
        long holdSecondsRemaining,
        // True once the bus has left; departed trips can no longer be cancelled or paid for.
        boolean departed,
        boolean canCancel
) {
    public static ReservationResponse from(Reservation r) {
        var trip = r.getTrip();
        LocalDateTime now = AppTime.now();

        long holdSeconds = 0;
        if (r.getStatus() == ReservationStatus.PENDING && r.getExpiresAt() != null) {
            holdSeconds = Math.max(0, Duration.between(now, r.getExpiresAt()).getSeconds());
        }

        boolean departed = trip != null
                && trip.getDepartureTime() != null
                && !trip.getDepartureTime().isAfter(now);

        boolean canCancel = r.getStatus() == ReservationStatus.CONFIRMED
                && trip != null
                && !departed;

        return new ReservationResponse(
                r.getId(),
                r.getSeat().getId(),
                r.getSeat().getSeatNumber(),
                r.getUserIdentifier(),
                r.getStatus(),
                AppTime.toOffset(r.getExpiresAt()),
                trip == null ? null : trip.getId(),
                trip == null ? null : trip.getOperatorName(),
                trip == null ? null : trip.getBusName(),
                trip == null ? null : trip.getBusType(),
                trip == null ? null : trip.getFromCity(),
                trip == null ? null : trip.getToCity(),
                trip == null ? null : trip.getDepartureTime(),
                trip == null ? null : trip.getArrivalTime(),
                r.getFare() == null ? BigDecimal.ZERO : r.getFare(),
                r.getPassengerName(),
                r.getContactPhone(),
                r.getBookingReference(),
                r.getCreatedAt() == null ? now : r.getCreatedAt(),
                holdSeconds,
                departed,
                canCancel
        );
    }
}
