package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    List<WalletTransaction> findTop20ByUsernameOrderByCreatedAtDescIdDesc(String username);

    /** Sum of credits with the given description since a point in time (null when there are none). */
    @Query("""
            select sum(t.amount) from WalletTransaction t
            where t.username = :username
              and t.type = 'CREDIT'
              and t.description = :description
              and t.createdAt >= :since
            """)
    BigDecimal sumCreditsSince(
            @Param("username") String username,
            @Param("description") String description,
            @Param("since") LocalDateTime since
    );

    @Modifying
    @Query("update WalletTransaction t set t.username = :newName where t.username = :oldName")
    int renameUser(@Param("oldName") String oldName, @Param("newName") String newName);
}
