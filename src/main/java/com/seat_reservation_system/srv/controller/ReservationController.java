package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.BatchHoldSeatsRequest;
import com.seat_reservation_system.srv.dto.HoldSeatRequest;
import com.seat_reservation_system.srv.dto.ReleaseHoldsRequest;
import com.seat_reservation_system.srv.dto.ReservationResponse;
import com.seat_reservation_system.srv.service.ReservationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {

    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    public ResponseEntity<ReservationResponse> holdSeat(
            @Valid @RequestBody HoldSeatRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.holdSeat(request, authentication.getName()));
    }

    @PostMapping("/batch")
    public ResponseEntity<List<ReservationResponse>> holdSeats(
            @Valid @RequestBody BatchHoldSeatsRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.holdSeats(request, authentication.getName()));
    }

    @PostMapping("/release")
    public List<ReservationResponse> releaseHolds(
            @Valid @RequestBody ReleaseHoldsRequest request,
            Authentication authentication
    ) {
        return reservationService.releaseHolds(request.reservationIds(), authentication.getName());
    }

    @GetMapping("/me")
    public List<ReservationResponse> getMyReservations(Authentication authentication) {
        return reservationService.getMyReservations(authentication.getName());
    }
}
