package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.BusTrip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BusTripRepository extends JpaRepository<BusTrip, Long> {
    List<BusTrip> findAllByOrderByDepartureTimeAsc();
}
