package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.BatchHoldSeatsRequest;
import com.seat_reservation_system.srv.dto.HoldSeatRequest;
import com.seat_reservation_system.srv.dto.ReservationResponse;
import com.seat_reservation_system.srv.entity.Reservation;
import com.seat_reservation_system.srv.exception.LockAcquisitionException;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import org.redisson.api.RLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class ReservationService {

    private static final String SEAT_LOCK_PREFIX = "seat:lock:";
    private static final Logger log = LoggerFactory.getLogger(ReservationService.class);

    private final RedissonClient redissonClient;
    private final ReservationTransactionService reservationTransactionService;
    private final ReservationRepository reservationRepository;

    public ReservationService(
            RedissonClient redissonClient,
            ReservationTransactionService reservationTransactionService,
            ReservationRepository reservationRepository
    ) {
        this.redissonClient = redissonClient;
        this.reservationTransactionService = reservationTransactionService;
        this.reservationRepository = reservationRepository;
    }

    public ReservationResponse holdSeat(
            HoldSeatRequest request,
            String username
    ) {
        return withSeatLock(
                lockKey(request.tripId(), request.seatId()),
                () -> reservationTransactionService.holdSeat(
                        request,
                        username
                )
        );
    }

    public List<ReservationResponse> holdSeats(
            BatchHoldSeatsRequest request,
            String username
    ) {
        List<Long> seatIds =
                request.seatIds()
                        .stream()
                        .distinct()
                        .sorted()
                        .toList();

        if (seatIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one seat.");
        }

        List<RLock> locks = new ArrayList<>();

        try {
            for (Long seatId : seatIds) {
                RLock lock =
                        redissonClient.getLock(
                                lockKey(request.tripId(), seatId)
                        );

                if (!lock.tryLock(3, TimeUnit.SECONDS)) {
                    throw new LockAcquisitionException(
                            "One of the selected seats is being processed. Please try again."
                    );
                }

                locks.add(lock);
            }

            return reservationTransactionService.holdSeats(
                    request,
                    username,
                    seatIds
            );
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            throw new LockAcquisitionException(
                    "Interrupted while waiting for seat locks.",
                    exception
            );
        } finally {
            for (int i = locks.size() - 1; i >= 0; i--) {
                RLock lock = locks.get(i);

                if (lock.isHeldByCurrentThread()) {
                    lock.unlock();
                }
            }
        }
    }

    public ReservationResponse confirmReservation(
            Long reservationId,
            String username
    ) {
        Reservation reservation =
                reservationRepository.findByIdWithSeatAndTrip(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found: " + reservationId
                                )
                        );

        if (reservation.getTrip() == null ||
                reservation.getTripSeat() == null) {
            throw new IllegalArgumentException(
                    "Reservation is missing trip seat information."
            );
        }

        return withSeatLock(
                lockKey(
                        reservation.getTrip().getId(),
                        reservation.getSeat().getId()
                ),
                () -> reservationTransactionService.confirmReservation(
                        reservationId,
                        username
                )
        );
    }

    public ReservationResponse cancelReservation(
            Long reservationId,
            String username
    ) {
        log.info("[CANCEL] reservation service: user={} reservation={}", username, reservationId);

        Reservation reservation =
                reservationRepository.findByIdWithSeatAndTrip(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found: " + reservationId
                                )
                        );

        if (reservation.getTrip() == null ||
                reservation.getTripSeat() == null) {
            throw new IllegalArgumentException(
                    "Reservation is missing trip seat information."
            );
        }

        return withSeatLock(
                lockKey(
                        reservation.getTrip().getId(),
                        reservation.getSeat().getId()
                ),
                () -> reservationTransactionService.cancelReservation(
                        reservationId,
                        username
                )
        );
    }

    /**
     * Releases the caller's unpaid seat locks. Reservations that are already paid, expired or
     * unknown are skipped silently so the call is safe to fire when leaving the payment page.
     */
    public List<ReservationResponse> releaseHolds(
            List<Long> reservationIds,
            String username
    ) {
        List<ReservationResponse> released = new ArrayList<>();

        log.info("[RELEASE] request user={} ids={}", username, reservationIds);

        for (Long reservationId : reservationIds.stream().filter(java.util.Objects::nonNull).distinct().toList()) {
            try {
                Reservation reservation =
                        reservationRepository
                                .findByIdWithSeatAndTrip(reservationId)
                                .orElse(null);

                if (reservation == null
                        || reservation.getTrip() == null
                        || reservation.getTripSeat() == null
                        || !username.equals(reservation.getUserIdentifier())) {
                    log.warn("[RELEASE] skipping reservation={} (missing, incomplete or not owned by {})",
                            reservationId, username);
                    continue;
                }

                Long tripId = reservation.getTrip().getId();
                Long seatId = reservation.getSeat().getId();

                released.add(
                        withSeatLock(
                                lockKey(tripId, seatId),
                                () -> reservationTransactionService.releaseHold(
                                        reservationId,
                                        username
                                )
                        )
                );
            } catch (RuntimeException exception) {
                // One failing seat must never block releasing the others, and must never surface as a 500.
                log.error("[RELEASE] failed for reservation={} user={}", reservationId, username, exception);
            }
        }

        log.info("[RELEASE] done user={} released={}/{}", username, released.size(), reservationIds.size());
        return released;
    }

    public List<ReservationResponse> getMyReservations(String username) {
        return reservationTransactionService.getMyReservations(username);
    }

    private String lockKey(Long tripId, Long seatId) {
        if (tripId == null || seatId == null) {
            throw new IllegalArgumentException(
                    "Trip and seat are required for seat locking."
            );
        }

        return SEAT_LOCK_PREFIX + tripId + ":" + seatId;
    }

    private ReservationResponse withSeatLock(
            String key,
            ReservationAction action
    ) {
        RLock lock = redissonClient.getLock(key);
        boolean acquired = false;
        long waitStartedAt = System.nanoTime();

        try {
            acquired = lock.tryLock(3, TimeUnit.SECONDS);

            log.debug("[LOCK] key={} acquired={} waited={}ms thread={}",
                    key, acquired, (System.nanoTime() - waitStartedAt) / 1_000_000,
                    Thread.currentThread().getName());

            if (!acquired) {
                log.warn("[LOCK] could not get {} within 3s - another request holds it", key);
                throw new LockAcquisitionException(
                        "Seat is currently being processed. Please try again."
                );
            }

            return action.run();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            throw new LockAcquisitionException(
                    "Interrupted while waiting for seat lock.",
                    exception
            );
        } finally {
            if (acquired && lock.isHeldByCurrentThread()) {
                lock.unlock();
                log.debug("[LOCK] key={} released", key);
            }
        }
    }

    @FunctionalInterface
    private interface ReservationAction {
        ReservationResponse run();
    }
}
