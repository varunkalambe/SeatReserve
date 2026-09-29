package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.dto.SupportTicketRequest;
import com.seat_reservation_system.srv.dto.SupportTicketResponse;
import com.seat_reservation_system.srv.entity.SupportTicket;
import com.seat_reservation_system.srv.repository.SupportTicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SupportService {

    private final SupportTicketRepository repository;

    public SupportService(SupportTicketRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SupportTicketResponse> getMyTickets(String username) {
        return repository.findByUsernameOrderByCreatedAtDesc(username).stream().map(SupportTicketResponse::from).toList();
    }

    @Transactional
    public SupportTicketResponse create(String username, SupportTicketRequest request) {
        return SupportTicketResponse.from(repository.save(new SupportTicket(username, request.category().trim(), request.message().trim())));
    }
}
