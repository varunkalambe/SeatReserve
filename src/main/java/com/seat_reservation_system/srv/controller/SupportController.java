package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.SupportTicketRequest;
import com.seat_reservation_system.srv.dto.SupportTicketResponse;
import com.seat_reservation_system.srv.service.SupportService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/support")
public class SupportController {

    private final SupportService supportService;

    public SupportController(SupportService supportService) { this.supportService = supportService; }

    @GetMapping("/tickets")
    public List<SupportTicketResponse> tickets(Authentication authentication) { return supportService.getMyTickets(authentication.getName()); }

    @PostMapping("/tickets")
    public SupportTicketResponse create(@Valid @RequestBody SupportTicketRequest request, Authentication authentication) { return supportService.create(authentication.getName(), request); }
}
