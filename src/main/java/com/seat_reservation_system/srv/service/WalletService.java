package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.TopUpRequest;
import com.seat_reservation_system.srv.dto.WalletResponse;
import com.seat_reservation_system.srv.dto.WalletTransactionResponse;
import com.seat_reservation_system.srv.entity.AppUser;
import com.seat_reservation_system.srv.entity.WalletTransaction;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.repository.UserRepository;
import com.seat_reservation_system.srv.repository.WalletTransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class WalletService {

    private final UserRepository userRepository;
    private final WalletTransactionRepository transactionRepository;
    private final boolean demoTopUpEnabled;

    public WalletService(
            UserRepository userRepository,
            WalletTransactionRepository transactionRepository,
            @Value("${wallet.demo-top-up-enabled:false}") boolean demoTopUpEnabled
    ) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.demoTopUpEnabled = demoTopUpEnabled;
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(String username) {
        return new WalletResponse(find(username).getWalletBalance());
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> getTransactions(String username) {
        return transactionRepository
                .findTop20ByUsernameOrderByCreatedAtDescIdDesc(username)
                .stream()
                .map(WalletTransactionResponse::from)
                .toList();
    }

    @Transactional
    public WalletResponse topUp(String username, TopUpRequest request) {
        if (!demoTopUpEnabled) {
            throw new IllegalArgumentException("Wallet top-up is disabled because no real payment provider is connected.");
        }

        BigDecimal amount = normalizePositive(request.amount());
        AppUser user = findForUpdate(username);
        user.setWalletBalance(user.getWalletBalance().add(amount));
        userRepository.save(user);
        transactionRepository.save(new WalletTransaction(username, amount, "CREDIT", "Development wallet top-up"));
        return new WalletResponse(user.getWalletBalance());
    }

    @Transactional
    public void debit(String username, BigDecimal amount, String description) {
        BigDecimal normalizedAmount = normalizePositive(amount);
        AppUser user = findForUpdate(username);
        if (user.getWalletBalance().compareTo(normalizedAmount) < 0) {
            throw new IllegalArgumentException("Insufficient wallet balance.");
        }
        user.setWalletBalance(user.getWalletBalance().subtract(normalizedAmount));
        userRepository.save(user);
        transactionRepository.save(new WalletTransaction(username, normalizedAmount.negate(), "DEBIT", description));
    }

    @Transactional
    public void credit(String username, BigDecimal amount, String description) {
        BigDecimal normalizedAmount = normalizePositive(amount);
        AppUser user = findForUpdate(username);
        user.setWalletBalance(user.getWalletBalance().add(normalizedAmount));
        userRepository.save(user);
        transactionRepository.save(new WalletTransaction(username, normalizedAmount, "CREDIT", description));
    }

    private AppUser find(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private AppUser findForUpdate(String username) {
        return userRepository.findByUsernameForUpdate(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private BigDecimal normalizePositive(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero.");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }
}
