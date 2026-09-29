package com.seat_reservation_system.srv.config;

import com.seat_reservation_system.srv.entity.BusTrip;
import com.seat_reservation_system.srv.entity.Seat;
import com.seat_reservation_system.srv.entity.TripSeat;
import com.seat_reservation_system.srv.repository.BusTripRepository;
import com.seat_reservation_system.srv.repository.SeatRepository;
import com.seat_reservation_system.srv.repository.TripSeatRepository;
import com.seat_reservation_system.srv.util.AppTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

@Component
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final int DAYS_AHEAD = 7;

    private final SeatRepository seatRepository;
    private final BusTripRepository busTripRepository;
    private final TripSeatRepository tripSeatRepository;

    public DataSeeder(
            SeatRepository seatRepository,
            BusTripRepository busTripRepository,
            TripSeatRepository tripSeatRepository
    ) {
        this.seatRepository = seatRepository;
        this.busTripRepository = busTripRepository;
        this.tripSeatRepository = tripSeatRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initialSeed() {
        CompletableFuture.runAsync(() -> {
            try {
                log.info("Starting background bus catalogue seed");
                seed();
                log.info("Background bus catalogue seed completed");
            } catch (RuntimeException exception) {
                log.error("Initial bus catalogue seeding failed", exception);
            }
        });
    }

    @Scheduled(cron = "0 5 0 * * *", zone = "${app.timezone:Asia/Kolkata}")
    public void scheduledTopUp() {
        try {
            seed();
        } catch (RuntimeException exception) {
            log.error("Scheduled trip seeding failed", exception);
        }
    }

    private synchronized void seed() {
        List<Seat> seats;

        if (seatRepository.count() == 0) {
            seats = new ArrayList<>();

            for (char row = 'A'; row <= 'E'; row++) {
                for (int number = 1; number <= 10; number++) {
                    seats.add(new Seat(row + String.valueOf(number)));
                }
            }

            seatRepository.saveAll(seats);
        } else {
            seats = seatRepository.findAll();
        }

        LocalDate start = AppTime.today();

        List<RouteSeed> routes = List.of(
                new RouteSeed("Shivneri Travels", "AC Sleeper", "Pune", "Mumbai", 360, "06:00", 600, 4.5),
                new RouteSeed("Neeta Travels", "AC Seater", "Pune", "Mumbai", 180, "07:30", 550, 4.3),
                new RouteSeed("MSRTC", "Non AC Seater", "Pune", "Mumbai", 195, "09:00", 400, 4.1),
                new RouteSeed("Orange Travels", "AC Sleeper", "Pune", "Mumbai", 165, "10:00", 700, 4.4),
                new RouteSeed("Shivneri Travels", "AC Seater", "Mumbai", "Nashik", 195, "07:15", 400, 4.2),
                new RouteSeed("Neeta Travels", "AC Sleeper", "Mumbai", "Goa", 510, "20:00", 1200, 4.6),
                new RouteSeed("Orange Travels", "AC Sleeper", "Pune", "Bangalore", 765, "19:00", 1500, 4.5),
                new RouteSeed("Rajdhani Roadways", "AC Seater", "Delhi", "Jaipur", 300, "08:00", 800, 4.4),
                new RouteSeed("VRL Travels", "AC Sleeper", "Hyderabad", "Bangalore", 570, "21:00", 1100, 4.5),
                new RouteSeed("GSRTC Express", "AC Seater", "Ahmedabad", "Surat", 180, "07:45", 450, 4.3),
                new RouteSeed("Neeta Travels", "AC Seater", "Mumbai", "Ahmedabad", 540, "18:30", 950, 4.4),
                new RouteSeed("SRS Travels", "AC Seater", "Chennai", "Pondicherry", 195, "09:15", 500, 4.2)
        );

        List<BusTrip> existingTrips = busTripRepository.findAll();

        Set<String> existingKeys = new HashSet<>();

        for (BusTrip trip : existingTrips) {
            existingKeys.add(
                    tripKey(
                            trip.getOperatorName(),
                            trip.getFromCity(),
                            trip.getToCity(),
                            trip.getDepartureTime()
                    )
            );
        }

        List<BusTrip> missingTrips = new ArrayList<>();

        for (int day = 0; day < DAYS_AHEAD; day++) {
            LocalDate date = start.plusDays(day);

            for (RouteSeed route : routes) {
                LocalDateTime departure =
                        LocalDateTime.of(date, LocalTime.parse(route.time));

                if (existingKeys.add(
                        tripKey(
                                route.operator,
                                route.from,
                                route.to,
                                departure
                        )
                )) {
                    missingTrips.add(
                            new BusTrip(
                                    route.operator,
                                    route.operator + " Express",
                                    route.type,
                                    route.from,
                                    route.to,
                                    departure,
                                    departure.plusMinutes(route.duration),
                                    route.duration,
                                    BigDecimal.valueOf(route.price),
                                    BigDecimal.valueOf(route.rating),
                                    "WiFi, Charging, Live Tracking"
                            )
                    );
                }
            }
        }

        if (!missingTrips.isEmpty()) {
            existingTrips.addAll(busTripRepository.saveAll(missingTrips));
        }

        LocalDateTime cutoff = AppTime.now().minusDays(1);

        for (BusTrip trip : existingTrips) {
            if (trip.getDepartureTime().isBefore(cutoff)) {
                continue;
            }

            long configuredSeats =
                    tripSeatRepository.countByTripId(trip.getId());

            if (configuredSeats == seats.size()) {
                continue;
            }

            List<TripSeat> tripSeats = new ArrayList<>();

            if (configuredSeats == 0) {
                for (Seat seat : seats) {
                    tripSeats.add(new TripSeat(trip, seat));
                }
            } else {
                for (Seat seat : seats) {
                    if (tripSeatRepository
                            .findByTripIdAndSeatIdWithTripAndSeat(
                                    trip.getId(),
                                    seat.getId()
                            )
                            .isEmpty()) {
                        tripSeats.add(new TripSeat(trip, seat));
                    }
                }
            }

            if (!tripSeats.isEmpty()) {
                tripSeatRepository.saveAll(tripSeats);
            }
        }

        if (!missingTrips.isEmpty()) {
            log.info("Seeded {} new bus trips", missingTrips.size());
        }
    }

    private static String tripKey(
            String operator,
            String from,
            String to,
            LocalDateTime departure
    ) {
        return operator.toLowerCase(Locale.ROOT)
                + "|"
                + from.toLowerCase(Locale.ROOT)
                + "|"
                + to.toLowerCase(Locale.ROOT)
                + "|"
                + departure;
    }

    private record RouteSeed(
            String operator,
            String type,
            String from,
            String to,
            int duration,
            String time,
            int price,
            double rating
    ) {
    }
}