package com.example.repository;

import com.example.entity.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByEmployeeIdOrderByCreatedAtDescIdDesc(Long employeeId, Pageable page);

    long countByEmployeeIdAndReadFalse(Long employeeId);

    Optional<Notification> findByEmployeeIdAndEventKey(Long employeeId, String eventKey);

    long countByEmployeeIdAndEventKeyStartingWith(Long employeeId, String prefix);

    /**
     * Adds the notification unless this person already has one for the same event. Returns 1 when
     * added and 0 for a repeat. Uses ON CONFLICT so a repeat never raises an error, which would
     * otherwise undo the action it was attached to (for example marking a month as paid).
     */
    @Modifying
    @Transactional
    @Query(value = "INSERT INTO notifications (employee_id, type, event_key, title, message, link, is_read, created_at, email_status) "
            + "VALUES (:employeeId, :type, :eventKey, :title, :message, :link, false, :createdAt, :emailStatus) "
            + "ON CONFLICT (employee_id, event_key) DO NOTHING", nativeQuery = true)
    int insertIfNew(@Param("employeeId") Long employeeId,
                    @Param("type") String type,
                    @Param("eventKey") String eventKey,
                    @Param("title") String title,
                    @Param("message") String message,
                    @Param("link") String link,
                    @Param("createdAt") LocalDateTime createdAt,
                    @Param("emailStatus") String emailStatus);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.read = true, n.readAt = :now WHERE n.employeeId = :employeeId AND n.read = false")
    int markAllRead(@Param("employeeId") Long employeeId, @Param("now") LocalDateTime now);

    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.emailStatus = :status WHERE n.employeeId = :employeeId AND n.eventKey = :eventKey")
    int setEmailStatus(@Param("employeeId") Long employeeId, @Param("eventKey") String eventKey, @Param("status") String status);

    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDateTime cutoff);
}
