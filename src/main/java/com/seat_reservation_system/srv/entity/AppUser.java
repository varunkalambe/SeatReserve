package com.seat_reservation_system.srv.entity;

import com.seat_reservation_system.srv.util.AppTime;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(name = "uk_users_username", columnNames = "username")
})
public class AppUser implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 100)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(length = 100)
    private String fullName;

    @Column(length = 150, unique = true)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal walletBalance = BigDecimal.ZERO;

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(nullable = true)
    private LocalDateTime createdAt = AppTime.now();

    @Column(nullable = true)
    private LocalDateTime updatedAt = AppTime.now();

    protected AppUser() {
    }

    public AppUser(String username, String password, Role role) {
        this.username = username;
        this.password = password;
        this.role = role;
    }

    public Long getId() { return id; }
    @Override public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    @Override public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; touch(); }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; touch(); }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; touch(); }
    public BigDecimal getWalletBalance() { return walletBalance == null ? BigDecimal.ZERO : walletBalance; }
    public void setWalletBalance(BigDecimal walletBalance) { this.walletBalance = walletBalance; touch(); }
    public LocalDateTime getCreatedAt() { return createdAt == null ? AppTime.now() : createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    private void touch() { updatedAt = AppTime.now(); }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
