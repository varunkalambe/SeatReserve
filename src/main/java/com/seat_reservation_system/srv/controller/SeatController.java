package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.SeatResponse;
import com.seat_reservation_system.srv.service.SeatService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seats")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) { this.seatService = seatService; }

    @GetMapping
    public ResponseEntity<List<SeatResponse>> getSeats(@RequestParam(required = false) Long tripId) {
        // Seat availability changes constantly: never let a browser or proxy serve a stale map.
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(seatService.getAllSeats(tripId));
    }
}
