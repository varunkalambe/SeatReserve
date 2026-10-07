package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUsernameOrderByCreatedAtDesc(String username);

    @Modifying
    @Query("update SupportTicket t set t.username = :newName where t.username = :oldName")
    int renameUser(@Param("oldName") String oldName, @Param("newName") String newName);
}
