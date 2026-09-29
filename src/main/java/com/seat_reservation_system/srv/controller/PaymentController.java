package com.seat_reservation_system.srv.controller;

import com.seat_reservation_system.srv.dto.BatchPaymentRequest;
import com.seat_reservation_system.srv.dto.PaymentRequest;
import com.seat_reservation_system.srv.dto.PaymentResponse;
import com.seat_reservation_system.srv.dto.ReservationResponse;
import com.seat_reservation_system.srv.dto.TicketResponse;
import com.seat_reservation_system.srv.service.PaymentService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) { this.paymentService = paymentService; }

    @PostMapping("/payments")
    public PaymentResponse pay(@Valid @RequestBody PaymentRequest request, Authentication authentication) {
        return paymentService.pay(request, authentication.getName());
    }

    @PostMapping("/payments/batch")
    public List<PaymentResponse> payBatch(@Valid @RequestBody BatchPaymentRequest request, Authentication authentication) {
        return paymentService.payBatch(request, authentication.getName());
    }

    @GetMapping("/payments/{reservationId}")
    public PaymentResponse getPayment(@PathVariable Long reservationId, Authentication authentication) {
        return paymentService.getPayment(reservationId, authentication.getName());
    }

    @GetMapping("/tickets/{reservationId}")
    public TicketResponse getTicket(@PathVariable Long reservationId, Authentication authentication) {
        return paymentService.getTicket(reservationId, authentication.getName());
    }

    @PostMapping("/reservations/{reservationId}/cancel")
    public ReservationResponse cancel(@PathVariable Long reservationId, Authentication authentication) {
        log.info("[CANCEL] HTTP POST /api/reservations/{}/cancel by user={}", reservationId, authentication.getName());
        ReservationResponse response = paymentService.cancelBooking(reservationId, authentication.getName());
        log.info("[CANCEL] HTTP 200 reservation={} status={}", response.reservationId(), response.status());
        return response;
    }
}
