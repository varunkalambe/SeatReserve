package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SeatRepository extends JpaRepository<Seat, Long> {
}