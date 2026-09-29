package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.AuthResponse;
import com.seat_reservation_system.srv.dto.LoginRequest;
import com.seat_reservation_system.srv.dto.RegisterRequest;
import com.seat_reservation_system.srv.entity.AppUser;
import com.seat_reservation_system.srv.entity.Role;
import com.seat_reservation_system.srv.exception.InvalidCredentialsException;
import com.seat_reservation_system.srv.exception.UsernameAlreadyExistsException;
import com.seat_reservation_system.srv.repository.UserRepository;
import com.seat_reservation_system.srv.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String requestedUsername =
                request.username() == null
                        ? ""
                        : request.username().trim().toLowerCase();

        String email =
                request.email() == null
                        ? null
                        : request.email().trim().toLowerCase();

        String username =
                resolveUsername(
                        requestedUsername,
                        email
                );

        if (userRepository.existsByUsername(username)
                && !requestedUsername.isBlank()) {
            throw new UsernameAlreadyExistsException(
                    "Username already exists."
            );
        }

        if (email != null &&
                userRepository.findByEmail(email).isPresent()) {
            throw new UsernameAlreadyExistsException(
                    "Email is already registered."
            );
        }

        AppUser user =
                new AppUser(
                        username,
                        passwordEncoder.encode(request.password()),
                        Role.USER
                );

        user.setFullName(
                request.fullName() == null
                        ? null
                        : request.fullName().trim()
        );

        user.setEmail(email);

        AppUser saved =
                userRepository.save(user);

        return response(saved);
    }

    private String resolveUsername(
            String requestedUsername,
            String email
    ) {
        if (!requestedUsername.isBlank()) {
            return requestedUsername.length() > 50
                    ? requestedUsername.substring(0, 50)
                    : requestedUsername;
        }

        String base =
                email == null
                        ? ""
                        : email.split("@", 2)[0]
                        .replaceAll(
                                "[^a-z0-9._-]",
                                ""
                        );

        if (base.length() < 3) {
            base = "user";
        }

        if (base.length() > 45) {
            base = base.substring(0, 45);
        }

        String candidate = base;
        int suffix = 2;

        while (userRepository.existsByUsername(candidate)) {
            String suffixText = "_" + suffix++;
            int maxBaseLength =
                    Math.max(
                            1,
                            50 - suffixText.length()
                    );

            candidate =
                    base.substring(
                            0,
                            Math.min(
                                    base.length(),
                                    maxBaseLength
                            )
                    ) + suffixText;
        }

        return candidate;
    }

    public AuthResponse login(LoginRequest request) {
        String username =
                request.username()
                        .trim()
                        .toLowerCase();

        String loginUsername = username;

        if (username.contains("@")) {
            loginUsername =
                    userRepository
                            .findByEmail(username)
                            .map(AppUser::getUsername)
                            .orElse(username);
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginUsername,
                            request.password()
                    )
            );
        } catch (BadCredentialsException | UsernameNotFoundException exception) {
            throw new InvalidCredentialsException(
                    "Invalid username or password."
            );
        }

        AppUser user =
                userRepository
                        .findByUsername(loginUsername)
                        .orElseThrow(() ->
                                new InvalidCredentialsException(
                                        "Invalid username or password."
                                )
                        );

        return response(user);
    }

    private AuthResponse response(AppUser user) {
        return new AuthResponse(
                jwtService.generateToken(user),
                user.getUsername(),
                jwtService.getExpiration(),
                user.getFullName(),
                user.getEmail()
        );
    }
}