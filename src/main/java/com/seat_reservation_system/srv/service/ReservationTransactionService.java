package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.BatchHoldSeatsRequest;
import com.seat_reservation_system.srv.dto.HoldSeatRequest;
import com.seat_reservation_system.srv.dto.ReservationResponse;
import com.seat_reservation_system.srv.entity.BusTrip;
import com.seat_reservation_system.srv.entity.Reservation;
import com.seat_reservation_system.srv.entity.ReservationStatus;
import com.seat_reservation_system.srv.entity.SeatStatus;
import com.seat_reservation_system.srv.entity.TripSeat;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.exception.SeatUnavailableException;
import com.seat_reservation_system.srv.repository.BusTripRepository;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import com.seat_reservation_system.srv.repository.TripSeatRepository;
import com.seat_reservation_system.srv.util.AppTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * All seat state changes happen here, inside one DB transaction, guarded by a PESSIMISTIC row lock on
 * the trip_seats row (in addition to the Redis lock taken by ReservationService). Reservations are the
 * source of truth: a seat is never offered again while a live (CONFIRMED / unexpired PENDING)
 * reservation exists for it.
 */
@Service
public class ReservationTransactionService {

    private static final String SEAT_CACHE_PREFIX = "seat:status:";
    private static final int HOLD_MINUTES = 5;
    private static final Logger log = LoggerFactory.getLogger(ReservationTransactionService.class);

    private final ReservationRepository reservationRepository;
    private final BusTripRepository busTripRepository;
    private final TripSeatRepository tripSeatRepository;
    private final StringRedisTemplate stringRedisTemplate;

    public ReservationTransactionService(
            ReservationRepository reservationRepository,
            BusTripRepository busTripRepository,
            TripSeatRepository tripSeatRepository,
            StringRedisTemplate stringRedisTemplate
    ) {
        this.reservationRepository = reservationRepository;
        this.busTripRepository = busTripRepository;
        this.tripSeatRepository = tripSeatRepository;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Transactional
    public ReservationResponse holdSeat(HoldSeatRequest request, String username) {
        List<ReservationResponse> responses = holdSeats(
                new BatchHoldSeatsRequest(
                        request.tripId(),
                        List.of(request.seatId()),
                        request.passengerName(),
                        request.contactPhone()
                ),
                username,
                List.of(request.seatId())
        );

        return responses.get(0);
    }

    @Transactional
    public List<ReservationResponse> holdSeats(
            BatchHoldSeatsRequest request,
            String username,
            List<Long> seatIds
    ) {
        if (seatIds.isEmpty() || seatIds.size() > 6) {
            throw new IllegalArgumentException("You can hold between 1 and 6 seats at once.");
        }

        BusTrip trip = busTripRepository.findById(request.tripId())
                .orElseThrow(() -> new ResourceNotFoundException("Bus trip not found: " + request.tripId()));

        LocalDateTime now = AppTime.now();

        if (!trip.getDepartureTime().isAfter(now)) {
            throw new IllegalArgumentException("This trip has already departed.");
        }

        String passengerName = request.passengerName().trim();
        String contactPhone = request.contactPhone().trim();

        if (passengerName.isBlank() || contactPhone.isBlank()) {
            throw new IllegalArgumentException("Passenger name and contact phone are required.");
        }

        List<TripSeat> tripSeats = new ArrayList<>();

        // seatIds arrive sorted (ReservationService) so concurrent requests lock rows in the same order.
        for (Long seatId : seatIds) {
            TripSeat tripSeat = tripSeatRepository
                    .findByTripIdAndSeatIdForUpdate(request.tripId(), seatId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Seat is not configured for this bus trip: " + seatId));

            // Free seats whose 5-minute hold already lapsed but were not swept yet.
            reservationRepository.expireStalePending(tripSeat.getId(), now);

            if (tripSeat.getStatus() == SeatStatus.BOOKED
                    || reservationRepository.existsLiveForTripSeat(tripSeat.getId(), now)) {
                throw new SeatUnavailableException(
                        "Seat is not available: " + tripSeat.getSeat().getSeatNumber());
            }

            tripSeats.add(tripSeat);
        }

        LocalDateTime expiresAt = now.plusMinutes(HOLD_MINUTES);
        List<ReservationResponse> responses = new ArrayList<>();

        log.info("[HOLD] user={} trip={} seats={} now={} expiresAt={}",
                username, request.tripId(), seatIds, now, expiresAt);

        for (TripSeat tripSeat : tripSeats) {
            tripSeat.setStatus(SeatStatus.HELD);
            tripSeatRepository.save(tripSeat);

            Reservation saved = reservationRepository.save(new Reservation(
                    tripSeat.getSeat(),
                    trip,
                    tripSeat,
                    username,
                    ReservationStatus.PENDING,
                    expiresAt,
                    trip.getPrice(),
                    passengerName,
                    contactPhone
            ));

            saved.setBookingReference(String.format("SRV%06d", saved.getId()));
            reservationRepository.save(saved);

            cacheSeat(request.tripId(), tripSeat.getSeat().getId(), SeatStatus.HELD);
            responses.add(ReservationResponse.from(saved));
        }

        return responses;
    }

    @Transactional
    public ReservationResponse confirmReservation(Long reservationId, String username) {
        Reservation reservation = loadLocked(reservationId);

        verifyReservationStructure(reservation);
        verifyOwner(reservation, username);

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new SeatUnavailableException("Reservation is not pending.");
        }

        if (!reservation.getExpiresAt().isAfter(AppTime.now())) {
            throw new SeatUnavailableException("Reservation has expired.");
        }

        TripSeat tripSeat = reservation.getTripSeat();

        if (tripSeat.getStatus() == SeatStatus.BOOKED) {
            throw new SeatUnavailableException("Seat is already booked.");
        }

        reservation.setStatus(ReservationStatus.CONFIRMED);
        tripSeat.setStatus(SeatStatus.BOOKED);

        reservationRepository.save(reservation);
        tripSeatRepository.save(tripSeat);

        cacheSeat(reservation.getTrip().getId(), reservation.getSeat().getId(), SeatStatus.BOOKED);

        return ReservationResponse.from(reservation);
    }

    @Transactional
    public ReservationResponse cancelReservation(Long reservationId, String username) {
        Reservation reservation = loadLocked(reservationId);

        verifyReservationStructure(reservation);
        verifyOwner(reservation, username);

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                    "Only confirmed bookings can be cancelled. This booking is "
                            + reservation.getStatus().name().toLowerCase() + ".");
        }

