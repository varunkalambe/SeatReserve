package com.seat_reservation_system.srv.service;

import com.seat_reservation_system.srv.util.AppTime;

import com.seat_reservation_system.srv.dto.BatchPaymentRequest;
import com.seat_reservation_system.srv.dto.PaymentRequest;
import com.seat_reservation_system.srv.dto.PaymentResponse;
import com.seat_reservation_system.srv.dto.ReservationResponse;
import com.seat_reservation_system.srv.dto.TicketResponse;
import com.seat_reservation_system.srv.entity.Payment;
import com.seat_reservation_system.srv.entity.Reservation;
import com.seat_reservation_system.srv.entity.ReservationStatus;
import com.seat_reservation_system.srv.exception.ResourceNotFoundException;
import com.seat_reservation_system.srv.repository.PaymentRepository;
import com.seat_reservation_system.srv.repository.ReservationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final ReservationRepository reservationRepository;
    private final ReservationService reservationService;
    private final WalletService walletService;

    public PaymentService(
            PaymentRepository paymentRepository,
            ReservationRepository reservationRepository,
            ReservationService reservationService,
            WalletService walletService
    ) {
        this.paymentRepository = paymentRepository;
        this.reservationRepository = reservationRepository;
        this.reservationService = reservationService;
        this.walletService = walletService;
    }

    @Transactional
    public PaymentResponse pay(
            PaymentRequest request,
            String username
    ) {
        String method = normalizeMethod(request.method());

        Reservation reservation =
                reservationRepository
                        .findByIdForUpdate(request.reservationId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found: " +
                                                request.reservationId()
                                )
                        );

        verifyOwner(reservation, username);
        verifyReservationStructure(reservation);

        Payment existing =
                paymentRepository
                        .findByReservationId(reservation.getId())
                        .orElse(null);

        if (existing != null) {
            if (!"PAID".equals(existing.getStatus())) {
                throw new IllegalArgumentException(
                        "The reservation has an invalid payment state."
                );
            }

            if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
                throw new IllegalArgumentException(
                        "A paid reservation must be confirmed."
                );
            }

            return toResponse(existing, reservation);
        }

        if (reservation.getStatus() != ReservationStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Only pending reservations can be paid."
            );
        }

        ensurePaymentWindowOpen(reservation);

        BigDecimal amount = totalFare(reservation);

        if (method.equals("WALLET")) {
            walletService.debit(
                    username,
                    amount,
                    "SeatReserve booking payment"
            );
        }

        reservationService.confirmReservation(
                reservation.getId(),
                username
        );

        Reservation confirmed =
                reservationRepository
                        .findByIdWithSeatAndTrip(reservation.getId())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found after confirmation."
                                )
                        );

        Payment payment =
                new Payment(
                        confirmed,
                        username,
                        amount,
                        method,
                        "PAID",
                        transactionReference()
                );

        paymentRepository.save(payment);

        return toResponse(payment, confirmed);
    }

    @Transactional
    public List<PaymentResponse> payBatch(
            BatchPaymentRequest request,
            String username
    ) {
        List<Long> ids =
                request.reservationIds()
                        .stream()
                        .distinct()
                        .sorted()
                        .toList();

        if (ids.isEmpty()) {
            throw new IllegalArgumentException(
                    "Select at least one pending booking."
            );
        }

        if (ids.size() > 6) {
            throw new IllegalArgumentException(
                    "You can pay for at most 6 reservations at once."
            );
        }

        String method = normalizeMethod(request.method());

        List<Reservation> reservations = new ArrayList<>();
        List<Reservation> pendingReservations = new ArrayList<>();

        for (Long id : ids) {
            if (id == null) {
                throw new IllegalArgumentException(
                        "Reservation id cannot be null."
                );
            }

            Reservation reservation =
                    reservationRepository
                            .findByIdForUpdate(id)
                            .orElseThrow(() ->
                                    new ResourceNotFoundException(
                                            "Reservation not found: " + id
                                    )
                            );

            verifyOwner(reservation, username);
            verifyReservationStructure(reservation);

            Payment existing =
                    paymentRepository
                            .findByReservationId(id)
                            .orElse(null);

            if (reservation.getStatus() == ReservationStatus.CONFIRMED &&
                    existing != null &&
                    "PAID".equals(existing.getStatus())) {

                reservations.add(reservation);
                continue;
            }

            if (reservation.getStatus() != ReservationStatus.PENDING) {
                throw new IllegalArgumentException(
                        "One of the selected reservations is not pending."
                );
            }

            if (existing != null) {
                throw new IllegalArgumentException(
                        "One of the selected reservations already has a payment record."
                );
            }

            ensurePaymentWindowOpen(reservation);

            reservations.add(reservation);
            pendingReservations.add(reservation);
        }

        BigDecimal total =
                pendingReservations
                        .stream()
                        .map(this::totalFare)
                        .reduce(
                                BigDecimal.ZERO,
                                BigDecimal::add
                        );

        if (!pendingReservations.isEmpty() &&
                method.equals("WALLET")) {

            walletService.debit(
                    username,
                    total,
                    "SeatReserve booking payment (" +
                            pendingReservations.size() +
                            " seats)"
            );
        }

        for (Reservation reservation : pendingReservations) {
            reservationService.confirmReservation(
                    reservation.getId(),
                    username
            );

            Reservation confirmed =
                    reservationRepository
                            .findByIdWithSeatAndTrip(
                                    reservation.getId()
                            )
                            .orElseThrow(() ->
                                    new ResourceNotFoundException(
                                            "Reservation not found after confirmation."
                                    )
                            );

            Payment payment =
                    new Payment(
                            confirmed,
                            username,
                            totalFare(confirmed),
                            method,
                            "PAID",
                            transactionReference()
                    );

            paymentRepository.save(payment);
        }

        List<PaymentResponse> responses =
                new ArrayList<>();

        for (Reservation reservation : reservations) {
            Reservation current =
                    reservationRepository
                            .findByIdWithSeatAndTrip(
                                    reservation.getId()
                            )
                            .orElseThrow(() ->
                                    new ResourceNotFoundException(
                                            "Reservation not found after payment."
                                    )
                            );

            Payment payment =
                    paymentRepository
                            .findByReservationId(
                                    current.getId()
                            )
                            .orElseThrow(() ->
                                    new ResourceNotFoundException(
                                            "Payment record not found after payment."
                                    )
                            );

            responses.add(
                    toResponse(
                            payment,
                            current
                    )
            );
        }

        return responses;
    }

    /**
     * Cancels a CONFIRMED booking and refunds the money to the wallet - all in ONE database
     * transaction: if any step fails everything rolls back (seat stays booked, no money moves).
     * Every step logs with the [CANCEL] prefix so a failure can be located from the backend log.
     */
    @Transactional
    public ReservationResponse cancelBooking(
            Long reservationId,
            String username
    ) {
        String step = "1/6 load reservation (row lock)";

        try {
            log.info("[CANCEL] step {} reservation={} user={} now={}",
                    step, reservationId, username, AppTime.now());

            Reservation before =
                    reservationRepository
                            .findByIdForUpdate(reservationId)
                            .orElseThrow(() ->
                                    new ResourceNotFoundException(
                                            "Reservation not found: " +
                                                    reservationId
                                    )
                            );

            step = "2/6 validate owner and state";
            verifyOwner(before, username);
            verifyReservationStructure(before);

            log.info("[CANCEL] step {} reservation={} ref={} status={} departure={} fare={}",
                    step, before.getId(), before.getBookingReference(), before.getStatus(),
                    before.getTrip().getDepartureTime(), before.getFare());

            if (before.getStatus() != ReservationStatus.CONFIRMED) {
                throw new IllegalArgumentException(
                        "Only confirmed bookings can be cancelled. This booking is "
                                + before.getStatus().name().toLowerCase() + "."
                );
            }

            if (!before.getTrip().getDepartureTime()
                    .isAfter(AppTime.now())) {
                throw new IllegalArgumentException(
                        "This bus has already departed, so the booking can no longer be cancelled or refunded."
                );
            }

            step = "3/6 load payment";
            Payment payment =
                    paymentRepository
                            .findByReservationId(reservationId)
                            .orElse(null);

            if (payment == null) {
                // A confirmed booking without a payment row was never charged (legacy/demo data).
                // It can still be cancelled, but there is no money to give back.
                log.warn("[CANCEL] reservation={} has NO payment record - cancelling without a refund",
                        reservationId);
            } else {
                log.info("[CANCEL] step {} payment={} status={} amount={} method={}",
                        step, payment.getId(), payment.getStatus(), payment.getAmount(), payment.getMethod());

                if (!"PAID".equals(payment.getStatus())) {
                    throw new IllegalArgumentException(
                            "Only paid bookings can be cancelled. This payment is "
                                    + payment.getStatus().toLowerCase() + "."
                    );
                }
            }

            step = "4/6 cancel reservation and free the seat (Redis seat lock + DB)";
            ReservationResponse cancelled =
                    reservationService.cancelReservation(
                            reservationId,
                            username
                    );
            log.info("[CANCEL] step {} done -> reservation={} status={}",
                    step, cancelled.reservationId(), cancelled.status());

            if (payment != null) {
                step = "5/6 mark payment REFUNDED";
                payment.setStatus("REFUNDED");
                paymentRepository.save(payment);

                step = "6/6 credit wallet";
                walletService.credit(
                        username,
                        payment.getAmount(),
                        "Refund for booking " +
                                before.getBookingReference()
                );
                log.info("[CANCEL] step {} done -> refunded {} to wallet of {}",
                        step, payment.getAmount(), username);
            }

            log.info("[CANCEL] SUCCESS reservation={} ref={} refund={}",
                    reservationId, before.getBookingReference(),
                    payment == null ? "none" : payment.getAmount());

            return cancelled;
        } catch (RuntimeException exception) {
            // The GlobalExceptionHandler turns this into the HTTP error; this line says WHICH step failed.
            log.error("[CANCEL] FAILED at step '{}' reservation={} user={} -> {}: {}",
                    step, reservationId, username,
                    exception.getClass().getSimpleName(), exception.getMessage());
            throw exception;
        }
    }

    private String normalizeMethod(String method) {
        if (method == null) {
            throw new IllegalArgumentException(
                    "Payment method is required."
            );
        }

        String normalized =
                method.trim().toUpperCase(Locale.ROOT);

        if (!Set.of(
                "UPI",
                "CARD",
                "NET_BANKING",
                "WALLET"
        ).contains(normalized)) {
            throw new IllegalArgumentException(
                    "Unsupported payment method."
            );
        }

        return normalized;
    }

    private void ensurePaymentWindowOpen(
            Reservation reservation
    ) {
        if (reservation.getExpiresAt() == null ||
                !reservation.getExpiresAt()
                        .isAfter(AppTime.now())) {

            throw new IllegalArgumentException(
                    "Payment window has expired. Please select the seats again."
            );
        }
    }

    private void verifyOwner(
            Reservation reservation,
            String username
    ) {
        if (!reservation.getUserIdentifier().equals(username)) {
            throw new IllegalArgumentException(
                    "You do not own this reservation."
            );
        }
    }

    private void verifyReservationStructure(
            Reservation reservation
    ) {
        if (reservation.getTrip() == null ||
                reservation.getTripSeat() == null) {
            throw new IllegalArgumentException(
                    "Reservation is missing trip seat information."
            );
        }
    }

    private BigDecimal totalFare(
            Reservation reservation
    ) {
        BigDecimal base =
                reservation.getFare() == null
                        ? BigDecimal.ZERO
                        : reservation.getFare();

        BigDecimal fee =
                base.multiply(BigDecimal.valueOf(0.035))
                        .setScale(0, RoundingMode.HALF_UP);

        return base
                .add(fee)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private String transactionReference() {
        return "TXN" +
                UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        .substring(0, 12)
                        .toUpperCase(Locale.ROOT);
    }

    private PaymentResponse toResponse(
            Payment payment,
            Reservation reservation
    ) {
        return new PaymentResponse(
                payment.getId(),
                reservation.getId(),
                reservation.getBookingReference(),
                payment.getTransactionReference(),
                payment.getAmount(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getCreatedAt(),
                ReservationResponse.from(reservation)
        );
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPayment(
            Long reservationId,
            String username
    ) {
        Payment payment =
                paymentRepository
                        .findByReservationId(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Payment not found."
                                )
                        );

        Reservation reservation =
                reservationRepository
                        .findByIdWithSeatAndTrip(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found."
                                )
                        );

        verifyOwner(reservation, username);

        return toResponse(
                payment,
                reservation
        );
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicket(
            Long reservationId,
            String username
    ) {
        Payment payment =
                paymentRepository
                        .findByReservationId(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Ticket not found because the booking has not been paid."
                                )
                        );

        if (!"PAID".equals(payment.getStatus())) {
            throw new ResourceNotFoundException(
                    "Ticket is not available for this payment."
            );
        }

        Reservation reservation =
                reservationRepository
                        .findByIdWithSeatAndTrip(reservationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Reservation not found."
                                )
                        );

        verifyOwner(reservation, username);

        if (reservation.getStatus() != ReservationStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                    "A ticket is available only for a confirmed booking."
            );
        }

        verifyReservationStructure(reservation);

        return new TicketResponse(
                reservation.getBookingReference(),
                reservation.getTrip().getOperatorName(),
                reservation.getTrip().getBusName(),
                reservation.getTrip().getBusType(),
                reservation.getTrip().getFromCity(),
                reservation.getTrip().getToCity(),
                reservation.getTrip().getDepartureTime(),
                reservation.getTrip().getArrivalTime(),
                reservation.getSeat().getSeatNumber(),
                reservation.getPassengerName(),
                payment.getAmount(),
                payment.getMethod(),
                payment.getTransactionReference()
        );
    }
}
