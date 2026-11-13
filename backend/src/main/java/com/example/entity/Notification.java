package com.example.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Something a person should know about: their leave was approved, salary was paid, and so on.
 * Shown under the bell in the staff portal; most are also emailed.
 *
 * <p>{@code eventKey} names the event (for example {@code LEAVE:12:PENDING>APPROVED}). The database
 * allows one row per person and event key, so the same event can never be notified or emailed twice.
 */
@Data
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(nullable = false)
    private String type;

    @Column(name = "event_key", nullable = false)
    private String eventKey;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    /** Page in the portal to open, for example /employee/leaves. */
    private String link;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    /** NONE (in-app only), PENDING, SENT, FAILED or SKIPPED (email not set up). */
    @Column(name = "email_status")
    private String emailStatus;
}