        if (!reservation.getTrip().getDepartureTime().isAfter(AppTime.now())) {
            throw new IllegalArgumentException(
                    "This bus has already departed, so the booking can no longer be cancelled.");
        }

        TripSeat tripSeat = reservation.getTripSeat();

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        if (tripSeat.getStatus() == SeatStatus.BOOKED) {
            tripSeat.setStatus(SeatStatus.AVAILABLE);
            tripSeatRepository.save(tripSeat);
            cacheSeat(reservation.getTrip().getId(), reservation.getSeat().getId(), SeatStatus.AVAILABLE);
        }

        return ReservationResponse.from(reservation);
    }

    /** Releases an unpaid hold early. Idempotent: anything no longer PENDING is returned unchanged. */
    @Transactional
    public ReservationResponse releaseHold(Long reservationId, String username) {
        Reservation reservation = loadLocked(reservationId);

        verifyReservationStructure(reservation);
        verifyOwner(reservation, username);

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            return ReservationResponse.from(reservation);
        }

        reservation.setStatus(ReservationStatus.EXPIRED);
        reservation.setExpiresAt(AppTime.now());
        reservationRepository.save(reservation);

        TripSeat tripSeat = reservation.getTripSeat();

        if (tripSeat.getStatus() == SeatStatus.HELD) {
            tripSeat.setStatus(SeatStatus.AVAILABLE);
            tripSeatRepository.save(tripSeat);
            cacheSeat(reservation.getTrip().getId(), reservation.getSeat().getId(), SeatStatus.AVAILABLE);
        }

        return ReservationResponse.from(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getMyReservations(String username) {
        return reservationRepository
                .findByUserIdentifierOrderByIdDesc(username)
                .stream()
                .map(ReservationResponse::from)
                .toList();
    }

    /**
     * Lock order is always reservation row -> trip_seat row, and both are loaded AFTER their lock is
     * held, so the state read here cannot be stale.
     */
    private Reservation loadLocked(Long reservationId) {
        Reservation locked = reservationRepository.findByIdForUpdate(reservationId)
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));

        if (locked.getTripSeat() != null) {
            tripSeatRepository.findByIdForUpdate(locked.getTripSeat().getId());
        }

        return reservationRepository.findByIdWithSeatAndTrip(locked.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Reservation not found: " + reservationId));
    }

    private void cacheSeat(Long tripId, Long seatId, SeatStatus status) {
        try {
            stringRedisTemplate.opsForValue().set(SEAT_CACHE_PREFIX + tripId + ":" + seatId, status.name());
        } catch (RuntimeException exception) {
            // The cache is only a hint; the database is authoritative. Never fail a booking over it.
            log.warn("[CACHE] could not update seat cache {}:{}: {}", tripId, seatId, exception.toString());
        }
    }

    private void verifyOwner(Reservation reservation, String username) {
        if (!reservation.getUserIdentifier().equals(username)) {
            throw new ResourceNotFoundException("Reservation not found: " + reservation.getId());
        }
    }

    private void verifyReservationStructure(Reservation reservation) {
        if (reservation.getTrip() == null || reservation.getTripSeat() == null) {
            throw new IllegalArgumentException("Reservation is missing trip seat information.");
        }
    }
}
