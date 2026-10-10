package com.healthassist.transition.api;

import com.healthassist.transition.engine.InvalidTransitionInputException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.logging.Logger;

/**
 * Error responses for /api/transition. PRIVACY: Spring's default messages
 * echo rejected values and JSON snippets, so these handlers return and log
 * field names and exception types only.
 */
@RestControllerAdvice(assignableTypes = TransitionController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TransitionExceptionHandler {

    private static final Logger logger = Logger.getLogger(TransitionExceptionHandler.class.getName());

    public record ErrorBody(String error, String message, List<String> fields) {
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> invalid(MethodArgumentNotValidException e) {
        List<String> fields = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField()).distinct().sorted().toList();
        return body(HttpStatus.BAD_REQUEST, new ErrorBody("invalid_input", "Some answers need a fix.", fields));
    }

    @ExceptionHandler(InvalidTransitionInputException.class)
    public ResponseEntity<ErrorBody> invalid(InvalidTransitionInputException e) {
        return body(HttpStatus.BAD_REQUEST, new ErrorBody("invalid_input", e.getMessage(), e.fields()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorBody> unreadable(HttpMessageNotReadableException e) {
        return body(HttpStatus.BAD_REQUEST, new ErrorBody("unreadable_request", "The request couldn't be read.", List.of()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> unexpected(Exception e) {
        logger.severe("Coverage-transition request failed: " + e.getClass().getName()
                + (e.getStackTrace().length > 0 ? " at " + e.getStackTrace()[0] : ""));
        return body(HttpStatus.INTERNAL_SERVER_ERROR,
                new ErrorBody("internal_error", "Something went wrong. Please try again.", List.of()));
    }

    private static ResponseEntity<ErrorBody> body(HttpStatus status, ErrorBody b) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(b);
    }

}
