package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.repository.TripSeatRepository;
import com.seat_reservation_system.srv.util.AppTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Self-healing: makes trip_seats.status agree with the reservations table (the source of truth).
 * Paid seats can therefore never come back as "available" because of a stale flag.
 */
@Service
public class SeatReconcileService {

    private static final Logger log = LoggerFactory.getLogger(SeatReconcileService.class);

    private final TripSeatRepository tripSeatRepository;

    public SeatReconcileService(TripSeatRepository tripSeatRepository) {
        this.tripSeatRepository = tripSeatRepository;
    }

    @Transactional
    public void reconcile() {
        int booked = tripSeatRepository.promoteBooked();
        int held = tripSeatRepository.promoteHeld(AppTime.now());
        int freed = tripSeatRepository.demoteStaleHeld(AppTime.now());

        if (booked + held + freed > 0) {
            log.warn("[RECONCILE] repaired seat rows: booked={} held={} freed={}", booked, held, freed);
        }
    }
}
