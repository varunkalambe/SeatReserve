package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.TripSeat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
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

    /** Row-level DB lock: correct even when Redis is down or the Redis lock was released early. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ts from TripSeat ts where ts.trip.id = :tripId and ts.seat.id = :seatId")
    Optional<TripSeat> findByTripIdAndSeatIdForUpdate(@Param("tripId") Long tripId, @Param("seatId") Long seatId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ts from TripSeat ts where ts.id = :id")
    Optional<TripSeat> findByIdForUpdate(@Param("id") Long id);

    long countByTripId(Long tripId);

    @Modifying
    @Query(value = """
            insert into trip_seats (trip_id, seat_id, status, version)
            select cast(:tripId as bigint), s.id, 'AVAILABLE', 0
            from seats s
            on conflict (trip_id, seat_id) do nothing
            """, nativeQuery = true)
    int insertMissingSeats(@Param("tripId") Long tripId);

    /** Reservations are the source of truth: a seat with a CONFIRMED booking must be BOOKED. */
    @Modifying
    @Query(value = """
            update trip_seats ts set status = 'BOOKED', version = version + 1
            where ts.status <> 'BOOKED'
              and exists (select 1 from reservations r
                          where r.trip_seat_id = ts.id and r.status = 'CONFIRMED')
            """, nativeQuery = true)
    int promoteBooked();

    @Modifying
    @Query(value = """
            update trip_seats ts set status = 'HELD', version = version + 1
            where ts.status = 'AVAILABLE'
              and exists (select 1 from reservations r
                          where r.trip_seat_id = ts.id and r.status = 'PENDING' and r.expires_at > :now)
            """, nativeQuery = true)
    int promoteHeld(@Param("now") LocalDateTime now);

    @Modifying
    @Query(value = """
            update trip_seats ts set status = 'AVAILABLE', version = version + 1
            where ts.status = 'HELD'
              and not exists (select 1 from reservations r
                              where r.trip_seat_id = ts.id
                                and (r.status = 'CONFIRMED' or (r.status = 'PENDING' and r.expires_at > :now)))
            """, nativeQuery = true)
    int demoteStaleHeld(@Param("now") LocalDateTime now);
}
