package com.example.controller;

import com.example.entity.AuditLog;
import com.example.entity.CompanySettings;
import com.example.repository.AuditLogRepository;
import com.example.repository.CompanySettingsRepository;
import com.example.security.AuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.time.ZoneId;
import java.util.*;

@RestController
@RequestMapping("/api")
public class SettingsController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    @Autowired
    private CompanySettingsRepository settingsRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @GetMapping("/settings")
    public ResponseEntity<CompanySettings> getSettings() {
        List<CompanySettings> list = settingsRepository.findAll();
        if (list.isEmpty()) {
            return ResponseEntity.ok(settingsRepository.save(new CompanySettings()));
        }
        return ResponseEntity.ok(list.get(0));
    }

    @PutMapping("/settings")
    public ResponseEntity<CompanySettings> updateSettings(
            @RequestBody CompanySettings settings,
            HttpServletRequest request
    ) {
        List<CompanySettings> list = settingsRepository.findAll();
        CompanySettings current = list.isEmpty() ? new CompanySettings() : list.get(0);

        if (settings.getCompanyName() != null) current.setCompanyName(settings.getCompanyName());
        if (settings.getLegalEntityName() != null) current.setLegalEntityName(settings.getLegalEntityName());
        if (settings.getCorporateTaxId() != null) current.setCorporateTaxId(settings.getCorporateTaxId());
        if (settings.getPfRegistrationNo() != null) current.setPfRegistrationNo(settings.getPfRegistrationNo());
        if (settings.getEsiRegistrationNo() != null) current.setEsiRegistrationNo(settings.getEsiRegistrationNo());
        if (settings.getRegisteredAddress() != null) current.setRegisteredAddress(settings.getRegisteredAddress());
        if (settings.getContactEmail() != null) current.setContactEmail(settings.getContactEmail());
        if (settings.getContactPhone() != null) current.setContactPhone(settings.getContactPhone());
        if (settings.getStandardWorkHoursPerDay() > 0) current.setStandardWorkHoursPerDay(settings.getStandardWorkHoursPerDay());
        if (settings.getWorkDaysPerWeek() > 0) current.setWorkDaysPerWeek(settings.getWorkDaysPerWeek());
        if (settings.getPaidLeavesPerMonth() != null && settings.getPaidLeavesPerMonth() >= 0 && settings.getPaidLeavesPerMonth() <= 31) {
            current.setPaidLeavesPerMonth(settings.getPaidLeavesPerMonth());
        }
        if (settings.getFiscalYearStartMonth() != null) current.setFiscalYearStartMonth(settings.getFiscalYearStartMonth());
        if (settings.getCurrencySymbol() != null) current.setCurrencySymbol(settings.getCurrencySymbol());
        if (settings.getAutoApproveRegularizationWithinDays() >= 0) {
            current.setAutoApproveRegularizationWithinDays(settings.getAutoApproveRegularizationWithinDays());
        }
        current.setEnableGeoFencingAttendance(settings.isEnableGeoFencingAttendance());

        // Shift timings: copy only what was sent, then validate the resulting pair of shifts
        if (settings.rawMorningShiftStart() != null) current.setMorningShiftStart(settings.rawMorningShiftStart().trim());
        if (settings.rawMorningShiftEnd() != null) current.setMorningShiftEnd(settings.rawMorningShiftEnd().trim());
        if (settings.rawEveningShiftStart() != null) current.setEveningShiftStart(settings.rawEveningShiftStart().trim());
        if (settings.rawEveningShiftEnd() != null) current.setEveningShiftEnd(settings.rawEveningShiftEnd().trim());
        if (settings.rawLateGraceMinutes() != null) current.setLateGraceMinutes(settings.rawLateGraceMinutes());
        validateShift("Morning", current.getMorningShiftStart(), current.getMorningShiftEnd());
        validateShift("Evening", current.getEveningShiftStart(), current.getEveningShiftEnd());
        if (current.getLateGraceMinutes() < 0 || current.getLateGraceMinutes() > 120) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Late allowance must be between 0 and 120 minutes.");
        }

        CompanySettings saved = settingsRepository.save(current);

        AuditLog log = new AuditLog();
        log.setAction("SETTINGS_UPDATED");
        log.setModule("SETTINGS");
        log.setDetails("Updated company settings. Shifts: morning " + saved.getMorningShiftStart() + "-" + saved.getMorningShiftEnd()
                + ", evening " + saved.getEveningShiftStart() + "-" + saved.getEveningShiftEnd()
                + ", late after " + saved.getLateGraceMinutes() + " min. Location check-in "
                + (saved.isEnableGeoFencingAttendance() ? "on" : "off") + ".");
        String email = request != null ? (String) request.getAttribute(AuthFilter.ATTR_EMAIL) : null;
        String role = request != null ? (String) request.getAttribute(AuthFilter.ATTR_ROLE) : null;
        log.setActorName(email != null ? email : "Administrator");
        log.setActorRole(role != null ? role : "ADMIN");
        log.setTimestamp(LocalDateTime.now(BUSINESS_ZONE).withNano(0));
        log.setIpAddress(request != null && request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1");
        auditLogRepository.save(log);

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findAllByOrderByIdDesc());
    }

    /** Shift times must be HH:mm (24-hour) and end after they start. */
    private void validateShift(String label, String start, String end) {
        try {
            LocalTime s = LocalTime.parse(start);
            LocalTime e = LocalTime.parse(end);
            if (!e.isAfter(s)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " shift must end after it starts.");
            }
        } catch (DateTimeParseException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " shift times must look like 09:00 or 21:30.");
        }
    }
}
