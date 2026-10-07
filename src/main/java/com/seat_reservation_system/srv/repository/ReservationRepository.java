package com.seat_reservation_system.srv.repository;

import com.seat_reservation_system.srv.entity.Reservation;
import com.seat_reservation_system.srv.entity.ReservationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository
        extends JpaRepository<Reservation, Long> {

    @Query("""
            select r from Reservation r
            join fetch r.seat
            left join fetch r.trip
            left join fetch r.tripSeat
            where r.id = :id
            """)
    Optional<Reservation> findByIdWithSeatAndTrip(
            @Param("id") Long id
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reservation r where r.id = :id")
    Optional<Reservation> findByIdForUpdate(
            @Param("id") Long id
    );

    @Query("""
            select r from Reservation r
            join fetch r.seat
            left join fetch r.trip
            left join fetch r.tripSeat
            where r.userIdentifier = :username
            order by r.id desc
            """)
    List<Reservation> findByUserIdentifierOrderByIdDesc(
            @Param("username") String username
    );

    @Query("""
            select distinct r from Reservation r
            join fetch r.seat
            left join fetch r.trip
            left join fetch r.tripSeat
            where r.status = :status
            and r.expiresAt < :time
            """)
    List<Reservation> findExpiredPendingWithSeat(
            @Param("status") ReservationStatus status,
            @Param("time") LocalDateTime time
    );

    @Query("""
            select r.tripSeat.id from Reservation r
            where r.trip.id = :tripId
              and r.tripSeat is not null
              and r.status = com.seat_reservation_system.srv.entity.ReservationStatus.CONFIRMED
            """)
    List<Long> findConfirmedTripSeatIds(@Param("tripId") Long tripId);

    @Query("""
            select r.tripSeat.id from Reservation r
            where r.trip.id = :tripId
              and r.tripSeat is not null
              and r.status = com.seat_reservation_system.srv.entity.ReservationStatus.PENDING
              and r.expiresAt > :now
            """)
    List<Long> findPendingTripSeatIds(@Param("tripId") Long tripId, @Param("now") LocalDateTime now);

    @Query("""
            select count(r) > 0 from Reservation r
            where r.tripSeat.id = :tripSeatId
              and (r.status = com.seat_reservation_system.srv.entity.ReservationStatus.CONFIRMED
                   or (r.status = com.seat_reservation_system.srv.entity.ReservationStatus.PENDING
                       and r.expiresAt > :now))
            """)
    boolean existsLiveForTripSeat(@Param("tripSeatId") Long tripSeatId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("""
            update Reservation r
            set r.status = com.seat_reservation_system.srv.entity.ReservationStatus.EXPIRED
            where r.tripSeat.id = :tripSeatId
              and r.status = com.seat_reservation_system.srv.entity.ReservationStatus.PENDING
              and r.expiresAt <= :now
            """)
    int expireStalePending(@Param("tripSeatId") Long tripSeatId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("update Reservation r set r.userIdentifier = :newName where r.userIdentifier = :oldName")
    int renameUser(@Param("oldName") String oldName, @Param("newName") String newName);
}
