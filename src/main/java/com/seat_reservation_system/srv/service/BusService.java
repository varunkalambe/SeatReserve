package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.util.AppTime;

import com.seat_reservation_system.srv.dto.BusTripResponse;
import com.seat_reservation_system.srv.entity.BusTrip;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.repository.BusTripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class BusService {

    private final BusTripRepository busTripRepository;

    public BusService(BusTripRepository busTripRepository) {
        this.busTripRepository = busTripRepository;
    }

    @Transactional(readOnly = true)
    public List<BusTripResponse> search(String from, String to, LocalDate date) {
        String normalizedFrom =
                from == null ? "" : from.trim().toLowerCase(Locale.ROOT);

        String normalizedTo =
                to == null ? "" : to.trim().toLowerCase(Locale.ROOT);

        LocalDate targetDate =
                date == null ? AppTime.today().plusDays(1) : date;

        LocalDate today = AppTime.today();

        if (targetDate.isBefore(today)) {
            throw new IllegalArgumentException("Search date cannot be in the past.");
        }

        LocalDateTime now = AppTime.now();

        LocalDateTime windowStart = targetDate.atStartOfDay();
        if (windowStart.isBefore(now)) {
            windowStart = now;
        }

        return busTripRepository
                .findByDepartureTimeGreaterThanEqualAndDepartureTimeLessThanOrderByDepartureTimeAsc(
                        windowStart,
                        targetDate.plusDays(1).atStartOfDay()
                )
                .stream()
                .filter(t ->
                        normalizedFrom.isBlank() ||
                                t.getFromCity()
                                        .toLowerCase(Locale.ROOT)
                                        .contains(normalizedFrom)
                )
                .filter(t ->
                        normalizedTo.isBlank() ||
                                t.getToCity()
                                        .toLowerCase(Locale.ROOT)
                                        .contains(normalizedTo)
                )
                .filter(t -> t.getDepartureTime().isAfter(now))
                .filter(t -> t.getDepartureTime()
                        .toLocalDate()
                        .equals(targetDate))
                .map(BusTripResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BusTripResponse> popular() {
        LocalDateTime now = AppTime.now();

        LocalDateTime dayStart = AppTime.today().plusDays(1).atStartOfDay();

        List<BusTrip> tomorrow =
                busTripRepository
                        .findByDepartureTimeGreaterThanEqualAndDepartureTimeLessThanOrderByDepartureTimeAsc(
                                dayStart.isBefore(now) ? now : dayStart,
                                dayStart.plusDays(1)
                        )
                        .stream()
                        .filter(t -> t.getDepartureTime().isAfter(now))
                        .filter(t ->
                                t.getDepartureTime()
                                        .toLocalDate()
                                        .equals(AppTime.today().plusDays(1))
                        )
                        .toList();

        List<BusTrip> diverse = new ArrayList<>();
        Set<String> routes = new LinkedHashSet<>();

        for (BusTrip trip : tomorrow) {
            String route =
                    trip.getFromCity().toLowerCase(Locale.ROOT)
                            + "->"
                            + trip.getToCity().toLowerCase(Locale.ROOT);

            if (routes.add(route)) {
                diverse.add(trip);

                if (diverse.size() == 12) {
                    return diverse.stream()
                            .map(BusTripResponse::from)
                            .toList();
                }
            }
        }

        tomorrow.stream()
                .filter(trip -> !diverse.contains(trip))
                .limit(Math.max(0, 12 - diverse.size()))
                .forEach(diverse::add);

        return diverse.stream()
                .map(BusTripResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public BusTrip findTrip(Long tripId) {
        if (tripId == null) {
            throw new IllegalArgumentException("tripId is required.");
        }

        BusTrip trip =
                busTripRepository.findById(tripId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Bus trip not found: " + tripId
                                )
                        );

        if (!trip.getDepartureTime().isAfter(AppTime.now())) {
            throw new ResourceNotFoundException(
                    "This bus trip is no longer available for booking."
            );
        }

        return trip;
    }
}


