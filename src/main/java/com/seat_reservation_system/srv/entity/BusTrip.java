package com.seat_reservation_system.srv.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bus_trips")
public class BusTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String operatorName;

    @Column(nullable = false, length = 120)
    private String busName;

    @Column(nullable = false, length = 40)
    private String busType;

    @Column(nullable = false, length = 80)
    private String fromCity;

    @Column(nullable = false, length = 80)
    private String toCity;

    @Column(nullable = false)
    private LocalDateTime departureTime;

    @Column(nullable = false)
    private LocalDateTime arrivalTime;

    @Column(nullable = false)
    private Integer durationMinutes;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal rating;

    @Column(nullable = false, length = 500)
    private String amenities;

    protected BusTrip() {
    }

    public BusTrip(String operatorName, String busName, String busType, String fromCity, String toCity, LocalDateTime departureTime, LocalDateTime arrivalTime, Integer durationMinutes, BigDecimal price, BigDecimal rating, String amenities) {
        this.operatorName = operatorName;
        this.busName = busName;
        this.busType = busType;
        this.fromCity = fromCity;
        this.toCity = toCity;
        this.departureTime = departureTime;
        this.arrivalTime = arrivalTime;
        this.durationMinutes = durationMinutes;
        this.price = price;
        this.rating = rating;
        this.amenities = amenities;
    }

    public Long getId() { return id; }
    public String getOperatorName() { return operatorName; }
    public String getBusName() { return busName; }
    public String getBusType() { return busType; }
    public String getFromCity() { return fromCity; }
    public String getToCity() { return toCity; }
    public LocalDateTime getDepartureTime() { return departureTime; }
    public LocalDateTime getArrivalTime() { return arrivalTime; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getRating() { return rating; }
    public String getAmenities() { return amenities; }
}
