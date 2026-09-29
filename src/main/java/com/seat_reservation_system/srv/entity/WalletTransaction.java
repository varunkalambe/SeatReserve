package com.seat_reservation_system.srv.entity;

import com.seat_reservation_system.srv.util.AppTime;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallet_transactions")
public class WalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String username;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    private String type;

    @Column(nullable = false, length = 180)
    private String description;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected WalletTransaction() {
    }

    public WalletTransaction(String username, BigDecimal amount, String type, String description) {
        this.username = username;
        this.amount = amount;
        this.type = type;
        this.description = description;
        this.createdAt = AppTime.now();
    }

    public Long getId() { return id; }
    public String getUsername() { return username; }
    public BigDecimal getAmount() { return amount; }
    public String getType() { return type; }
    public String getDescription() { return description; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
