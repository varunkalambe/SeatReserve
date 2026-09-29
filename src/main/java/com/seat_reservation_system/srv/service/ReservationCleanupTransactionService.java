package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.util.AppTime;

import com.seat_reservation_system.srv.entity.Reservation;
import com.seat_reservation_system.srv.entity.ReservationStatus;
import com.seat_reservation_system.srv.entity.SeatStatus;
import com.seat_reservation_system.srv.entity.TripSeat;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import com.seat_reservation_system.srv.repository.TripSeatRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ReservationCleanupTransactionService {

    private static final String SEAT_CACHE_PREFIX = "seat:status:";

    private final ReservationRepository reservationRepository;
    private final TripSeatRepository tripSeatRepository;
    private final StringRedisTemplate stringRedisTemplate;

    public ReservationCleanupTransactionService(
            ReservationRepository reservationRepository,
            TripSeatRepository tripSeatRepository,
            StringRedisTemplate stringRedisTemplate
    ) {
        this.reservationRepository = reservationRepository;
        this.tripSeatRepository = tripSeatRepository;
        this.stringRedisTemplate = stringRedisTemplate;
    }

    @Transactional
    public void expireReservation(Long reservationId) {
        Reservation reservation =
                reservationRepository.findByIdForUpdate(
                        reservationId
                ).orElse(null);

        if (reservation == null
                || reservation.getStatus() != ReservationStatus.PENDING
                || reservation.getExpiresAt() == null
                || reservation.getExpiresAt().isAfter(
                AppTime.now()
        )) {
            return;
        }

        reservation.setStatus(ReservationStatus.EXPIRED);
        reservationRepository.save(reservation);

        TripSeat tripSeat = reservation.getTripSeat();

        if (tripSeat == null ||
                reservation.getTrip() == null ||
                reservation.getSeat() == null) {
            return;
        }

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
    }
}
