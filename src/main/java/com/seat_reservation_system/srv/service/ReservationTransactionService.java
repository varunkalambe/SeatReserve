package com.seat_reservation_system.srv.service;

import org.slf4j.LoggerFactory;
import org.slf4j.Logger;
import com.seat_reservation_system.srv.util.AppTime;

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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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
    public ReservationResponse holdSeat(
            HoldSeatRequest request,
            String username
    ) {
        List<ReservationResponse> responses =
                holdSeats(
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
            throw new IllegalArgumentException(
                    "You can hold between 1 and 6 seats at once."
            );
        }

        BusTrip trip =
                busTripRepository.findById(request.tripId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Bus trip not found: " +
                                                request.tripId()
                                )
                        );

        if (!trip.getDepartureTime().isAfter(AppTime.now())) {
            throw new IllegalArgumentException(
                    "This trip has already departed."
            );
        }

        String passengerName = request.passengerName().trim();
        String contactPhone = request.contactPhone().trim();

        if (passengerName.isBlank() || contactPhone.isBlank()) {
            throw new IllegalArgumentException(
                    "Passenger name and contact phone are required."
            );
        }

        List<TripSeat> tripSeats = new ArrayList<>();

        for (Long seatId : seatIds) {
            TripSeat tripSeat =
                    tripSeatRepository
                            .findByTripIdAndSeatIdWithTripAndSeat(
                                    request.tripId(),
                                    seatId
                            )
                            .orElseThrow(() ->
                                    new ResourceNotFoundException(
                                            "Seat is not configured for this bus trip: " +
                                                    seatId
                                    )
                            );

            if (tripSeat.getStatus() != SeatStatus.AVAILABLE) {
                throw new SeatUnavailableException(
                        "Seat is not available: " +
                                tripSeat.getSeat().getSeatNumber()
                );
            }

            tripSeats.add(tripSeat);
        }

        LocalDateTime expiresAt =
                AppTime.now().plusMinutes(HOLD_MINUTES);

        List<ReservationResponse> responses = new ArrayList<>();

        log.info("[HOLD] user={} trip={} seats={} now={} expiresAt={} (zone={})",
                username, request.tripId(), seatIds, AppTime.now(), expiresAt, AppTime.zone());

        for (TripSeat tripSeat : tripSeats) {
            tripSeat.setStatus(SeatStatus.HELD);
            tripSeatRepository.save(tripSeat);

            Reservation reservation =
                    new Reservation(
                            tripSeat.getSeat(),
                            trip,
                            tripSeat,
                            username,
                            ReservationStatus.PENDING,
                            expiresAt,
                            trip.getPrice(),
                            passengerName,
                            contactPhone
                    );

            Reservation saved =
                    reservationRepository.save(reservation);

            saved.setBookingReference(
                    String.format("SRV%06d", saved.getId())
            );

            reservationRepository.save(saved);

            stringRedisTemplate.opsForValue().set(
                    SEAT_CACHE_PREFIX +
                            request.tripId() +
                            ":" +
                            tripSeat.getSeat().getId(),
                    SeatStatus.HELD.name()
            );

            ReservationResponse response = ReservationResponse.from(saved);
            log.info("[HOLD] created reservation={} seat={} holdSecondsRemaining={}",
                    saved.getId(), tripSeat.getSeat().getSeatNumber(), response.holdSecondsRemaining());
            responses.add(response);
        }

        return responses;
    }

    @Transactional
    public ReservationResponse confirmReservation(
            Long reservationId,
            String username
    ) {
        Reservation reservation =
                reservationRepository
                        .findByIdWithSeatAndTrip(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found: " +
                                                reservationId
                                )
                        );

        verifyReservationStructure(reservation);
        verifyOwner(reservation, username);

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new SeatUnavailableException(
                    "Reservation is not pending."
            );
        }

        if (!reservation.getExpiresAt().isAfter(AppTime.now())) {
            throw new SeatUnavailableException(
                    "Reservation has expired."
            );
        }

        TripSeat tripSeat = reservation.getTripSeat();

        if (tripSeat.getStatus() != SeatStatus.HELD) {
            throw new SeatUnavailableException(
                    "Seat is not currently held."
            );
        }

        reservation.setStatus(ReservationStatus.CONFIRMED);
        tripSeat.setStatus(SeatStatus.BOOKED);

        reservationRepository.save(reservation);
        tripSeatRepository.save(tripSeat);

        stringRedisTemplate.opsForValue().set(
                SEAT_CACHE_PREFIX +
                        reservation.getTrip().getId() +
                        ":" +
                        reservation.getSeat().getId(),
                SeatStatus.BOOKED.name()
        );

        return ReservationResponse.from(reservation);
    }

    @Transactional
    public ReservationResponse cancelReservation(
            Long reservationId,
            String username
    ) {
        Reservation reservation =
                reservationRepository
                        .findByIdWithSeatAndTrip(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found: " +
                                                reservationId
                                )
                        );

        verifyReservationStructure(reservation);
        verifyOwner(reservation, username);

        log.info("[CANCEL] reservation={} status={} tripSeatStatus={} departure={} now={}",
                reservation.getId(), reservation.getStatus(),
                reservation.getTripSeat().getStatus(),
                reservation.getTrip().getDepartureTime(), AppTime.now());

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                    "Only confirmed bookings can be cancelled. This booking is "
                            + reservation.getStatus().name().toLowerCase() + "."
            );
        }

        if (!reservation.getTrip().getDepartureTime()
                .isAfter(AppTime.now())) {
            throw new IllegalArgumentException(
                    "This bus has already departed, so the booking can no longer be cancelled."
            );
        }

        TripSeat tripSeat = reservation.getTripSeat();

        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        // Only free the seat when this booking really owns it. If the seat row is out of sync
        // (e.g. legacy data) the cancellation still succeeds instead of failing with 409.
        if (tripSeat.getStatus() == SeatStatus.BOOKED) {
            tripSeat.setStatus(SeatStatus.AVAILABLE);
            tripSeatRepository.save(tripSeat);

            stringRedisTemplate.opsForValue().set(
                    SEAT_CACHE_PREFIX +
                            reservation.getTrip().getId() +
                            ":" +
                            reservation.getSeat().getId(),
                    SeatStatus.AVAILABLE.name()
            );
        }

        return ReservationResponse.from(reservation);
    }

    /**
     * Releases an unpaid 5-minute seat lock early (user pressed "Back" or left the payment page).
     * Idempotent: anything that is no longer PENDING is simply returned as-is.
     */
    @Transactional
    public ReservationResponse releaseHold(
            Long reservationId,
            String username
    ) {
        Reservation locked =
                reservationRepository
                        .findByIdForUpdate(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found: " +
                                                reservationId
                                )
                        );

        Reservation reservation =
                reservationRepository
                        .findByIdWithSeatAndTrip(locked.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found: " +
                                                reservationId
                                )
                        );

        verifyReservationStructure(reservation);
        verifyOwner(reservation, username);

        log.info("[RELEASE] reservation={} status={} tripSeatStatus={} user={}",
                reservation.getId(), reservation.getStatus(),
                reservation.getTripSeat().getStatus(), username);

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            log.info("[RELEASE] reservation={} is not PENDING, nothing to release", reservation.getId());
            return ReservationResponse.from(reservation);
        }

        reservation.setStatus(ReservationStatus.EXPIRED);
        reservation.setExpiresAt(AppTime.now());
        reservationRepository.save(reservation);

        TripSeat tripSeat = reservation.getTripSeat();

        if (tripSeat.getStatus() == SeatStatus.HELD) {
            tripSeat.setStatus(SeatStatus.AVAILABLE);
            tripSeatRepository.save(tripSeat);

            stringRedisTemplate.opsForValue().set(
                    SEAT_CACHE_PREFIX +
                            reservation.getTrip().getId() +
                            ":" +
                            reservation.getSeat().getId(),
                    SeatStatus.AVAILABLE.name()
            );
        }

        return ReservationResponse.from(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> getMyReservations(
            String username
    ) {
        return reservationRepository
                .findByUserIdentifierOrderByIdDesc(username)
                .stream()
                .map(ReservationResponse::from)
                .toList();
    }

    private void verifyOwner(
            Reservation reservation,
            String username
    ) {
        if (!reservation.getUserIdentifier().equals(username)) {
            throw new ResourceNotFoundException(
                    "Reservation not found: " + reservation.getId()
            );
        }
    }

    private void verifyReservationStructure(
            Reservation reservation
    ) {
        if (reservation.getTrip() == null ||
                reservation.getTripSeat() == null) {
            throw new IllegalArgumentException(
                    "Reservation is missing trip seat information."
            );
        }
    }
}
