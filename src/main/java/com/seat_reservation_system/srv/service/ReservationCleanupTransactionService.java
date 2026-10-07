package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.entity.Reservation;
import com.seat_reservation_system.srv.entity.ReservationStatus;
import com.seat_reservation_system.srv.entity.SeatStatus;
import com.seat_reservation_system.srv.entity.TripSeat;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import com.seat_reservation_system.srv.repository.TripSeatRepository;
import com.seat_reservation_system.srv.util.AppTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class ReservationCleanupTransactionService {

    private static final String SEAT_CACHE_PREFIX = "seat:status:";
    private static final Logger log = LoggerFactory.getLogger(ReservationCleanupTransactionService.class);

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
        Reservation reservation = reservationRepository.findByIdForUpdate(reservationId).orElse(null);
        LocalDateTime now = AppTime.now();

        if (reservation == null
                || reservation.getStatus() != ReservationStatus.PENDING
                || reservation.getExpiresAt() == null
                || reservation.getExpiresAt().isAfter(now)) {
            return;
        }

        reservation.setStatus(ReservationStatus.EXPIRED);
        reservationRepository.save(reservation);

        if (reservation.getTripSeat() == null) {
            return;
        }

        TripSeat tripSeat = tripSeatRepository.findByIdForUpdate(reservation.getTripSeat().getId()).orElse(null);

        if (tripSeat == null || tripSeat.getStatus() != SeatStatus.HELD) {
            return;
        }

        // Never free a seat that another live reservation (e.g. a paid one) still owns.
        if (reservationRepository.existsLiveForTripSeat(tripSeat.getId(), now)) {
            return;
        }

        tripSeat.setStatus(SeatStatus.AVAILABLE);
        tripSeatRepository.save(tripSeat);

        try {
            stringRedisTemplate.opsForValue().set(
                    SEAT_CACHE_PREFIX + tripSeat.getTrip().getId() + ":" + tripSeat.getSeat().getId(),
                    SeatStatus.AVAILABLE.name()
            );
        } catch (RuntimeException exception) {
            log.warn("[CACHE] could not update seat cache: {}", exception.toString());
        }
    }
}
