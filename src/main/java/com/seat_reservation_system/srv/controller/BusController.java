package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.BusTripResponse;
import com.seat_reservation_system.srv.service.BusService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/buses")
public class BusController {

    private final BusService busService;

    public BusController(BusService busService) { this.busService = busService; }

    @GetMapping("/search")
    public List<BusTripResponse> search(@RequestParam(required = false) String from, @RequestParam(required = false) String to, @RequestParam(required = false) LocalDate date) {
        return busService.search(from, to, date);
    }

    @GetMapping("/popular")
    public List<BusTripResponse> popular() { return busService.popular(); }

    @GetMapping("/{tripId}")
    public BusTripResponse get(@PathVariable Long tripId) { return BusTripResponse.from(busService.findTrip(tripId)); }
}
