package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.TripSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TripSeatRepository extends JpaRepository<TripSeat, Long> {

    @Query("""
            select ts from TripSeat ts
            join fetch ts.seat
            where ts.trip.id = :tripId
            order by ts.seat.id asc
            """)
    List<TripSeat> findByTripIdWithSeatOrderBySeatId(@Param("tripId") Long tripId);

    @Query("""
            select ts from TripSeat ts
            join fetch ts.trip
            join fetch ts.seat
            where ts.trip.id = :tripId and ts.seat.id = :seatId
            """)
    Optional<TripSeat> findByTripIdAndSeatIdWithTripAndSeat(@Param("tripId") Long tripId, @Param("seatId") Long seatId);

    long countByTripId(Long tripId);

    /**
     * Creates any missing seat rows for a trip in ONE statement. ON CONFLICT DO NOTHING makes it safe
     * to run while the background DataSeeder (or another request) is creating the same rows.
     */
    @Modifying
    @Query(value = """
            insert into trip_seats (trip_id, seat_id, status, version)
            select cast(:tripId as bigint), s.id, 'AVAILABLE', 0
            from seats s
            on conflict (trip_id, seat_id) do nothing
            """, nativeQuery = true)
    int insertMissingSeats(@Param("tripId") Long tripId);
}
