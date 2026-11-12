package com.example.controller;

import com.example.entity.AuditLog;
import com.example.entity.Employee;
import com.example.entity.PayrollRun;
import com.example.entity.Payslip;
import com.example.repository.AuditLogRepository;
import com.example.repository.EmployeeRepository;
import com.example.repository.PayrollRunRepository;
import com.example.repository.PayslipRepository;
import com.example.security.AuthFilter;
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
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/runs")
    public ResponseEntity<List<PayrollRun>> getRuns() {
        List<PayrollRun> runs = new ArrayList<>(payrollRunRepository.findAll());
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
    public ResponseEntity<List<Payslip>> getPayslipsByRun(@PathVariable Long runId) {
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

        List<PayrollRun> existingRuns = payrollRunRepository.findByMonthIgnoreCaseAndYear(month, year);
        for (PayrollRun existing : existingRuns) {
            if ("DISBURSED".equalsIgnoreCase(existing.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Payroll for " + month + " " + year + " has already been finalized and disbursed."
                );
            }
        }
        // Replace existing unfinalized draft runs for the same pay cycle
        for (PayrollRun draft : existingRuns) {
            payslipRepository.deleteByPayrollRunId(draft.getId());
            payrollRunRepository.delete(draft);
        }

        // The admin is the owner, not salaried staff, so no payslip is generated for them
        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(emp -> !"TERMINATED".equalsIgnoreCase(emp.getStatus()))
                .filter(emp -> !"ADMIN".equalsIgnoreCase(emp.getRole()))
                .toList();

        PayrollRun run = new PayrollRun();
        run.setMonth(month);
        run.setYear(year);
        run.setTotalEmployees(employees.size());
        run.setStatus("DRAFT");
        run.setProcessedAt(LocalDate.now(BUSINESS_ZONE).toString());

        double totalGross = 0.0;
        double totalDeductions = 0.0;
        double totalNet = 0.0;

        PayrollRun savedRun = payrollRunRepository.save(run);
        List<Payslip> generatedSlips = new ArrayList<>();

        for (Employee emp : employees) {
            // No made-up default: staff without a salary on file get 0 and are flagged in Payroll and Reports
            double gross = emp.getMonthlySalary() != null ? emp.getMonthlySalary() : 0.0;
            boolean salarySet = gross > 0;
            double basic = Math.round(gross * 0.50);
            double hra = Math.round(gross * 0.30);
            double special = Math.round(gross * 0.10);
            double conveyance = salarySet ? 1600.0 : 0.0;
            double medical = salarySet ? 1250.0 : 0.0;
            double bonus = 0.0;
            double incentives = 0.0;

            double epfEmployee = Math.round(basic * 0.12);
            double epfEmployer = Math.round(basic * 0.12);
            double profTax = salarySet ? 200.0 : 0.0;
            double tds = Math.round(gross * 0.05);
            double healthIns = salarySet ? 500.0 : 0.0;
            double deductions = 0.0;
            boolean hasCustomDeductions = false;

            // Check if employee has a custom dynamic salary structure breakdown
            if (emp.getSalaryStructureJson() != null && !emp.getSalaryStructureJson().trim().isEmpty()) {
                try {
                    List<Map<String, Object>> components = objectMapper.readValue(
                            emp.getSalaryStructureJson(),
                            new TypeReference<List<Map<String, Object>>>() {}
                    );
                    if (components != null && !components.isEmpty()) {
                        boolean hasEarnings = components.stream().anyMatch(
                                c -> !"DEDUCTION".equalsIgnoreCase(String.valueOf(c.getOrDefault("type", "EARNING")))
                        );
                        boolean hasDeductions = components.stream().anyMatch(
                                c -> "DEDUCTION".equalsIgnoreCase(String.valueOf(c.getOrDefault("type", "EARNING")))
                        );

                        if (hasEarnings) {
                            basic = 0.0;
                            hra = 0.0;
                            special = 0.0;
                            conveyance = 0.0;
                            medical = 0.0;
                            bonus = 0.0;
                            incentives = 0.0;
                        }
                        if (hasDeductions) {
                            epfEmployee = 0.0;
                            epfEmployer = 0.0;
                            profTax = 0.0;
                            tds = 0.0;
                            healthIns = 0.0;
                            hasCustomDeductions = true;
                        }

                        double dynamicGross = 0.0;
                        double dynamicDeductions = 0.0;

                        for (Map<String, Object> comp : components) {
                            String type = comp.get("type") != null ? comp.get("type").toString().toUpperCase() : "EARNING";
                            String code = comp.get("code") != null ? comp.get("code").toString().toUpperCase() : "";
                            String name = comp.get("name") != null ? comp.get("name").toString().toUpperCase() : "";
                            double amt = 0.0;
                            try {
                                amt = Double.parseDouble(comp.get("amount").toString());
                            } catch (Exception ignored) {}

                            if ("DEDUCTION".equals(type)) {
                                dynamicDeductions += amt;
                                if (code.contains("PF") || name.contains("PROVIDENT") || name.contains("EPF")) {
                                    epfEmployee += amt;
                                    epfEmployer += amt;
                                } else if (code.contains("PT") || name.contains("PROFESSIONAL")) {
                                    profTax += amt;
                                } else if (code.contains("TDS") || name.contains("TAX")) {
                                    tds += amt;
                                } else if (code.contains("ESI") || name.contains("HEALTH") || name.contains("INSURANCE")) {
                                    healthIns += amt;
                                }
                            } else {
                                dynamicGross += amt;
                                if (code.contains("BASIC") || name.contains("BASIC")) {
                                    basic += amt;
                                } else if (code.contains("HRA") || name.contains("RENT")) {
                                    hra += amt;
                                } else if (code.contains("CONVEYANCE") || name.contains("TRAVEL")) {
                                    conveyance += amt;
                                } else if (code.contains("MEDICAL")) {
                                    medical += amt;
                                } else if (code.contains("BONUS") || name.contains("BONUS")) {
                                    bonus += amt;
                                } else if (code.contains("INCENTIVE") || name.contains("INCENTIVE")) {
                                    incentives += amt;
                                } else {
                                    special += amt;
                                }
                            }
                        }

                        if (hasEarnings && dynamicGross > 0) {
                            gross = dynamicGross;
                            if (!hasCustomDeductions) {
                                // Statutory defaults were computed from monthlySalary above; re-base them on the
                                // custom structure so EPF/TDS match the earnings actually being paid.
                                epfEmployee = Math.round(basic * 0.12);
                                epfEmployer = Math.round(basic * 0.12);
                                tds = Math.round(gross * 0.05);
                            }
                        }
                        if (hasCustomDeductions) {
                            deductions = dynamicDeductions;
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Could not parse salary structure for " + emp.getEmail() + ": " + e.getMessage());
                }
            }

            if (!hasCustomDeductions) {
                deductions = epfEmployee + profTax + tds + healthIns;
            }
            double net = Math.max(0.0, gross - deductions);

            totalGross += gross;
            totalDeductions += deductions;
            totalNet += net;

            Payslip slip = new Payslip();
            slip.setPayrollRunId(savedRun.getId());
            slip.setEmployeeId(emp.getId());
            slip.setEmployeeCode(emp.getEmployeeCode());
            slip.setEmployeeName(emp.getFullName());
            slip.setDesignation(emp.getJobTitle());
            slip.setDepartment(emp.getDepartment());
            slip.setLocation(emp.getLocationName());
            slip.setPanNumber(emp.getPanNumber() != null ? emp.getPanNumber() : "");
            slip.setUanNumber(emp.getUanNumber() != null ? emp.getUanNumber() : "");
            slip.setBankAccount(emp.getAccountNumber() != null ? emp.getAccountNumber() : "");
            slip.setBankName(emp.getBankName() != null ? emp.getBankName() : "");
            slip.setMonth(month);
            slip.setYear(year);
            slip.setPayableDays(30);
            slip.setLossOfPayDays(0);

            slip.setBasic(basic);
            slip.setHra(hra);
            slip.setSpecialAllowance(special);
            slip.setConveyanceAllowance(conveyance);
            slip.setMedicalAllowance(medical);
            slip.setBonus(bonus);
            slip.setIncentives(incentives);
            slip.setGrossMonthly(gross);
            slip.setEpfEmployee(epfEmployee);
            slip.setEpfEmployer(epfEmployer);
            slip.setProfessionalTax(profTax);
            slip.setTds(tds);
            slip.setHealthInsurance(healthIns);
            slip.setTotalDeductions(deductions);
            slip.setNetMonthly(net);
            slip.setCtcAnnual(emp.getCtcAnnual() != null ? emp.getCtcAnnual() : gross * 12);
            slip.setPaymentStatus("PENDING");
            slip.setPaymentMode("NEFT");

            generatedSlips.add(payslipRepository.save(slip));
        }

        savedRun.setTotalGrossPay(totalGross);
        savedRun.setTotalDeductions(totalDeductions);
        savedRun.setTotalNetPay(totalNet);
        PayrollRun persisted = payrollRunRepository.save(savedRun);
        persisted.setPayslips(generatedSlips);

        recordAudit(request, "PAYROLL_DRAFT_CREATED", "Generated draft payroll for " + month + " " + year + " (" + employees.size() + " staff)");
        return ResponseEntity.ok(persisted);
    }

    @PutMapping("/payslips/{id}/adjust")
    @Transactional
    public ResponseEntity<?> adjustPayslip(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        Optional<Payslip> opt = payslipRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Payslip slip = opt.get();
        if (slip.getPayrollRunId() != null) {
            Optional<PayrollRun> runOpt = payrollRunRepository.findById(slip.getPayrollRunId());
            if (runOpt.isPresent() && "DISBURSED".equalsIgnoreCase(runOpt.get().getStatus())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Cannot adjust payslips in an already disbursed payroll run."));
            }
        }

        // Snapshot the slip before applying changes. The stored gross is authoritative: the default component
        // split (50/30/10% + fixed allowances) does not sum exactly to gross, so re-deriving gross from components
        // here would silently change pay on any adjustment, even a notes-only edit.
        double prevSpecial = nz(slip.getSpecialAllowance());
        double prevBonus = nz(slip.getBonus());
        double prevIncentives = nz(slip.getIncentives());
        double prevBaseGross = Math.max(0.0, nz(slip.getGrossMonthly()) - prevBonus - prevIncentives);
        double prevLop = computeLopDeduction(prevBaseGross, slip.getPayableDays(), slip.getLossOfPayDays());
        double statutory = nz(slip.getEpfEmployee()) + nz(slip.getProfessionalTax())
                + nz(slip.getTds()) + nz(slip.getHealthInsurance());
        // Custom deduction components (loans, advances, ...) that are not one of the four statutory buckets
        double otherDeductions = Math.max(0.0, nz(slip.getTotalDeductions()) - statutory - prevLop);

        try {
            if (payload.containsKey("bonus")) {
                slip.setBonus(Math.max(0.0, Double.parseDouble(String.valueOf(payload.get("bonus")))));
            }
            if (payload.containsKey("incentives")) {
                slip.setIncentives(Math.max(0.0, Double.parseDouble(String.valueOf(payload.get("incentives")))));
            }
            if (payload.containsKey("specialAllowance")) {
                slip.setSpecialAllowance(Math.max(0.0, Double.parseDouble(String.valueOf(payload.get("specialAllowance")))));
            }
            if (payload.containsKey("lossOfPayDays")) {
                slip.setLossOfPayDays(Math.max(0, Math.min(31, Integer.parseInt(String.valueOf(payload.get("lossOfPayDays"))))));
            }
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Adjustment values must be numeric."));
        }
        if (payload.containsKey("notes")) {
            slip.setAdjustmentNotes(payload.get("notes") != null ? payload.get("notes").toString() : "");
        }

        double baseGross = Math.max(0.0, prevBaseGross + (nz(slip.getSpecialAllowance()) - prevSpecial));
        double updatedGross = baseGross + nz(slip.getBonus()) + nz(slip.getIncentives());
        slip.setGrossMonthly(updatedGross);

        double lopDeduction = computeLopDeduction(baseGross, slip.getPayableDays(), slip.getLossOfPayDays());
        double totalDeductions = statutory + otherDeductions + lopDeduction;
        slip.setTotalDeductions(totalDeductions);
        slip.setNetMonthly(Math.max(0.0, updatedGross - totalDeductions));

        Payslip savedSlip = payslipRepository.save(slip);

        // Synchronize parent PayrollRun totals
        if (savedSlip.getPayrollRunId() != null) {
            payrollRunRepository.findById(savedSlip.getPayrollRunId()).ifPresent(run -> {
                List<Payslip> allSlips = payslipRepository.findByPayrollRunId(run.getId());
                double totGross = 0;
                double totDed = 0;
                double totNet = 0;
                for (Payslip s : allSlips) {
                    totGross += s.getGrossMonthly() != null ? s.getGrossMonthly() : 0;
                    totDed += s.getTotalDeductions() != null ? s.getTotalDeductions() : 0;
                    totNet += s.getNetMonthly() != null ? s.getNetMonthly() : 0;
                }
                run.setTotalGrossPay(totGross);
                run.setTotalDeductions(totDed);
                run.setTotalNetPay(totNet);
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
        String todayStr = LocalDate.now(BUSINESS_ZONE).toString();
        Optional<PayrollRun> existing = payrollRunRepository.findById(runId);
        if (existing.isPresent() && "DISBURSED".equalsIgnoreCase(existing.get().getStatus())) {
            // Re-disbursing would overwrite the original payment date and disburser on every payslip
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This payroll run has already been disbursed.");
        }
        return existing.map(run -> {
            run.setStatus("DISBURSED");
            run.setDisbursedAt(todayStr);
            run.setDisbursedBy(disbursedBy);

            List<Payslip> slips = payslipRepository.findByPayrollRunId(runId);
            for (Payslip slip : slips) {
                slip.setPaymentStatus("PAID");
                slip.setPaymentDate(todayStr);
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

    private static double computeLopDeduction(double baseGross, int payableDays, int lossOfPayDays) {
        if (lossOfPayDays <= 0) return 0.0;
        return Math.round((baseGross / Math.max(1, payableDays)) * lossOfPayDays);
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
            log.setTimestamp(LocalDateTime.now(BUSINESS_ZONE).format(TS_FORMATTER));
            log.setIpAddress(request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1");
            auditLogRepository.save(log);
        } catch (Exception ignored) {}
    }
}
