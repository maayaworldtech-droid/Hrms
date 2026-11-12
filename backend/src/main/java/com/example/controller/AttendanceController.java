package com.example.controller;

import com.example.entity.AttendanceRecord;
import com.example.entity.CompanySettings;
import com.example.entity.Employee;
import com.example.repository.AttendanceRepository;
import com.example.repository.CompanySettingsRepository;
import com.example.repository.EmployeeRepository;
import com.example.security.AuthFilter;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private CompanySettingsRepository settingsRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    @GetMapping
    public ResponseEntity<List<AttendanceRecord>> getAll() {
        return ResponseEntity.ok(attendanceRepository.findAllByOrderByDateDesc());
    }

    @GetMapping("/paged")
    public ResponseEntity<Map<String, Object>> getPaged(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String shift,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(100, size));

        Specification<AttendanceRecord> spec = buildFilterSpec(
                date, fromDate, toDate, location, shift, status, search, employeeIds
        );
        Sort sort = Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id"));
        Page<AttendanceRecord> result = attendanceRepository.findAll(spec, PageRequest.of(safePage, safeSize, sort));

        Map<String, Object> body = new HashMap<>();
        body.put("items", result.getContent());
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("hasMore", result.hasNext());
        body.put("totalElements", result.getTotalElements());
        if (safePage == 0) {
            body.put("summary", computeStatusSummary(date, fromDate, toDate, location, shift, search, employeeIds));
        }
        return ResponseEntity.ok(body);
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<AttendanceRecord>> getByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(attendanceRepository.findByEmployeeIdOrderByDateDesc(employeeId));
    }

    @GetMapping("/employee/{employeeId}/history")
    public ResponseEntity<?> getEmployeeHistory(
            @PathVariable Long employeeId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        LocalDate endDate;
        LocalDate startDate;
        try {
            endDate = (toDate != null && !toDate.isBlank())
                    ? LocalDate.parse(toDate.trim())
                    : LocalDate.now(BUSINESS_ZONE);
            startDate = (fromDate != null && !fromDate.isBlank())
                    ? LocalDate.parse(fromDate.trim())
                    : endDate.minusMonths(1);
        } catch (DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid date format. Expected YYYY-MM-DD."));
        }

        if (startDate.isAfter(endDate)) {
            return ResponseEntity.badRequest().body(Map.of("message", "fromDate cannot be after toDate."));
        }

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(50, size));
        String startStr = startDate.toString();
        String endStr = endDate.toString();

        Slice<AttendanceRecord> slice = attendanceRepository.findByEmployeeIdAndDateBetweenOrderByDateDescIdDesc(
                employeeId,
                startStr,
                endStr,
                PageRequest.of(safePage, safeSize)
        );
        boolean hasOlderRecords = attendanceRepository.existsByEmployeeIdAndDateLessThan(employeeId, startStr);

        Map<String, Object> body = new HashMap<>();
        body.put("items", slice.getContent());
        body.put("fromDate", startStr);
        body.put("toDate", endStr);
        body.put("page", slice.getNumber());
        body.put("size", slice.getSize());
        body.put("hasMore", slice.hasNext());
        body.put("hasOlderRecords", hasOlderRecords);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        Long employeeId = parseEmployeeId(payload.get("employeeId"));
        if (employeeId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid employeeId is required"));
        }
        if (!canActForEmployee(request, employeeId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Cannot record attendance for another employee"));
        }

        String date = resolvePunchDate(request, employeeId, payload);
        String time = resolvePunchTime(request, employeeId, payload);
        if (date == null || time == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid date or time. Expected YYYY-MM-DD and HH:mm[:ss]."));
        }

        Optional<Employee> empOpt = employeeRepository.findById(employeeId);
        if (empOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Employee not found"));
        }
        Employee emp = empOpt.get();

        Optional<AttendanceRecord> existingOpt = attendanceRepository.findByEmployeeIdAndDate(employeeId, date);
        AttendanceRecord record;
        if (existingOpt.isPresent()) {
            record = existingOpt.get();
            if (record.getCheckIn() != null && !record.getCheckIn().isBlank()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Already checked in for " + date));
            }
            record.setCheckIn(time);
        } else {
            record = new AttendanceRecord();
            record.setEmployeeId(employeeId);
            record.setDate(date);
            record.setCheckIn(time);
            record.setEmployeeName(emp.getFullName());
            record.setDepartmentName(emp.getDepartment());
            record.setLocation(emp.getLocationName());
            record.setShift(emp.getShift() != null ? emp.getShift() : "MORNING");
        }

        applyAuditPayload(record, payload);
        record.setStatus(resolveArrivalStatus(record.getShift(), time));
        if (record.getRegularizationStatus() == null) {
            record.setRegularizationStatus("NONE");
        }
        return ResponseEntity.ok(attendanceRepository.save(record));
    }

    @PostMapping("/check-out")
    public ResponseEntity<?> checkOut(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        Long employeeId = parseEmployeeId(payload.get("employeeId"));
        if (employeeId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid employeeId is required"));
        }
        if (!canActForEmployee(request, employeeId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Cannot record check-out for another employee"));
        }

        String date = resolvePunchDate(request, employeeId, payload);
        String time = resolvePunchTime(request, employeeId, payload);
        if (date == null || time == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid date or time. Expected YYYY-MM-DD and HH:mm[:ss]."));
        }

        Optional<AttendanceRecord> existingOpt = attendanceRepository.findByEmployeeIdAndDate(employeeId, date);
        if (existingOpt.isEmpty() || existingOpt.get().getCheckIn() == null || existingOpt.get().getCheckIn().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "No check-in found for " + date + ". Please check in first."));
        }

        AttendanceRecord record = existingOpt.get();
        if (record.getCheckOut() != null && !record.getCheckOut().isBlank()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Already checked out for " + date));
        }

        record.setCheckOut(time);
        record.setWorkHours(calculateWorkHours(record.getCheckIn(), time));
        applyAuditPayload(record, payload);

        if (record.getStatus() == null || record.getStatus().isBlank()) {
            record.setStatus(resolveArrivalStatus(record.getShift(), record.getCheckIn()));
        }
        return ResponseEntity.ok(attendanceRepository.save(record));
    }

    @PostMapping("/regularize")
    public ResponseEntity<?> regularize(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        Long recordId = parseEmployeeId(payload.get("recordId"));
        if (recordId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid recordId is required"));
        }
        String reason = payload.get("reason") != null ? payload.get("reason").toString().trim() : "";
        if (reason.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Regularization reason is required"));
        }

        Optional<AttendanceRecord> opt = attendanceRepository.findById(recordId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        AttendanceRecord record = opt.get();
        if (!canActForEmployee(request, record.getEmployeeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You can only request correction for your own attendance."));
        }

        record.setRegularizationStatus("PENDING");
        record.setRegularizationReason(reason);
        return ResponseEntity.ok(attendanceRepository.save(record));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<AttendanceRecord> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        return attendanceRepository.findById(id).map(record -> {
            if (status != null) record.setStatus(status);
            return ResponseEntity.ok(attendanceRepository.save(record));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/approve-regularization")
    public ResponseEntity<AttendanceRecord> approveRegularization(@PathVariable Long id) {
        return attendanceRepository.findById(id).map(record -> {
            record.setRegularizationStatus("APPROVED");
            record.setStatus("PRESENT");
            return ResponseEntity.ok(attendanceRepository.save(record));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Long parseEmployeeId(Object raw) {
        if (raw == null) return null;
        try {
            return Long.valueOf(raw.toString().replace("emp-", "").trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private boolean canActForEmployee(HttpServletRequest request, Long targetEmployeeId) {
        String role = (String) request.getAttribute(AuthFilter.ATTR_ROLE);
        Long authId = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        if ("ADMIN".equals(role) || "MANAGER".equals(role)) {
            return true;
        }
        return authId != null && authId.equals(targetEmployeeId);
    }

    /**
     * Client-supplied punch date/time is honoured only when an Admin/Manager records attendance on behalf
     * of another employee. Self punches always use server time in the business zone, so employees cannot
     * backdate attendance or avoid LATE marking, and devices outside IST still record the correct time.
     */
    private boolean mayOverridePunchTime(HttpServletRequest request, Long targetEmployeeId) {
        String role = (String) request.getAttribute(AuthFilter.ATTR_ROLE);
        Long authId = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        boolean privileged = "ADMIN".equals(role) || "MANAGER".equals(role);
        return privileged && authId != null && !authId.equals(targetEmployeeId);
    }

    private String resolvePunchDate(HttpServletRequest request, Long employeeId, Map<String, Object> payload) {
        Object raw = payload.get("date");
        if (mayOverridePunchTime(request, employeeId) && raw != null && !raw.toString().isBlank()) {
            try {
                return LocalDate.parse(raw.toString().trim()).toString();
            } catch (DateTimeParseException e) {
                return null;
            }
        }
        return LocalDate.now(BUSINESS_ZONE).toString();
    }

    private String resolvePunchTime(HttpServletRequest request, Long employeeId, Map<String, Object> payload) {
        Object raw = payload.get("time");
        if (mayOverridePunchTime(request, employeeId) && raw != null && !raw.toString().isBlank()) {
            try {
                return parseTimeFlexible(raw.toString()).format(TIME_FORMATTER);
            } catch (DateTimeParseException e) {
                return null;
            }
        }
        return LocalTime.now(BUSINESS_ZONE).format(TIME_FORMATTER);
    }

    private void applyAuditPayload(AttendanceRecord record, Map<String, Object> payload) {
        if (payload.get("latitude") != null) {
            try { record.setLatitude(Double.valueOf(payload.get("latitude").toString())); } catch (Exception ignored) {}
        }
        if (payload.get("longitude") != null) {
            try { record.setLongitude(Double.valueOf(payload.get("longitude").toString())); } catch (Exception ignored) {}
        }
        if (payload.get("distanceMeters") != null) {
            try { record.setDistanceMeters(Integer.valueOf(payload.get("distanceMeters").toString())); } catch (Exception ignored) {}
        }
        if (payload.get("biometricScore") != null) {
            try { record.setBiometricScore(Double.valueOf(payload.get("biometricScore").toString())); } catch (Exception ignored) {}
        }
        if (payload.get("isLocationVerified") != null) {
            try { record.setIsLocationVerified(Boolean.valueOf(payload.get("isLocationVerified").toString())); } catch (Exception ignored) {}
        }
        if (payload.get("isBiometricVerified") != null) {
            try { record.setIsBiometricVerified(Boolean.valueOf(payload.get("isBiometricVerified").toString())); } catch (Exception ignored) {}
        }
        if (payload.get("notes") != null) {
            record.setNotes(payload.get("notes").toString());
        }
        if (payload.get("facePhoto") != null) {
            record.setFacePhoto(payload.get("facePhoto").toString());
        }
        if (payload.get("faceBiometrics") != null) {
            record.setFaceBiometrics(payload.get("faceBiometrics").toString());
        }
    }

    private String resolveArrivalStatus(String shift, String checkInTimeStr) {
        try {
            LocalTime checkIn = parseTimeFlexible(checkInTimeStr);
            // Shift start and late allowance come from Settings (defaults 09:00 / 13:00, 15 minutes)
            CompanySettings settings = settingsRepository.findAll().stream().findFirst().orElseGet(CompanySettings::new);
            LocalTime shiftStart = LocalTime.parse("EVENING".equalsIgnoreCase(shift)
                    ? settings.getEveningShiftStart()
                    : settings.getMorningShiftStart());
            LocalTime graceCutoff = shiftStart.plusMinutes(settings.getLateGraceMinutes());
            return checkIn.isAfter(graceCutoff) ? "LATE" : "PRESENT";
        } catch (Exception e) {
            return "PRESENT";
        }
    }

    private double calculateWorkHours(String checkInStr, String checkOutStr) {
        try {
            LocalTime start = parseTimeFlexible(checkInStr);
            LocalTime end = parseTimeFlexible(checkOutStr);
            long minutes = Duration.between(start, end).toMinutes();
            if (minutes < 0) {
                minutes += 24 * 60;
            }
            return Math.round((minutes / 60.0) * 100.0) / 100.0;
        } catch (Exception e) {
            return 0.0;
        }
    }

    private LocalTime parseTimeFlexible(String timeStr) {
        String clean = timeStr.trim();
        if (clean.length() == 5) {
            clean += ":00";
        }
        return LocalTime.parse(clean, TIME_FORMATTER);
    }

    private Specification<AttendanceRecord> buildFilterSpec(
            String date,
            String fromDate,
            String toDate,
            String location,
            String shift,
            String status,
            String search,
            List<Long> employeeIds
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (employeeIds != null && !employeeIds.isEmpty()) {
                predicates.add(root.get("employeeId").in(employeeIds));
            }
            if (date != null && !date.isBlank()) {
                predicates.add(cb.equal(root.get("date"), date.trim()));
            }
            if (fromDate != null && !fromDate.isBlank()) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("date"), fromDate.trim()));
            }
            if (toDate != null && !toDate.isBlank()) {
                predicates.add(cb.lessThanOrEqualTo(root.get("date"), toDate.trim()));
            }
            if (location != null && !location.isBlank() && !"ALL".equalsIgnoreCase(location.trim())) {
                predicates.add(cb.equal(cb.lower(root.get("location")), location.trim().toLowerCase()));
            }
            if (shift != null && !shift.isBlank() && !"ALL".equalsIgnoreCase(shift.trim())) {
                String cleanShift = shift.trim().toUpperCase();
                if ("MORNING".equals(cleanShift)) {
                    predicates.add(cb.or(
                            cb.equal(cb.upper(root.get("shift")), "MORNING"),
                            cb.isNull(root.get("shift"))
                    ));
                } else {
                    predicates.add(cb.equal(cb.upper(root.get("shift")), cleanShift));
                }
            }
            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) {
                String cleanStatus = status.trim().toUpperCase();
                if ("ISSUES".equals(cleanStatus)) {
                    predicates.add(cb.or(
                            root.get("status").in(List.of("ABSENT", "LATE")),
                            cb.equal(cb.upper(root.get("regularizationStatus")), "PENDING")
                    ));
                } else if ("REGULARIZATION_PENDING".equals(cleanStatus)) {
                    predicates.add(cb.equal(cb.upper(root.get("regularizationStatus")), "PENDING"));
                } else {
                    predicates.add(cb.equal(cb.upper(root.get("status")), cleanStatus));
                }
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("employeeName"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("departmentName"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("location"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Map<String, Long> computeStatusSummary(
            String date,
            String fromDate,
            String toDate,
            String location,
            String shift,
            String search,
            List<Long> employeeIds
    ) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Object[]> cq = cb.createQuery(Object[].class);
        Root<AttendanceRecord> root = cq.from(AttendanceRecord.class);
        cq.multiselect(root.get("status"), cb.count(root));

        Predicate where = buildFilterSpec(date, fromDate, toDate, location, shift, null, search, employeeIds)
                .toPredicate(root, cq, cb);
        if (where != null) {
            cq.where(where);
        }
        cq.groupBy(root.get("status"));

        Map<String, Long> counts = new HashMap<>();
        counts.put("present", 0L);
        counts.put("onDuty", 0L);
        counts.put("late", 0L);
        counts.put("onLeave", 0L);

        for (Object[] row : entityManager.createQuery(cq).getResultList()) {
            String rowStatus = row[0] != null ? row[0].toString().toUpperCase() : "";
            long count = row[1] instanceof Number ? ((Number) row[1]).longValue() : 0L;
            switch (rowStatus) {
                case "PRESENT" -> counts.put("present", count);
                case "ON_DUTY" -> counts.put("onDuty", count);
                case "LATE" -> counts.put("late", count);
                case "ON_LEAVE" -> counts.put("onLeave", count);
                default -> {}
            }
        }
        return counts;
    }
}
