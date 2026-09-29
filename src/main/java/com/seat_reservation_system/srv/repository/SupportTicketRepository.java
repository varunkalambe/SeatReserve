package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUsernameOrderByCreatedAtDesc(String username);
}
