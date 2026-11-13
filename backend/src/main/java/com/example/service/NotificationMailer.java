package com.example.service;

import com.example.repository.EmployeeRepository;
import com.example.repository.NotificationRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Sends the email for a notification once the action behind it has been saved for good
 * (AFTER_COMMIT), on a background thread, and records whether it went.
 */
@Component
public class NotificationMailer {

    private final ZeptoMailService mail;
    private final EmployeeRepository employees;
    private final NotificationRepository notifications;

    public NotificationMailer(ZeptoMailService mail, EmployeeRepository employees, NotificationRepository notifications) {
        this.mail = mail;
        this.employees = employees;
        this.notifications = notifications;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void send(NotificationService.Created event) {
        String status;
        try {
            if (!mail.isConfigured()) {
                status = "SKIPPED";
            } else {
                status = employees.findById(event.employeeId())
                        .filter(emp -> emp.getEmail() != null && !emp.getEmail().isBlank())
                        .map(emp -> {
                            NotificationService.Email e = event.email();
                            boolean sent = mail.sendNoticeEmail(emp.getEmail(), emp.getFullName(), e.subject(), e.heading(),
                                    e.intro(), e.rows(), e.buttonLabel(), event.link());
                            return sent ? "SENT" : "FAILED";
                        })
                        .orElse("SKIPPED");
            }
        } catch (RuntimeException ex) {
            System.err.println("Notification email failed for " + event.eventKey() + ": " + ex.getMessage());
            status = "FAILED";
        }
        try {
            notifications.setEmailStatus(event.employeeId(), event.eventKey(), status);
        } catch (RuntimeException ignored) {
            // the person may have been deleted in the meantime
        }
    }
}
