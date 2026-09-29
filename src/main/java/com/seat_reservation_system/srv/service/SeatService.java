package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.SeatResponse;
import com.seat_reservation_system.srv.entity.TripSeat;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.repository.TripSeatRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SeatService {

    private final TripSeatRepository tripSeatRepository;

    public SeatService(TripSeatRepository tripSeatRepository) {
        this.tripSeatRepository = tripSeatRepository;
    }

    @Transactional(readOnly = true)
    public List<SeatResponse> getAllSeats(Long tripId) {
        if (tripId == null) {
            throw new IllegalArgumentException("tripId is required.");
        }

        List<TripSeat> tripSeats =
                tripSeatRepository.findByTripIdWithSeatOrderBySeatId(tripId);

        if (tripSeats.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Bus trip not found or no seats are configured for this trip."
            );
        }

        return tripSeats.stream()
                .map(SeatResponse::from)
                .toList();
    }
}