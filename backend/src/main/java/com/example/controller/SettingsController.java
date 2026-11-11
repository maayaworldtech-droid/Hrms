package com.example.controller;

import com.example.entity.AuditLog;
import com.example.entity.CompanySettings;
import com.example.entity.Department;
import com.example.repository.AuditLogRepository;
import com.example.repository.CompanySettingsRepository;
import com.example.repository.DepartmentRepository;
import com.example.security.AuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
public class SettingsController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TS_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private CompanySettingsRepository settingsRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

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
        if (settings.getFiscalYearStartMonth() != null) current.setFiscalYearStartMonth(settings.getFiscalYearStartMonth());
        if (settings.getCurrencySymbol() != null) current.setCurrencySymbol(settings.getCurrencySymbol());
        if (settings.getAutoApproveRegularizationWithinDays() >= 0) {
            current.setAutoApproveRegularizationWithinDays(settings.getAutoApproveRegularizationWithinDays());
        }
        current.setEnableGeoFencingAttendance(settings.isEnableGeoFencingAttendance());

        CompanySettings saved = settingsRepository.save(current);

        AuditLog log = new AuditLog();
        log.setAction("SETTINGS_UPDATED");
        log.setModule("SETTINGS");
        log.setDetails("Updated corporate settings, work hours (" + saved.getStandardWorkHoursPerDay() + "h/day), and geofence policy (" + saved.isEnableGeoFencingAttendance() + ")");
        String email = request != null ? (String) request.getAttribute(AuthFilter.ATTR_EMAIL) : null;
        String role = request != null ? (String) request.getAttribute(AuthFilter.ATTR_ROLE) : null;
        log.setActorName(email != null ? email : "Administrator");
        log.setActorRole(role != null ? role : "ADMIN");
        log.setTimestamp(LocalDateTime.now(BUSINESS_ZONE).format(TS_FORMATTER));
        log.setIpAddress(request != null && request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1");
        auditLogRepository.save(log);

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/departments")
    public ResponseEntity<List<Department>> getDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @GetMapping("/holidays")
    public ResponseEntity<List<Map<String, Object>>> getHolidays() {
        List<Map<String, Object>> holidays = new ArrayList<>();
        holidays.add(createHoliday("1", "Republic Day", "2026-01-26", "Monday", "NATIONAL", true));
        holidays.add(createHoliday("2", "Holi", "2026-03-04", "Wednesday", "FESTIVAL", true));
        holidays.add(createHoliday("3", "Ugadi / Telugu New Year", "2026-03-20", "Friday", "FESTIVAL", true));
        holidays.add(createHoliday("4", "Good Friday", "2026-04-03", "Friday", "FESTIVAL", true));
        holidays.add(createHoliday("5", "Eid-ul-Fitr", "2026-04-20", "Monday", "FESTIVAL", true));
        holidays.add(createHoliday("6", "Independence Day", "2026-08-15", "Saturday", "NATIONAL", true));
        holidays.add(createHoliday("7", "Gandhi Jayanti", "2026-10-02", "Friday", "NATIONAL", true));
        holidays.add(createHoliday("8", "Dussehra (Vijayadashami)", "2026-10-20", "Tuesday", "FESTIVAL", true));
        holidays.add(createHoliday("9", "Diwali (Deepavali)", "2026-11-08", "Sunday", "FESTIVAL", true));
        holidays.add(createHoliday("10", "Christmas Day", "2026-12-25", "Friday", "FESTIVAL", true));
        return ResponseEntity.ok(holidays);
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(auditLogRepository.findAllByOrderByIdDesc());
    }

    private Map<String, Object> createHoliday(String id, String name, String date, String day, String type, boolean mandatory) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("date", date);
        m.put("dayOfWeek", day);
        m.put("type", type);
        m.put("isMandatory", mandatory);
        return m;
    }
}
