package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.TopUpRequest;
import com.seat_reservation_system.srv.dto.WalletResponse;
import com.seat_reservation_system.srv.dto.WalletTransactionResponse;
import com.seat_reservation_system.srv.entity.AppUser;
import com.seat_reservation_system.srv.entity.WalletTransaction;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.repository.UserRepository;
import com.seat_reservation_system.srv.repository.WalletTransactionRepository;
import com.seat_reservation_system.srv.util.AppTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class WalletService {

    /** Description stored on top-up ledger rows (also used to compute the daily top-up total). */
    static final String TOP_UP_DESCRIPTION = "Wallet top-up";

    private static final BigDecimal MIN_TOP_UP = new BigDecimal("1.00");
    private static final BigDecimal MAX_TOP_UP = new BigDecimal("50000.00");

    private final UserRepository userRepository;
    private final WalletTransactionRepository transactionRepository;
    private final boolean topUpEnabled;
    private final BigDecimal dailyLimit;
    private final BigDecimal maxBalance;

    public WalletService(
            UserRepository userRepository,
            WalletTransactionRepository transactionRepository,
            @Value("${wallet.demo-top-up-enabled:true}") boolean topUpEnabled,
            @Value("${wallet.top-up.daily-limit:50000}") BigDecimal dailyLimit,
            @Value("${wallet.top-up.max-balance:100000}") BigDecimal maxBalance
    ) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.topUpEnabled = topUpEnabled;
        this.dailyLimit = dailyLimit.setScale(2, RoundingMode.HALF_UP);
        this.maxBalance = maxBalance.setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional(readOnly = true)
    public WalletResponse getWallet(String username) {
        return snapshot(find(username));
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponse> getTransactions(String username) {
        return transactionRepository
                .findTop20ByUsernameOrderByCreatedAtDescIdDesc(username)
                .stream()
                .map(WalletTransactionResponse::from)
                .toList();
    }

    /**
     * Adds money to the wallet. No real payment gateway is connected, so this is a simulated
     * payment: it is protected by a per-request cap, a per-day cap and a maximum wallet balance.
     * Replace the body of this method with a verified gateway callback (Razorpay/Stripe webhook)
     * before handling real money.
     */
    @Transactional
    public WalletResponse topUp(String username, TopUpRequest request) {
        if (!topUpEnabled) {
            throw new IllegalArgumentException("Wallet top-up is currently disabled.");
        }

        BigDecimal amount = normalizePositive(request.amount());

        if (amount.compareTo(MIN_TOP_UP) < 0) {
            throw new IllegalArgumentException("Minimum top-up is " + inr(MIN_TOP_UP) + ".");
        }
        if (amount.compareTo(MAX_TOP_UP) > 0) {
            throw new IllegalArgumentException("Maximum top-up per transaction is " + inr(MAX_TOP_UP) + ".");
        }

        // Row lock first: two simultaneous top-ups cannot both slip under the daily limit.
        AppUser user = findForUpdate(username);

        BigDecimal remainingToday = dailyRemaining(username);
        if (amount.compareTo(remainingToday) > 0) {
            throw new IllegalArgumentException(
                    remainingToday.signum() == 0
                            ? "Daily top-up limit of " + inr(dailyLimit) + " reached. Try again tomorrow."
                            : "Daily top-up limit exceeded. You can add up to " + inr(remainingToday) + " more today."
            );
        }

        BigDecimal newBalance = user.getWalletBalance().add(amount);
        if (newBalance.compareTo(maxBalance) > 0) {
            BigDecimal room = maxBalance.subtract(user.getWalletBalance()).max(BigDecimal.ZERO);
            throw new IllegalArgumentException(
                    "Wallet balance cannot exceed " + inr(maxBalance) + ". You can add up to " + inr(room) + " more."
            );
        }

        user.setWalletBalance(newBalance);
        userRepository.save(user);
        transactionRepository.save(new WalletTransaction(username, amount, "CREDIT", TOP_UP_DESCRIPTION));

        return snapshot(user);
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

    private WalletResponse snapshot(AppUser user) {
        return new WalletResponse(
                user.getWalletBalance(),
                topUpEnabled,
                MIN_TOP_UP,
                MAX_TOP_UP,
                topUpEnabled ? dailyRemaining(user.getUsername()) : BigDecimal.ZERO.setScale(2)
        );
    }

    private BigDecimal dailyRemaining(String username) {
        BigDecimal used = transactionRepository.sumCreditsSince(
                username,
                TOP_UP_DESCRIPTION,
                AppTime.today().atStartOfDay()
        );
        BigDecimal remaining = dailyLimit.subtract(used == null ? BigDecimal.ZERO : used);
        return remaining.signum() < 0 ? BigDecimal.ZERO.setScale(2) : remaining.setScale(2, RoundingMode.HALF_UP);
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

    private static String inr(BigDecimal value) {
        return "\u20B9" + value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}


