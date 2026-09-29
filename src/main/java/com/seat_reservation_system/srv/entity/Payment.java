package com.seat_reservation_system.srv.entity;

import com.seat_reservation_system.srv.util.AppTime;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false, unique = true)
    private Reservation reservation;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 30)
    private String method;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false, length = 40, unique = true)
    private String transactionReference;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected Payment() {
    }

    public Payment(Reservation reservation, String username, BigDecimal amount, String method, String status, String transactionReference) {
        this.reservation = reservation;
        this.username = username;
        this.amount = amount;
        this.method = method;
        this.status = status;
        this.transactionReference = transactionReference;
        this.createdAt = AppTime.now();
    }

    public Long getId() { return id; }
    public Reservation getReservation() { return reservation; }
    public String getUsername() { return username; }
    public BigDecimal getAmount() { return amount; }
    public String getMethod() { return method; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getTransactionReference() { return transactionReference; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
