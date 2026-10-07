package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.SeatResponse;
import com.seat_reservation_system.srv.entity.SeatStatus;
import com.seat_reservation_system.srv.entity.TripSeat;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.repository.BusTripRepository;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import com.seat_reservation_system.srv.repository.SeatRepository;
import com.seat_reservation_system.srv.repository.TripSeatRepository;
import com.seat_reservation_system.srv.util.AppTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class SeatService {

    private static final Logger log = LoggerFactory.getLogger(SeatService.class);

    private final TripSeatRepository tripSeatRepository;
    private final SeatRepository seatRepository;
    private final BusTripRepository busTripRepository;
    private final ReservationRepository reservationRepository;

    public SeatService(
            TripSeatRepository tripSeatRepository,
            SeatRepository seatRepository,
            BusTripRepository busTripRepository,
            ReservationRepository reservationRepository
    ) {
        this.tripSeatRepository = tripSeatRepository;
        this.seatRepository = seatRepository;
        this.busTripRepository = busTripRepository;
        this.reservationRepository = reservationRepository;
    }

    /**
     * Seat map of a trip. The status shown is derived from the reservations (source of truth): a seat
     * with a CONFIRMED booking is always BOOKED, an unexpired PENDING one is HELD, and a stale HELD
     * flag without a live hold is shown as AVAILABLE.
     */
    @Transactional
    public List<SeatResponse> getAllSeats(Long tripId) {
        if (tripId == null) {
            throw new IllegalArgumentException("tripId is required.");
        }

        if (!busTripRepository.existsById(tripId)) {
            throw new ResourceNotFoundException("Bus trip not found: " + tripId);
        }

        List<TripSeat> tripSeats = tripSeatRepository.findByTripIdWithSeatOrderBySeatId(tripId);

        long expected = seatRepository.count();

        if (expected > 0 && tripSeats.size() < expected) {
            int created = tripSeatRepository.insertMissingSeats(tripId);
            log.info("[SEATS] trip={} had {}/{} seat rows, created {}", tripId, tripSeats.size(), expected, created);
            tripSeats = tripSeatRepository.findByTripIdWithSeatOrderBySeatId(tripId);
        }

        if (tripSeats.isEmpty()) {
            throw new ResourceNotFoundException(
                    "Seats are still being prepared for this trip. Please try again in a moment.");
        }

        Set<Long> booked = new HashSet<>(reservationRepository.findConfirmedTripSeatIds(tripId));
        Set<Long> held = new HashSet<>(reservationRepository.findPendingTripSeatIds(tripId, AppTime.now()));

        return tripSeats.stream()
                .map(tripSeat -> {
                    SeatStatus status;

                    if (booked.contains(tripSeat.getId()) || tripSeat.getStatus() == SeatStatus.BOOKED) {
                        status = SeatStatus.BOOKED;
                    } else if (held.contains(tripSeat.getId())) {
                        status = SeatStatus.HELD;
                    } else {
                        status = SeatStatus.AVAILABLE;
                    }

                    return new SeatResponse(
                            tripSeat.getSeat().getId(),
                            tripSeat.getSeat().getSeatNumber(),
                            status
                    );
                })
                .toList();
    }
}
