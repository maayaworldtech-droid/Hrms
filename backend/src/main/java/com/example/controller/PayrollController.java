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
        return ResponseEntity.ok(payrollRunRepository.findAllByOrderByYearDescMonthDesc());
    }

    @GetMapping("/payslips/{employeeId}")
    public ResponseEntity<List<Payslip>> getPayslipsByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(payslipRepository.findByEmployeeIdOrderByYearDescMonthDesc(employeeId));
    }

    @GetMapping("/payslips/run/{runId}")
    public ResponseEntity<List<Payslip>> getPayslipsByRun(@PathVariable Long runId) {
        return ResponseEntity.ok(payslipRepository.findByPayrollRunId(runId));
    }

    @PostMapping("/process")
    @Transactional
    public ResponseEntity<PayrollRun> processPayroll(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        String month = payload.get("month") != null ? payload.get("month").toString().trim() : "October";
        int year = payload.get("year") != null ? Integer.parseInt(payload.get("year").toString()) : LocalDate.now(BUSINESS_ZONE).getYear();

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

        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(emp -> !"TERMINATED".equalsIgnoreCase(emp.getStatus()))
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
            double gross = emp.getMonthlySalary() != null ? emp.getMonthlySalary() : 35000.0;
            double basic = Math.round(gross * 0.50);
            double hra = Math.round(gross * 0.30);
            double special = Math.round(gross * 0.10);
            double conveyance = 1600.0;
            double medical = 1250.0;
            double bonus = 0.0;
            double incentives = 0.0;

            double epfEmployee = Math.round(basic * 0.12);
            double epfEmployer = Math.round(basic * 0.12);
            double profTax = 200.0;
            double tds = Math.round(gross * 0.05);
            double healthIns = 500.0;
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

        if (payload.containsKey("bonus")) {
            slip.setBonus(Math.max(0.0, Double.parseDouble(payload.get("bonus").toString())));
        }
        if (payload.containsKey("incentives")) {
            slip.setIncentives(Math.max(0.0, Double.parseDouble(payload.get("incentives").toString())));
        }
        if (payload.containsKey("specialAllowance")) {
            slip.setSpecialAllowance(Math.max(0.0, Double.parseDouble(payload.get("specialAllowance").toString())));
        }
        if (payload.containsKey("lossOfPayDays")) {
            slip.setLossOfPayDays(Math.max(0, Math.min(31, Integer.parseInt(payload.get("lossOfPayDays").toString()))));
        }
        if (payload.containsKey("notes")) {
            slip.setAdjustmentNotes(payload.get("notes") != null ? payload.get("notes").toString() : "");
        }

        double basic = slip.getBasic() != null ? slip.getBasic() : 0.0;
        double hra = slip.getHra() != null ? slip.getHra() : 0.0;
        double special = slip.getSpecialAllowance() != null ? slip.getSpecialAllowance() : 0.0;
        double conveyance = slip.getConveyanceAllowance() != null ? slip.getConveyanceAllowance() : 0.0;
        double medical = slip.getMedicalAllowance() != null ? slip.getMedicalAllowance() : 0.0;
        double bonus = slip.getBonus() != null ? slip.getBonus() : 0.0;
        double incentives = slip.getIncentives() != null ? slip.getIncentives() : 0.0;

        double baseGross = basic + hra + special + conveyance + medical;
        double updatedGross = baseGross + bonus + incentives;
        slip.setGrossMonthly(updatedGross);

        double epf = slip.getEpfEmployee() != null ? slip.getEpfEmployee() : 0.0;
        double pt = slip.getProfessionalTax() != null ? slip.getProfessionalTax() : 0.0;
        double tds = slip.getTds() != null ? slip.getTds() : 0.0;
        double health = slip.getHealthInsurance() != null ? slip.getHealthInsurance() : 0.0;
        double lopDeduction = 0.0;
        if (slip.getLossOfPayDays() > 0) {
            int payableDays = Math.max(1, slip.getPayableDays());
            double perDay = baseGross / payableDays;
            lopDeduction = Math.round(perDay * slip.getLossOfPayDays());
        }

        double totalDeductions = epf + pt + tds + health + lopDeduction;
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
        return payrollRunRepository.findById(runId).map(run -> {
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
