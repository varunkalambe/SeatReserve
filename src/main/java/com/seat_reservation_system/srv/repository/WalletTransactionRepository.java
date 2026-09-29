package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    List<WalletTransaction> findTop20ByUsernameOrderByCreatedAtDescIdDesc(String username);
}
