package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.NotificationResponse;
import com.seat_reservation_system.srv.entity.ReservationStatus;
import com.seat_reservation_system.srv.entity.SupportTicket;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import com.seat_reservation_system.srv.repository.SupportTicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class NotificationService {

    private final ReservationRepository reservationRepository;
    private final SupportTicketRepository supportTicketRepository;

    public NotificationService(ReservationRepository reservationRepository, SupportTicketRepository supportTicketRepository) {
        this.reservationRepository = reservationRepository;
        this.supportTicketRepository = supportTicketRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> get(String username) {
        List<NotificationResponse> items = new ArrayList<>();
        reservationRepository.findByUserIdentifierOrderByIdDesc(username).stream().limit(8).forEach(r -> {
            String title;
            String message;
            String type;
            if (r.getStatus() == ReservationStatus.CONFIRMED) {
                title = "Booking confirmed";
                message = "Your seat " + r.getSeat().getSeatNumber() + " is confirmed.";
                type = "success";
            } else if (r.getStatus() == ReservationStatus.PENDING) {
                title = "Seat on hold";
                message = "Your hold for seat " + r.getSeat().getSeatNumber() + " expires soon.";
                type = "warning";
            } else if (r.getStatus() == ReservationStatus.CANCELLED) {
                title = "Booking cancelled";
                message = "Your booking " + safe(r.getBookingReference()) + " was cancelled.";
                type = "info";
            } else {
                title = "Reservation update";
                message = "Reservation " + safe(r.getBookingReference()) + " changed status.";
                type = "info";
            }
            items.add(new NotificationResponse("reservation-" + r.getId(), title, message, type, r.getCreatedAt()));
        });
        for (SupportTicket t : supportTicketRepository.findByUsernameOrderByCreatedAtDesc(username).stream().limit(4).toList()) {
            items.add(new NotificationResponse("support-" + t.getId(), "Support ticket received", "We received your " + t.getCategory() + " request.", "info", t.getCreatedAt()));
        }
        return items.stream().sorted(Comparator.comparing(item -> item.createdAt() == null ? LocalDateTime.MIN : item.createdAt(), Comparator.reverseOrder())).limit(12).toList();
    }

    private String safe(String value) { return value == null ? "reservation" : value; }
}
