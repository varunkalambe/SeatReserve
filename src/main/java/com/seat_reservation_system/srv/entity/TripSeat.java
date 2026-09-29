package com.seat_reservation_system.srv.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "trip_seats", uniqueConstraints = {
        @UniqueConstraint(name = "uk_trip_seat", columnNames = {"trip_id", "seat_id"})
})
public class TripSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "trip_id", nullable = false, foreignKey = @ForeignKey(name = "fk_trip_seat_trip"))
    private BusTrip trip;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false, foreignKey = @ForeignKey(name = "fk_trip_seat_seat"))
    private Seat seat;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SeatStatus status;

    @Version
    @Column(nullable = false)
    private Long version;

    protected TripSeat() {
    }

    public TripSeat(BusTrip trip, Seat seat) {
        this.trip = trip;
        this.seat = seat;
        this.status = SeatStatus.AVAILABLE;
    }

    public Long getId() { return id; }
    public BusTrip getTrip() { return trip; }
    public Seat getSeat() { return seat; }
    public SeatStatus getStatus() { return status; }
    public void setStatus(SeatStatus status) { this.status = status; }
    public Long getVersion() { return version; }
}
