package com.seat_reservation_system.srv.scheduler;

import com.seat_reservation_system.srv.service.ReservationCleanupService;
import com.seat_reservation_system.srv.service.SeatReconcileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReservationCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReservationCleanupScheduler.class);

    private final ReservationCleanupService reservationCleanupService;
    private final SeatReconcileService seatReconcileService;

    public ReservationCleanupScheduler(
            ReservationCleanupService reservationCleanupService,
            SeatReconcileService seatReconcileService
    ) {
        this.reservationCleanupService = reservationCleanupService;
        this.seatReconcileService = seatReconcileService;
    }

    @Scheduled(fixedDelay = 30000)
    public void cleanupExpiredReservations() {
        try {
            reservationCleanupService.cleanupExpiredReservations();
        } catch (RuntimeException exception) {
            log.error("[CLEANUP] expiry sweep failed", exception);
        }
    }

    @Scheduled(fixedDelay = 60000, initialDelay = 20000)
    public void reconcileSeats() {
        try {
            seatReconcileService.reconcile();
        } catch (RuntimeException exception) {
            log.error("[RECONCILE] failed", exception);
        }
    }
}
