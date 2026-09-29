package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.ProfileResponse;
import com.seat_reservation_system.srv.dto.UpdateProfileRequest;
import com.seat_reservation_system.srv.entity.AppUser;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.exception.UsernameAlreadyExistsException;
import com.seat_reservation_system.srv.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class ProfileService {

    private final UserRepository userRepository;

    public ProfileService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public ProfileResponse get(String username) {
        return ProfileResponse.from(find(username));
    }

    @Transactional
    public ProfileResponse update(
            String username,
            UpdateProfileRequest request
    ) {
        AppUser user = find(username);

        String email = blankToNull(request.email());
        String normalizedEmail =
                email == null
                        ? null
                        : email.toLowerCase(Locale.ROOT);

        if (normalizedEmail != null) {
            userRepository.findByEmail(normalizedEmail)
                    .filter(other -> !other.getId().equals(user.getId()))
                    .ifPresent(other -> {
                        throw new UsernameAlreadyExistsException(
                                "Email is already registered."
                        );
                    });
        }

        user.setFullName(blankToNull(request.fullName()));
        user.setEmail(normalizedEmail);
        user.setPhone(blankToNull(request.phone()));

        return ProfileResponse.from(
                userRepository.save(user)
        );
    }

    public AppUser find(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found."
                        )
                );
    }

    private String blankToNull(String value) {
        if (value == null) return null;

        String trimmed = value.trim();

        return trimmed.isBlank()
                ? null
                : trimmed;
    }
}
