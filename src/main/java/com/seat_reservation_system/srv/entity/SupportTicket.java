package com.seat_reservation_system.srv.entity;

import com.seat_reservation_system.srv.util.AppTime;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "support_tickets")
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false, length = 60)
    private String category;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected SupportTicket() {
    }

    public SupportTicket(String username, String category, String message) {
        this.username = username;
        this.category = category;
        this.message = message;
        this.status = "OPEN";
        this.createdAt = AppTime.now();
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public String getCategory() { return category; }
    public String getMessage() { return message; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
