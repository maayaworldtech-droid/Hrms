package com.example.controller;

import com.example.entity.AttendanceRecord;
import com.example.entity.AuditLog;
import com.example.entity.CompanySettings;
import com.example.entity.Employee;
import com.example.entity.LeaveRequest;
import com.example.entity.OnDutyRequest;
import com.example.entity.PayrollRun;
import com.example.entity.Payslip;
import com.example.repository.AttendanceRepository;
import com.example.repository.AuditLogRepository;
import com.example.repository.CompanySettingsRepository;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveRequestRepository;
import com.example.repository.LocationRepository;
import com.example.entity.Location;
import com.example.repository.OnDutyRequestRepository;
import com.example.repository.PayrollRunRepository;
import com.example.repository.PayslipRepository;
import com.example.security.AuthFilter;
import com.example.service.PayrollCalculator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payroll")
public class PayrollController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter TS_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private PayrollRunRepository payrollRunRepository;

    @Autowired
    private PayslipRepository payslipRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private OnDutyRequestRepository onDutyRequestRepository;

    @Autowired
    private CompanySettingsRepository settingsRepository;

    @Autowired
    private LocationRepository locationRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/runs")
    public ResponseEntity<List<PayrollRun>> getRuns(HttpServletRequest request) {
        String ownCenter = managerCenter(request);
        List<PayrollRun> runs = new ArrayList<>(payrollRunRepository.findAll());
        if (isManager(request)) {
            runs.removeIf(r -> ownCenter == null || r.getCenter() == null || !r.getCenter().equalsIgnoreCase(ownCenter));
        }
        runs.sort(RUN_NEWEST_FIRST);
        return ResponseEntity.ok(runs);
    }

    @GetMapping("/payslips/{employeeId}")
    public ResponseEntity<List<Payslip>> getPayslipsByEmployee(@PathVariable Long employeeId) {
        List<Payslip> slips = new ArrayList<>(payslipRepository.findByEmployeeIdOrderByYearDescMonthDesc(employeeId));
        slips.sort(SLIP_NEWEST_FIRST);
        return ResponseEntity.ok(slips);
    }

    @GetMapping("/payslips/run/{runId}")
    public ResponseEntity<List<Payslip>> getPayslipsByRun(@PathVariable Long runId, HttpServletRequest request) {
        PayrollRun run = payrollRunRepository.findById(runId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll not found."));
        requireCenterAccess(request, run.getCenter());
        return ResponseEntity.ok(payslipRepository.findByPayrollRunId(runId));
    }

    @PostMapping("/process")
    @Transactional
    public ResponseEntity<PayrollRun> processPayroll(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        String month = payload.get("month") != null && !payload.get("month").toString().isBlank()
                ? payload.get("month").toString().trim()
                : MONTH_NAMES.get(today.getMonthValue() - 1).substring(0, 1).toUpperCase()
                        + MONTH_NAMES.get(today.getMonthValue() - 1).substring(1);
        if (monthIndex(month) == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unrecognised payroll month: " + month);
        }
        int year;
        try {
            year = payload.get("year") != null ? Integer.parseInt(payload.get("year").toString().trim()) : today.getYear();
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payroll year must be numeric.");
        }

        // Payroll is worked out one center at a time. A manager can only do their own center.
        String requestedCenter = payload.get("center") != null ? payload.get("center").toString().trim() : "";
        Location payLocation;
        if (isManager(request)) {
            payLocation = managerLocation(request);
            if (payLocation == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to a center.");
            }
            if (!requestedCenter.isEmpty() && !requestedCenter.equalsIgnoreCase(payLocation.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only run payroll for " + payLocation.getName() + ".");
            }
        } else {
            if (requestedCenter.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a center.");
            }
            payLocation = locationRepository.findFirstByNameIgnoreCaseOrderByLocationIdAsc(requestedCenter)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown center: " + requestedCenter));
        }
        final String payCenter = payLocation.getName();
        final int payLocationId = payLocation.getLocationId();

        // The same center and month
        List<PayrollRun> existingRuns = payrollRunRepository.findByMonthIgnoreCaseAndYear(month, year).stream()
                .filter(r -> r.getLocation() != null && r.getLocation().getLocationId() == payLocationId)
                .toList();
        for (PayrollRun existing : existingRuns) {
            if ("DISBURSED".equalsIgnoreCase(existing.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Payroll for " + payCenter + ", " + month + " " + year + " is already paid."
                );
            }
        }
        // Replace the unpaid draft for this center and month
        for (PayrollRun draft : existingRuns) {
            payslipRepository.deleteByPayrollRunId(draft.getId());
            payrollRunRepository.delete(draft);
        }

        YearMonth payMonth = YearMonth.of(year, monthIndex(month));
        LocalDate monthStart = payMonth.atDay(1);
        LocalDate monthEnd = payMonth.atEndOfMonth();

        // The admin is the owner, not salaried staff; people joining after this month are not paid yet
        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(emp -> !"TERMINATED".equalsIgnoreCase(emp.getStatus()))
                .filter(emp -> !"ADMIN".equalsIgnoreCase(emp.getRole()))
                .filter(emp -> emp.getDateOfJoining() == null || !emp.getDateOfJoining().isAfter(monthEnd))
                .filter(emp -> emp.getLocation() != null && emp.getLocation().getLocationId() == payLocationId)
                .toList();
        if (employees.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No staff to pay at " + payCenter + " for " + month + " " + year + ".");
        }

        CompanySettings settings = settingsRepository.findAll().stream().findFirst().orElseGet(CompanySettings::new);
        int workDaysPerWeek = settings.getWorkDaysPerWeek() > 0 ? settings.getWorkDaysPerWeek() : 6;
        double paidLeavesPerMonth = settings.getPaidLeavesPerMonth() != null ? settings.getPaidLeavesPerMonth() : 1;

        // Attendance, approved leave and approved On Duty for the month, grouped by person
        Map<Long, List<AttendanceRecord>> attendanceByPerson = attendanceRepository.findByDateBetween(monthStart, monthEnd)
                .stream().filter(r -> r.getEmployeeId() != null)
                .collect(Collectors.groupingBy(AttendanceRecord::getEmployeeId));
        Map<Long, List<LeaveRequest>> leaveByPerson = leaveRequestRepository.findByStatusOrderByAppliedOnDesc("APPROVED")
                .stream().filter(l -> l.getEmployeeId() != null
                        && l.getStartDate() != null && !l.getStartDate().isAfter(monthEnd)
                        && (l.getEndDate() == null || !l.getEndDate().isBefore(monthStart)))
                .collect(Collectors.groupingBy(LeaveRequest::getEmployeeId));
        Map<Long, List<OnDutyRequest>> dutyByPerson = onDutyRequestRepository.findAll().stream()
                .filter(o -> o.getEmployeeId() != null
                        && ("APPROVED".equalsIgnoreCase(o.getStatus()) || "COMPLETED".equalsIgnoreCase(o.getStatus()))
                        && o.getDutyDate() != null && !o.getDutyDate().isBefore(monthStart) && !o.getDutyDate().isAfter(monthEnd))
                .collect(Collectors.groupingBy(OnDutyRequest::getEmployeeId));

        PayrollRun run = new PayrollRun();
        run.setLocation(payLocation);
        run.setMonth(month);
        run.setYear(year);
        run.setTotalEmployees(employees.size());
        run.setStatus("DRAFT");
        run.setProcessedAt(today);
        PayrollRun savedRun = payrollRunRepository.save(run);

        List<Payslip> generatedSlips = new ArrayList<>();
        for (Employee emp : employees) {
            Payslip slip = new Payslip();
            slip.setPayrollRunId(savedRun.getId());
            slip.setEmployeeId(emp.getId());
            slip.setEmployeeCode(emp.getEmployeeCode());
            slip.setEmployeeName(emp.getFullName());
            slip.setDesignation(emp.getJobTitle());
            slip.setLocation(emp.getLocationName());
            slip.setPanNumber(emp.getPanNumber() != null ? emp.getPanNumber() : "");
            slip.setUanNumber(emp.getUanNumber() != null ? emp.getUanNumber() : "");
            slip.setBankAccount(emp.getAccountNumber() != null ? emp.getAccountNumber() : "");
            slip.setBankName(emp.getBankName() != null ? emp.getBankName() : "");
            slip.setMonth(month);
            slip.setYear(year);
            slip.setCtcAnnual(emp.getCtcAnnual() != null ? emp.getCtcAnnual() : 0.0);
            slip.setPaymentStatus("PENDING");
            slip.setPaymentMode("NEFT");
            slip.setPtState(emp.getLocation() != null ? emp.getLocation().getState() : null);

            applySalaryStructure(slip, emp);

            PayrollCalculator.DayCount days = PayrollCalculator.countDays(
                    payMonth,
                    emp.getDateOfJoining(),
                    workDaysPerWeek,
                    paidLeavesPerMonth,
                    today,
                    attendanceByPerson.getOrDefault(emp.getId(), List.of()),
                    leaveByPerson.getOrDefault(emp.getId(), List.of()),
                    dutyByPerson.getOrDefault(emp.getId(), List.of())
            );
            slip.setDaysInMonth(days.daysInMonth);
            slip.setEmployedDays(days.employedDays);
            slip.setWorkedDays(days.workedDays);
            slip.setPaidLeaveDays(days.paidLeaveDays);
            slip.setUnpaidLeaveDays(days.unpaidLeaveDays);
            slip.setAbsentDays(days.absentDays);
            slip.setSuggestedLopDays(days.suggestedLopDays);
            slip.setNoAttendance(days.noAttendance && !today.isBefore(payMonth.atDay(1)));
            slip.setLossOfPayDays(days.suggestedLopDays);

            PayrollCalculator.recompute(slip);
            generatedSlips.add(payslipRepository.save(slip));
        }

        updateRunTotals(savedRun, generatedSlips);
        PayrollRun persisted = payrollRunRepository.save(savedRun);
        persisted.setPayslips(generatedSlips);

        recordAudit(request, "PAYROLL_DRAFT_CREATED", "Worked out payroll for " + payCenter + ", " + month + " " + year + " (" + employees.size() + " staff)");
        return ResponseEntity.ok(persisted);
    }

    @PutMapping("/payslips/{id}/adjust")
    @Transactional
    public ResponseEntity<?> adjustPayslip(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest request
    ) {
        Optional<Payslip> opt = payslipRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Payslip slip = opt.get();
        if (isManager(request)) {
            String ownCenter = managerCenter(request);
            if (ownCenter == null || slip.getLocation() == null || !slip.getLocation().equalsIgnoreCase(ownCenter)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "You can only change payroll for your own center."));
            }
            Long me = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
            if (me != null && me.equals(slip.getEmployeeId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Your own pay can only be changed by the admin."));
            }
        }
        if (slip.getPayrollRunId() != null) {
            Optional<PayrollRun> runOpt = payrollRunRepository.findById(slip.getPayrollRunId());
            if (runOpt.isPresent() && "DISBURSED".equalsIgnoreCase(runOpt.get().getStatus())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Cannot adjust payslips in an already disbursed payroll run."));
            }
        }

        // Only these can change by hand; everything else follows from them in PayrollCalculator
        try {
            if (payload.containsKey("lossOfPayDays")) {
                slip.setLossOfPayDays((int) Math.max(0, Math.round(Double.parseDouble(String.valueOf(payload.get("lossOfPayDays"))))));
            }
            if (payload.containsKey("bonus")) {
                slip.setBonus(Math.max(0.0, Math.round(Double.parseDouble(String.valueOf(payload.get("bonus"))))));
            }
            if (payload.containsKey("tds")) {
                slip.setTds(Math.max(0.0, Math.round(Double.parseDouble(String.valueOf(payload.get("tds"))))));
            }
            if (payload.containsKey("otherDeductions")) {
                slip.setOtherDeductions(Math.max(0.0, Math.round(Double.parseDouble(String.valueOf(payload.get("otherDeductions"))))));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Amounts and days must be numbers."));
        }
        if (payload.containsKey("notes")) {
            slip.setAdjustmentNotes(payload.get("notes") != null ? payload.get("notes").toString().trim() : "");
        }

        PayrollCalculator.recompute(slip);
        Payslip savedSlip = payslipRepository.save(slip);

        if (savedSlip.getPayrollRunId() != null) {
            payrollRunRepository.findById(savedSlip.getPayrollRunId()).ifPresent(run -> {
                updateRunTotals(run, payslipRepository.findByPayrollRunId(run.getId()));
                payrollRunRepository.save(run);
            });
        }

        return ResponseEntity.ok(savedSlip);
    }

    @PostMapping("/disburse/{runId}")
    @Transactional
    public ResponseEntity<PayrollRun> disburseRun(
            @PathVariable Long runId,
            @RequestBody(required = false) Map<String, String> payload,
            HttpServletRequest request
    ) {
        String disbursedBy = payload != null && payload.get("disbursedBy") != null ? payload.get("disbursedBy") : "Administrator";
        LocalDate todayDate = LocalDate.now(BUSINESS_ZONE);
        Optional<PayrollRun> existing = payrollRunRepository.findById(runId);
        if (existing.isPresent() && "DISBURSED".equalsIgnoreCase(existing.get().getStatus())) {
            // Re-disbursing would overwrite the original payment date and disburser on every payslip
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This payroll run has already been disbursed.");
        }
        return existing.map(run -> {
            run.setStatus("DISBURSED");
            run.setDisbursedAt(todayDate);
            run.setDisbursedBy(disbursedBy);

            List<Payslip> slips = payslipRepository.findByPayrollRunId(runId);
            for (Payslip slip : slips) {
                slip.setPaymentStatus("PAID");
                slip.setPaymentDate(todayDate);
            }
            payslipRepository.saveAll(slips);

            PayrollRun saved = payrollRunRepository.save(run);
            saved.setPayslips(slips);
            recordAudit(request, "PAYROLL_DISBURSED", "Disbursed payroll for " + run.getMonth() + " " + run.getYear() + " (" + slips.size() + " payslips)");
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private static double nz(Double value) {
        return value != null ? value : 0.0;
    }

    private static boolean isManager(HttpServletRequest request) {
        return "MANAGER".equals(request.getAttribute(AuthFilter.ATTR_ROLE));
    }

    /** The center a signed-in manager runs; null for admins or managers without a center. */
    private Location managerLocation(HttpServletRequest request) {
        if (!isManager(request)) return null;
        Long id = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        if (id == null) return null;
        return employeeRepository.findById(id).map(Employee::getLocation).orElse(null);
    }

    private String managerCenter(HttpServletRequest request) {
        Location loc = managerLocation(request);
        return loc != null ? loc.getName() : null;
    }

    private void requireCenterAccess(HttpServletRequest request, String center) {
        if (!isManager(request)) return;
        String own = managerCenter(request);
        if (own == null || center == null || !center.equalsIgnoreCase(own)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only see payroll for your own center.");
        }
    }

    private static void updateRunTotals(PayrollRun run, List<Payslip> slips) {
        double gross = 0;
        double deductions = 0;
        double net = 0;
        for (Payslip s : slips) {
            gross += nz(s.getGrossMonthly());
            deductions += nz(s.getTotalDeductions());
            net += nz(s.getNetMonthly());
        }
        run.setTotalEmployees(slips.size());
        run.setTotalGrossPay(gross);
        run.setTotalDeductions(deductions);
        run.setTotalNetPay(net);
    }

    /**
     * Fills the full monthly earning lines and the person's fixed deductions.
     * With a salary breakdown on file, its lines are used as entered. Without one, the monthly salary
     * is split 50% basic, 25% house rent allowance and the rest as special allowance, so the lines
     * always add up to the salary. PF applies when the person has a PF number or a PF line.
     */
    private void applySalaryStructure(Payslip slip, Employee emp) {
        double monthly = emp.getMonthlySalary() != null ? Math.max(0.0, emp.getMonthlySalary()) : 0.0;

        List<Map<String, Object>> components = List.of();
        if (emp.getSalaryStructureJson() != null && !emp.getSalaryStructureJson().isBlank()) {
            try {
                List<Map<String, Object>> parsed = objectMapper.readValue(
                        emp.getSalaryStructureJson(), new TypeReference<List<Map<String, Object>>>() {});
                if (parsed != null) components = parsed;
            } catch (Exception e) {
                System.err.println("Could not read salary breakdown for " + emp.getEmail() + ": " + e.getMessage());
            }
        }

        double basic = 0, hra = 0, special = 0, conveyance = 0, medical = 0, tds = 0, pt = 0, other = 0;
        boolean pf = false;
        boolean esi = false;
        boolean anyEarning = false;
        for (Map<String, Object> comp : components) {
            String type = String.valueOf(comp.getOrDefault("type", "EARNING")).toUpperCase();
            String code = String.valueOf(comp.getOrDefault("code", "")).toUpperCase();
            String name = String.valueOf(comp.getOrDefault("name", "")).toUpperCase();
            double amt;
            try {
                amt = Math.max(0.0, Double.parseDouble(String.valueOf(comp.get("amount"))));
            } catch (Exception e) {
                amt = 0.0;
            }
            if ("DEDUCTION".equals(type)) {
                if (code.equals("PF") || name.contains("PROVIDENT") || name.contains("EPF")) pf = true; // worked out by rule
                else if (code.equals("ESI") || name.contains("STATE INSURANCE") || name.contains("ESI")) esi = true; // worked out by rule
                else if (code.equals("PT") || name.contains("PROFESSIONAL")) pt += amt;
                else if (code.equals("TDS") || name.contains("INCOME TAX") || name.contains("TDS")) tds += amt;
                else other += amt;
            } else {
                anyEarning = true;
                if (code.equals("BASIC") || name.contains("BASIC")) basic += amt;
                else if (code.equals("HRA") || name.contains("RENT")) hra += amt;
                else if (code.equals("CONVEYANCE") || name.contains("CONVEYANCE")) conveyance += amt;
                else if (code.equals("MEDICAL") || name.contains("MEDICAL")) medical += amt;
                else special += amt;
            }
        }

        if (!anyEarning || basic + hra + special + conveyance + medical <= 0) {
            basic = Math.round(monthly * 0.50);
            hra = Math.round(monthly * 0.25);
            special = Math.max(0.0, monthly - basic - hra);
            conveyance = 0;
            medical = 0;
        }

        slip.setBasic(basic);
        slip.setHra(hra);
        slip.setSpecialAllowance(special);
        slip.setConveyanceAllowance(conveyance);
        slip.setMedicalAllowance(medical);
        slip.setBonus(0.0);
        slip.setIncentives(0.0);
        slip.setTds(tds);
        slip.setOtherDeductions(other);
        slip.setHealthInsurance(0.0);
        slip.setPfApplicable(pf);
        slip.setEsiApplicable(esi);
        slip.setPtMonthly(pt);
    }

    private static final List<String> MONTH_NAMES = List.of(
            "january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"
    );

    /** Calendar month index (1-12) for "October", "Oct" or "2026-10"; 0 when unrecognised. */
    static int monthIndex(String month) {
        if (month == null) return 0;
        String m = month.trim().toLowerCase();
        int dash = m.lastIndexOf('-');
        if (dash >= 0 && dash < m.length() - 1) {
            try {
                int n = Integer.parseInt(m.substring(dash + 1));
                return (n >= 1 && n <= 12) ? n : 0;
            } catch (NumberFormatException ignored) {
                // not numeric, fall through to name matching
            }
        }
        for (int i = 0; i < MONTH_NAMES.size(); i++) {
            String name = MONTH_NAMES.get(i);
            if (m.equals(name) || (m.length() >= 3 && name.startsWith(m))) {
                return i + 1;
            }
        }
        return 0;
    }

    /** Newest pay cycle first. Month is stored as a name, so a DB sort would be alphabetical. */
    private static final Comparator<PayrollRun> RUN_NEWEST_FIRST = Comparator
            .comparingInt(PayrollRun::getYear)
            .thenComparingInt(r -> monthIndex(r.getMonth()))
            .thenComparing(r -> r.getId() != null ? r.getId() : 0L)
            .reversed();

    private static final Comparator<Payslip> SLIP_NEWEST_FIRST = Comparator
            .comparingInt(Payslip::getYear)
            .thenComparingInt(s -> monthIndex(s.getMonth()))
            .thenComparing(s -> s.getId() != null ? s.getId() : 0L)
            .reversed();

    private void recordAudit(HttpServletRequest request, String action, String details) {
        try {
            AuditLog log = new AuditLog();
            log.setAction(action);
            log.setModule("PAYROLL");
            log.setDetails(details);
            String email = (String) request.getAttribute(AuthFilter.ATTR_EMAIL);
            String role = (String) request.getAttribute(AuthFilter.ATTR_ROLE);
            log.setActorName(email != null ? email : "Administrator");
            log.setActorRole(role != null ? role : "ADMIN");
            log.setTimestamp(LocalDateTime.now(BUSINESS_ZONE).withNano(0));
            log.setIpAddress(request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1");
            auditLogRepository.save(log);
        } catch (Exception ignored) {}
    }
}
