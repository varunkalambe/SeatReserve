package com.seat_reservation_system.srv.dto;

import com.seat_reservation_system.srv.entity.BusTrip;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BusTripResponse(
        Long id,
        String operatorName,
        String busName,
        String busType,
        String fromCity,
        String toCity,
        LocalDateTime departureTime,
        LocalDateTime arrivalTime,
        Integer durationMinutes,
        BigDecimal price,
        BigDecimal rating,
        String amenities
) {
    public static BusTripResponse from(BusTrip t) {
        return new BusTripResponse(t.getId(), t.getOperatorName(), t.getBusName(), t.getBusType(), t.getFromCity(), t.getToCity(), t.getDepartureTime(), t.getArrivalTime(), t.getDurationMinutes(), t.getPrice(), t.getRating(), t.getAmenities());
    }
}
