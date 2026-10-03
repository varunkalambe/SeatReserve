package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.SeatResponse;
import com.seat_reservation_system.srv.entity.TripSeat;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.repository.BusTripRepository;
import com.seat_reservation_system.srv.repository.SeatRepository;
import com.seat_reservation_system.srv.repository.TripSeatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SeatService {

    private static final Logger log = LoggerFactory.getLogger(SeatService.class);

    private final TripSeatRepository tripSeatRepository;
    private final SeatRepository seatRepository;
    private final BusTripRepository busTripRepository;

    public SeatService(
            TripSeatRepository tripSeatRepository,
            SeatRepository seatRepository,
            BusTripRepository busTripRepository
    ) {
        this.tripSeatRepository = tripSeatRepository;
        this.seatRepository = seatRepository;
        this.busTripRepository = busTripRepository;
    }

    /**
     * Returns the seat map of a trip. If the trip exists but some seat rows are missing (typical right
     * after a deploy/restart while the background seeder is still running) they are created on the
     * spot instead of answering 404, so a freshly listed trip is always bookable.
     */
    @Transactional
    public List<SeatResponse> getAllSeats(Long tripId) {
        if (tripId == null) {
            throw new IllegalArgumentException("tripId is required.");
        }

        if (!busTripRepository.existsById(tripId)) {
            throw new ResourceNotFoundException("Bus trip not found: " + tripId);
        }

        List<TripSeat> tripSeats =
                tripSeatRepository.findByTripIdWithSeatOrderBySeatId(tripId);

        long expected = seatRepository.count();

        if (expected > 0 && tripSeats.size() < expected) {
            int created = tripSeatRepository.insertMissingSeats(tripId);
            log.info("[SEATS] trip={} had {}/{} seat rows, created {}", tripId, tripSeats.size(), expected, created);
            tripSeats = tripSeatRepository.findByTripIdWithSeatOrderBySeatId(tripId);
        }

        if (tripSeats.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Seats are still being prepared for this trip. Please try again in a moment."
            );
        }

        return tripSeats.stream()
                .map(SeatResponse::from)
                .toList();
    }
}
