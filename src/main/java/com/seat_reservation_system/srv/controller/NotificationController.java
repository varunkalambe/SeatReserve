package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.NotificationResponse;
import com.seat_reservation_system.srv.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) { this.notificationService = notificationService; }

    @GetMapping
    public List<NotificationResponse> get(Authentication authentication) { return notificationService.get(authentication.getName()); }
}
