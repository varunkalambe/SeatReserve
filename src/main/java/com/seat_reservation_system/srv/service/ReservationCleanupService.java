package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.util.AppTime;

import com.seat_reservation_system.srv.entity.Reservation;
import com.seat_reservation_system.srv.entity.ReservationStatus;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReservationCleanupService {

    private final ReservationRepository reservationRepository;
    private final ReservationCleanupTransactionService cleanupTransactionService;

    public ReservationCleanupService(
            ReservationRepository reservationRepository,
            ReservationCleanupTransactionService cleanupTransactionService
    ) {
        this.reservationRepository = reservationRepository;
        this.cleanupTransactionService = cleanupTransactionService;
    }

    public void cleanupExpiredReservations() {
        List<Reservation> expiredReservations =
                reservationRepository.findExpiredPendingWithSeat(
                        ReservationStatus.PENDING,
                        AppTime.now()
                );

        for (Reservation reservation : expiredReservations) {
            cleanupTransactionService.expireReservation(
                    reservation.getId()
            );
        }
    }
}
