package com.example.service;

import com.example.entity.Notification;
import com.example.repository.NotificationRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * One place that tells a person something happened: it adds the notification under the bell and,
 * when there is an email for it, sends the email once the action has been saved.
 *
 * <p>Rules:
 * <ul>
 *   <li>Each event has a key; a person gets each key once, so double clicks and retries never send
 *       a second email.</li>
 *   <li>The email goes out only after the change is saved for good. If the action fails and is
 *       undone, the notification is undone with it and no email is sent.</li>
 *   <li>Sending runs in the background, so a slow mail service never slows the screen down.</li>
 * </ul>
 */
@Service
public class NotificationService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    /** What goes in the email. Rows are label and value pairs shown as a small table. */
    public record Email(String subject, String heading, String intro, List<String[]> rows, String buttonLabel) {}

    /** Published after a notification is added; the mailer sends it after the save is final. */
    public record Created(Long employeeId, String eventKey, String link, Email email) {}

    private final NotificationRepository repository;
    private final ApplicationEventPublisher events;

    public NotificationService(NotificationRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    /**
     * Notifies one person. Does nothing when there is no person or when this event was already
     * notified. Pass {@code email = null} for an in-app note only.
     */
    @Transactional
    public void notify(Long employeeId, String type, String eventKey, String title, String message, String link, Email email) {
        if (employeeId == null || eventKey == null || eventKey.isBlank()) return;
        try {
            int added = repository.insertIfNew(employeeId, type, cap(eventKey), cap(title), message, link,
                    LocalDateTime.now(BUSINESS_ZONE).withNano(0), email != null ? "PENDING" : "NONE");
            if (added == 0) return; // already told them about this
            if (email != null) {
                events.publishEvent(new Created(employeeId, cap(eventKey), link, email));
            }
        } catch (RuntimeException e) {
            // A notification must never stop the real action (approving leave, paying salary...)
            System.err.println("Could not add notification " + eventKey + " for employee " + employeeId + ": " + e.getMessage());
        }
    }

    /**
     * Key for a decision on one request, for example {@code LEAVE:12} plus {@code PENDING>APPROVED}.
     * The round number counts earlier decisions on the same request, so a request that is decided,
     * sent again and decided the same way again is still notified. Callers only notify when the
     * status really changed, so a second click on the same decision never gets here; two requests
     * arriving at the same moment work out the same round and key, and the database keeps one.
     */
    public String decisionKey(Long employeeId, String request, String transition) {
        long round = employeeId == null ? 0 : repository.countByEmployeeIdAndEventKeyStartingWith(employeeId, request + ":");
        return request + ":" + round + ":" + transition;
    }

    public List<Notification> latest(Long employeeId, int limit) {
        return repository.findByEmployeeIdOrderByCreatedAtDescIdDesc(employeeId, PageRequest.of(0, Math.max(1, Math.min(limit, 100))));
    }

    public long unreadCount(Long employeeId) {
        return repository.countByEmployeeIdAndReadFalse(employeeId);
    }

    /** Marks one of this person's notifications as read; false if it is not theirs. */
    @Transactional
    public boolean markRead(Long employeeId, Long notificationId) {
        return repository.findById(notificationId)
                .filter(n -> n.getEmployeeId().equals(employeeId))
                .map(n -> {
                    if (!n.isRead()) {
                        n.setRead(true);
                        n.setReadAt(LocalDateTime.now(BUSINESS_ZONE).withNano(0));
                        repository.save(n);
                    }
                    return true;
                })
                .orElse(false);
    }

    public int markAllRead(Long employeeId) {
        return repository.markAllRead(employeeId, LocalDateTime.now(BUSINESS_ZONE).withNano(0));
    }

    /** Keeps six months of notifications; older ones are removed every night at 02:45 India time. */
    @Scheduled(cron = "0 45 2 * * *", zone = "Asia/Kolkata")
    public void removeOld() {
        repository.deleteOlderThan(LocalDateTime.now(BUSINESS_ZONE).minusDays(180));
    }

    private static String cap(String value) {
        if (value == null) return "";
        return value.length() > 250 ? value.substring(0, 250) : value;
    }
}
