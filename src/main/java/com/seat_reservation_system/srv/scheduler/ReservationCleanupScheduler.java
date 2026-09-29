package com.seat_reservation_system.srv.scheduler;

import com.seat_reservation_system.srv.service.ReservationCleanupService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReservationCleanupScheduler {

    private final ReservationCleanupService
            reservationCleanupService;

    public ReservationCleanupScheduler(
            ReservationCleanupService reservationCleanupService
    ) {
        this.reservationCleanupService =
                reservationCleanupService;
    }

    @Scheduled(fixedDelay = 30000)
    public void cleanupExpiredReservations() {
        reservationCleanupService
                .cleanupExpiredReservations();
    }
}