package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.ChangePasswordRequest;
import com.seat_reservation_system.srv.dto.ProfileResponse;
import com.seat_reservation_system.srv.dto.UpdateProfileRequest;
import com.seat_reservation_system.srv.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) { this.profileService = profileService; }

    @GetMapping
    public ProfileResponse get(Authentication authentication) { return profileService.get(authentication.getName()); }

    @PatchMapping
    public ProfileResponse update(@Valid @RequestBody UpdateProfileRequest request, Authentication authentication) {
        return profileService.update(authentication.getName(), request);
    }

    @PatchMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request, Authentication authentication) {
        profileService.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }
}
