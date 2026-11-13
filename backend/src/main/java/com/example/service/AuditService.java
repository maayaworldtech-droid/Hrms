package com.example.service;

import com.example.entity.AuditLog;
import com.example.repository.AuditLogRepository;
import com.example.security.AuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/** Writes entries to the admin activity log shown on the Settings page. Never throws. */
@Service
public class AuditService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TS_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(HttpServletRequest request, String module, String action, String details) {
        try {
            AuditLog log = new AuditLog();
            log.setModule(module);
            log.setAction(action);
            log.setDetails(details);
            String email = request != null ? (String) request.getAttribute(AuthFilter.ATTR_EMAIL) : null;
            String role = request != null ? (String) request.getAttribute(AuthFilter.ATTR_ROLE) : null;
            log.setActorName(email != null ? email : "System");
            log.setActorRole(role != null ? role : "SYSTEM");
            log.setTimestamp(LocalDateTime.now(BUSINESS_ZONE).withNano(0));
            log.setIpAddress(request != null && request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1");
            auditLogRepository.save(log);
        } catch (Exception ignored) {
            // Activity logging must never block the action being logged
        }
    }
}
