package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByReservationId(Long reservationId);

    @Modifying
    @Query("update Payment p set p.username = :newName where p.username = :oldName")
    int renameUser(@Param("oldName") String oldName, @Param("newName") String newName);
}
