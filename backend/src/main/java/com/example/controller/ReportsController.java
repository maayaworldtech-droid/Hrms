package com.example.controller;

import com.example.entity.AttendanceRecord;
import com.example.entity.CompanySettings;
import com.example.entity.Employee;
import com.example.entity.LeaveRequest;
import com.example.entity.OnDutyRequest;
import com.example.repository.AttendanceRepository;
import com.example.repository.CompanySettingsRepository;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveRequestRepository;
import com.example.repository.OnDutyRequestRepository;
import com.example.service.PayrollCalculator;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Small summaries for the admin's Reports page. Days are counted exactly as payroll counts them,
 * so the attendance report and the payslips always agree.
 */
@RestController
@RequestMapping("/api/reports")
public class ReportsController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    private final EmployeeRepository employees;
    private final AttendanceRepository attendance;
    private final LeaveRequestRepository leaves;
    private final OnDutyRequestRepository onDuty;
    private final CompanySettingsRepository settings;

    public ReportsController(EmployeeRepository employees, AttendanceRepository attendance, LeaveRequestRepository leaves,
                             OnDutyRequestRepository onDuty, CompanySettingsRepository settings) {
        this.employees = employees;
        this.attendance = attendance;
        this.leaves = leaves;
        this.onDuty = onDuty;
        this.settings = settings;
    }

    /** One row per staff member for a month (month = 2026-11), optionally for one center. */
    @GetMapping("/attendance")
    public List<Map<String, Object>> attendance(@RequestParam String month, @RequestParam(required = false) String center) {
        YearMonth ym;
        try {
            ym = YearMonth.parse(month.trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a month like 2026-11.");
        }
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        if (start.isAfter(today)) return List.of();

        CompanySettings s = settings.findAll().stream().findFirst().orElseGet(CompanySettings::new);
        int workDaysPerWeek = s.getWorkDaysPerWeek() > 0 ? s.getWorkDaysPerWeek() : 6;
        double paidLeaves = s.getPaidLeavesPerMonth() != null ? s.getPaidLeavesPerMonth() : 1;

        Map<Long, List<AttendanceRecord>> byPerson = attendance.findByDateBetween(start, end).stream()
                .filter(r -> r.getEmployeeId() != null)
                .collect(Collectors.groupingBy(AttendanceRecord::getEmployeeId));
        Map<Long, List<LeaveRequest>> leaveByPerson = leaves.findByStatusOrderByAppliedOnDesc("APPROVED").stream()
                .filter(l -> l.getEmployeeId() != null && l.getStartDate() != null && !l.getStartDate().isAfter(end)
                        && (l.getEndDate() == null || !l.getEndDate().isBefore(start)))
                .collect(Collectors.groupingBy(LeaveRequest::getEmployeeId));
        Map<Long, List<OnDutyRequest>> dutyByPerson = onDuty.findAll().stream()
                .filter(o -> o.getEmployeeId() != null
                        && ("APPROVED".equalsIgnoreCase(o.getStatus()) || "COMPLETED".equalsIgnoreCase(o.getStatus()))
                        && o.getDutyDate() != null && !o.getDutyDate().isBefore(start) && !o.getDutyDate().isAfter(end))
                .collect(Collectors.groupingBy(OnDutyRequest::getEmployeeId));

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Employee emp : employees.findAll()) {
            if ("ADMIN".equals(emp.getRole()) || "TERMINATED".equalsIgnoreCase(emp.getStatus())) continue;
            if (emp.getDateOfJoining() != null && emp.getDateOfJoining().isAfter(end)) continue;
            if (center != null && !center.isBlank() && !"ALL".equalsIgnoreCase(center)
                    && (emp.getLocationName() == null || !emp.getLocationName().equalsIgnoreCase(center.trim()))) continue;

            List<AttendanceRecord> records = byPerson.getOrDefault(emp.getId(), List.of());
            PayrollCalculator.DayCount days = PayrollCalculator.countDays(ym, emp.getDateOfJoining(), workDaysPerWeek, paidLeaves,
                    today, records, leaveByPerson.getOrDefault(emp.getId(), List.of()), dutyByPerson.getOrDefault(emp.getId(), List.of()));
            long late = records.stream().filter(r -> "LATE".equalsIgnoreCase(r.getStatus())).count();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("employeeId", emp.getId());
            row.put("employeeCode", emp.getEmployeeCode());
            row.put("name", emp.getFullName());
            row.put("center", emp.getLocationName());
            row.put("worked", days.workedDays);
            row.put("late", late);
            row.put("leave", days.paidLeaveDays + days.unpaidLeaveDays);
            row.put("absent", days.absentDays);
            rows.add(row);
        }
        rows.sort(Comparator.comparing((Map<String, Object> r) -> String.valueOf(r.get("center")))
                .thenComparing(r -> String.valueOf(r.get("name"))));
        return rows;
    }
}
