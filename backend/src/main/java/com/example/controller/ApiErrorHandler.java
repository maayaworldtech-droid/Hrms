package com.example.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Sends the reason written in a ResponseStatusException (for example "You can only run payroll
 * for your own center") back as {"message": ...} so the screen can show it. Spring hides these
 * by default. A database rule being hit (for example a second check-in row for the same day from
 * a double tap) becomes a plain 409. Other, unexpected errors are left to Spring and stay hidden.
 */
@RestControllerAdvice
public class ApiErrorHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseStatusException ex) {
        HttpStatusCode status = ex.getStatusCode();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("message", ex.getReason() != null ? ex.getReason() : "");
        return ResponseEntity.status(status).headers(ex.getHeaders()).body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(DataIntegrityViolationException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.CONFLICT.value());
        body.put("message", "This was already saved or is still linked to other records. Refresh the page and try again.");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }
}
