package com.seat_reservation_system.srv.exception;

import com.seat_reservation_system.srv.dto.ApiErrorResponse;
import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.stream.Collectors;

/**
 * Maps exceptions to JSON errors. Every handled error is logged WITH the request that caused it and
 * the reason, so a 400/404/409 in the browser can always be matched to a backend log line.
 * Unknown URLs and wrong HTTP methods now return 404/405 instead of a misleading 500.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(LockAcquisitionException.class)
    public ResponseEntity<ApiErrorResponse> handleLockAcquisition(LockAcquisitionException e, HttpServletRequest request) {
        log.warn("[409] seat lock busy on {}: {}", where(request), e.getMessage());
        return build(e.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(SeatUnavailableException.class)
    public ResponseEntity<ApiErrorResponse> handleSeatUnavailable(SeatUnavailableException e, HttpServletRequest request) {
        log.warn("[409] seat unavailable on {}: {}", where(request), e.getMessage());
        return build(e.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException e, HttpServletRequest request) {
        log.warn("[404] {}: {}", where(request), e.getMessage());
        return build(e.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<ApiErrorResponse> handleUsernameAlreadyExists(UsernameAlreadyExistsException e, HttpServletRequest request) {
        log.warn("[409] {}: {}", where(request), e.getMessage());
        return build(e.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidCredentials(InvalidCredentialsException e, HttpServletRequest request) {
        log.warn("[401] {}: {}", where(request), e.getMessage());
        return build(e.getMessage(), HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException e, HttpServletRequest request) {
        log.warn("[400] {}: {}", where(request), e.getMessage());
        return build(e.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class})
    public ResponseEntity<ApiErrorResponse> handleOptimisticLocking(Exception e, HttpServletRequest request) {
        log.warn("[409] optimistic locking conflict on {}", where(request), e);
        return build("The seat was changed by another request. Please try again.", HttpStatus.CONFLICT);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException e, HttpServletRequest request) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));
        log.warn("[400] validation failed on {}: {}", where(request), message);
        return build(message, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException e, HttpServletRequest request) {
        log.warn("[400] bad parameter '{}' on {}: {}", e.getName(), where(request), e.getMessage());
        return build("Request parameter '" + e.getName() + "' is invalid.", HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParameter(MissingServletRequestParameterException e, HttpServletRequest request) {
        log.warn("[400] missing parameter '{}' on {}", e.getParameterName(), where(request));
        return build("Request parameter '" + e.getParameterName() + "' is required.", HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleMalformedJson(HttpMessageNotReadableException e, HttpServletRequest request) {
        log.warn("[400] unreadable body on {}: {}", where(request), e.getMessage());
        return build("Request body is invalid.", HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException e, HttpServletRequest request) {
        log.warn("[404] no endpoint for {} (is the backend an old build?)", where(request));
        return build("Endpoint not found: " + request.getRequestURI(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException e, HttpServletRequest request) {
        log.warn("[405] {} does not support {}", request.getRequestURI(), e.getMethod());
        return build("Method " + e.getMethod() + " is not supported for " + request.getRequestURI(), HttpStatus.METHOD_NOT_ALLOWED);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMediaType(HttpMediaTypeNotSupportedException e, HttpServletRequest request) {
        log.warn("[415] unsupported content type on {}: {}", where(request), e.getMessage());
        return build("Unsupported content type.", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException e, HttpServletRequest request) {
        Throwable root = e.getMostSpecificCause();
        log.error("[409] database constraint violation on {} -> ROOT CAUSE: {}",
                where(request), root == null ? e.getMessage() : root.getMessage(), e);
        log.error("[409] hint: a message like 'violates check constraint' means the DB schema is older than the code "
                + "(see the [SCHEMA] lines printed at start-up by SchemaRepair)");
        return build("The database rejected this change. Please try again; if it keeps failing check the backend log ([409] ROOT CAUSE).", HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception e, HttpServletRequest request) {
        log.error("[500] unexpected error on {}", where(request), e);
        return build("An unexpected server error occurred.", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private static String where(HttpServletRequest request) {
        return request.getMethod() + " " + request.getRequestURI();
    }

    private ResponseEntity<ApiErrorResponse> build(String message, HttpStatus status) {
        return ResponseEntity.status(status).body(
                new ApiErrorResponse(
                        message == null ? status.getReasonPhrase() : message,
                        status.value(),
                        Instant.now()
                )
        );
    }
}
