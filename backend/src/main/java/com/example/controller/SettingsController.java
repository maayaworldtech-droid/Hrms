package com.example.controller;

import com.example.entity.CompanySettings;
import com.example.entity.Department;
import com.example.repository.CompanySettingsRepository;
import com.example.repository.DepartmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api")
public class SettingsController {

    @Autowired
    private CompanySettingsRepository settingsRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @GetMapping("/settings")
    public ResponseEntity<CompanySettings> getSettings() {
        List<CompanySettings> list = settingsRepository.findAll();
        if (list.isEmpty()) {
            return ResponseEntity.ok(settingsRepository.save(new CompanySettings()));
        }
        return ResponseEntity.ok(list.get(0));
    }

    @PutMapping("/settings")
    public ResponseEntity<CompanySettings> updateSettings(@RequestBody CompanySettings settings) {
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
        current.setEnableGeoFencingAttendance(settings.isEnableGeoFencingAttendance());

        return ResponseEntity.ok(settingsRepository.save(current));
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
    public ResponseEntity<List<Map<String, Object>>> getAuditLogs() {
        List<Map<String, Object>> logs = new ArrayList<>();
        logs.add(createLog("1", "ADMIN_SIGN_IN", "AUTH", "Administrator signed in securely", "Shyam Sundar Yedla", "ADMIN", "2026-10-16 10:15:20"));
        logs.add(createLog("2", "PAYROLL_DISBURSED", "PAYROLL", "Processed monthly payroll disburals", "System Engine", "ADMIN", "2026-10-15 18:30:00"));
        logs.add(createLog("3", "EMPLOYEE_ONBOARDED", "EMPLOYEE", "Onboarded staff and dispatched ZeptoMail credentials", "Shyam Sundar Yedla", "ADMIN", "2026-10-14 11:20:00"));
        return ResponseEntity.ok(logs);
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

    private Map<String, Object> createLog(String id, String action, String module, String details, String actor, String role, String timestamp) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("action", action);
        m.put("module", module);
        m.put("details", details);
        m.put("actorName", actor);
        m.put("actorRole", role);
        m.put("timestamp", timestamp);
        m.put("ipAddress", "127.0.0.1");
        return m;
    }
}
