package com.seat_reservation_system.srv.entity;

import com.seat_reservation_system.srv.util.AppTime;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "reservations")
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false, foreignKey = @ForeignKey(name = "fk_reservation_seat"))
    private Seat seat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", foreignKey = @ForeignKey(name = "fk_reservation_trip"))
    private BusTrip trip;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_seat_id", foreignKey = @ForeignKey(name = "fk_reservation_trip_seat"))
    private TripSeat tripSeat;

    @Column(name = "user_identifier", nullable = false, length = 100)
    private String userIdentifier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReservationStatus status;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(precision = 12, scale = 2)
    private BigDecimal fare;

    @Column(length = 120)
    private String passengerName;

    @Column(length = 30)
    private String contactPhone;

    @Column(length = 40, unique = true)
    private String bookingReference;

    @Column(nullable = true)
    private LocalDateTime createdAt = AppTime.now();

    protected Reservation() {
    }

    public Reservation(Seat seat, BusTrip trip, TripSeat tripSeat, String userIdentifier, ReservationStatus status, LocalDateTime expiresAt, BigDecimal fare, String passengerName, String contactPhone) {
        this.seat = seat;
        this.trip = trip;
        this.tripSeat = tripSeat;
        this.userIdentifier = userIdentifier;
        this.status = status;
        this.expiresAt = expiresAt;
        this.fare = fare;
        this.passengerName = passengerName;
        this.contactPhone = contactPhone;
    }

    public Reservation(Seat seat, String userIdentifier, ReservationStatus status, LocalDateTime expiresAt) {
        this(seat, null, null, userIdentifier, status, expiresAt, BigDecimal.ZERO, null, null);
    }

    public Long getId() { return id; }
    public Seat getSeat() { return seat; }
    public BusTrip getTrip() { return trip; }
    public TripSeat getTripSeat() { return tripSeat; }
    public String getUserIdentifier() { return userIdentifier; }
    public void setUserIdentifier(String userIdentifier) { this.userIdentifier = userIdentifier; }
    public ReservationStatus getStatus() { return status; }
    public void setStatus(ReservationStatus status) { this.status = status; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
    public BigDecimal getFare() { return fare; }
    public void setFare(BigDecimal fare) { this.fare = fare; }
    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getBookingReference() { return bookingReference; }
    public void setBookingReference(String bookingReference) { this.bookingReference = bookingReference; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
