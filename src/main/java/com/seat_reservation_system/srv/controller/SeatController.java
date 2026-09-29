package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.SeatResponse;
import com.seat_reservation_system.srv.service.SeatService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/seats")
public class SeatController {

    private final SeatService seatService;

    public SeatController(SeatService seatService) { this.seatService = seatService; }

    @GetMapping
    public List<SeatResponse> getSeats(@RequestParam(required = false) Long tripId) { return seatService.getAllSeats(tripId); }
}
