package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.ChangePasswordRequest;
import com.seat_reservation_system.srv.dto.ProfileResponse;
import com.seat_reservation_system.srv.dto.UpdateProfileRequest;
import com.seat_reservation_system.srv.entity.AppUser;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.exception.UsernameAlreadyExistsException;
import com.seat_reservation_system.srv.repository.PaymentRepository;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import com.seat_reservation_system.srv.repository.SupportTicketRepository;
import com.seat_reservation_system.srv.repository.UserRepository;
import com.seat_reservation_system.srv.repository.WalletTransactionRepository;
import com.seat_reservation_system.srv.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class ProfileService {

    private static final Logger log = LoggerFactory.getLogger(ProfileService.class);
    private static final Pattern USERNAME = Pattern.compile("^[a-z0-9._-]{3,50}$");

    private final UserRepository userRepository;
    private final ReservationRepository reservationRepository;
    private final PaymentRepository paymentRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(
            UserRepository userRepository,
            ReservationRepository reservationRepository,
            PaymentRepository paymentRepository,
            WalletTransactionRepository walletTransactionRepository,
            SupportTicketRepository supportTicketRepository,
            JwtService jwtService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.reservationRepository = reservationRepository;
        this.paymentRepository = paymentRepository;
        this.walletTransactionRepository = walletTransactionRepository;
        this.supportTicketRepository = supportTicketRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public ProfileResponse get(String username) {
        return ProfileResponse.from(find(username));
    }

    /**
     * Updates name, email, phone and (optionally) the username. Bookings, payments, wallet history and
     * support tickets reference the username, so a rename moves all of them in the SAME transaction.
     */
    @Transactional
    public ProfileResponse update(String currentUsername, UpdateProfileRequest request) {
        AppUser user = userRepository.findByUsernameForUpdate(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        String email = blankToNull(request.email());
        String normalizedEmail = email == null ? null : email.toLowerCase(Locale.ROOT);

        if (normalizedEmail != null) {
            userRepository.findByEmail(normalizedEmail)
                    .filter(other -> !other.getId().equals(user.getId()))
                    .ifPresent(other -> {
                        throw new UsernameAlreadyExistsException("Email is already registered.");
                    });
        }

        String requested = blankToNull(request.username());
        String newUsername = requested == null ? null : requested.toLowerCase(Locale.ROOT);

        if (newUsername != null && !USERNAME.matcher(newUsername).matches()) {
            throw new IllegalArgumentException(
                    "Username must be 3-50 characters: letters, numbers, dots, dashes or underscores.");
        }

        boolean renamed = newUsername != null && !newUsername.equals(user.getUsername());

        if (renamed && userRepository.existsByUsername(newUsername)) {
            throw new UsernameAlreadyExistsException("Username is already taken.");
        }

        user.setFullName(blankToNull(request.fullName()));
        user.setEmail(normalizedEmail);
        user.setPhone(blankToNull(request.phone()));

        if (!renamed) {
            return ProfileResponse.from(userRepository.save(user));
        }

        String oldUsername = user.getUsername();
        user.setUsername(newUsername);

        AppUser saved;

        try {
            saved = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new UsernameAlreadyExistsException("Username or email is already taken.");
        }

        int reservations = reservationRepository.renameUser(oldUsername, newUsername);
        int payments = paymentRepository.renameUser(oldUsername, newUsername);
        int wallet = walletTransactionRepository.renameUser(oldUsername, newUsername);
        int tickets = supportTicketRepository.renameUser(oldUsername, newUsername);

        log.info("[PROFILE] renamed user {} -> {} (reservations={} payments={} wallet={} tickets={})",
                oldUsername, newUsername, reservations, payments, wallet, tickets);

        return ProfileResponse.from(saved)
                .withToken(jwtService.generateToken(saved), jwtService.getExpiration());
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        AppUser user = userRepository.findByUsernameForUpdate(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from the current one.");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    public AppUser find(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private String blankToNull(String value) {
        if (value == null) return null;

        String trimmed = value.trim();

        return trimmed.isBlank() ? null : trimmed;
    }
}
