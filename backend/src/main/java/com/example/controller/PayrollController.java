package com.example.controller;

import com.example.entity.Employee;
import com.example.entity.PayrollRun;
import com.example.entity.Payslip;
import com.example.repository.EmployeeRepository;
import com.example.repository.PayrollRunRepository;
import com.example.repository.PayslipRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/payroll")
public class PayrollController {

    @Autowired
    private PayrollRunRepository payrollRunRepository;

    @Autowired
    private PayslipRepository payslipRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

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
    public ResponseEntity<PayrollRun> processPayroll(@RequestBody Map<String, Object> payload) {
        String month = payload.get("month") != null ? payload.get("month").toString() : "October";
        int year = payload.get("year") != null ? Integer.parseInt(payload.get("year").toString()) : LocalDate.now().getYear();

        List<Employee> employees = employeeRepository.findAll();
        PayrollRun run = new PayrollRun();
        run.setMonth(month);
        run.setYear(year);
        run.setTotalEmployees(employees.size());
        run.setStatus("DISBURSED");
        run.setProcessedAt(LocalDate.now().toString());
        run.setDisbursedAt(LocalDate.now().toString());
        run.setDisbursedBy("Automated Payroll System");

        double totalGross = 0.0;
        double totalDeductions = 0.0;
        double totalNet = 0.0;

        PayrollRun savedRun = payrollRunRepository.save(run);

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

            // Check if employee has a custom dynamic salary structure breakdown
            if (emp.getSalaryStructureJson() != null && !emp.getSalaryStructureJson().trim().isEmpty()) {
                try {
                    List<Map<String, Object>> components = objectMapper.readValue(
                            emp.getSalaryStructureJson(),
                            new TypeReference<List<Map<String, Object>>>() {}
                    );
                    if (components != null && !components.isEmpty()) {
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
                                    epfEmployee = amt;
                                    epfEmployer = amt;
                                } else if (code.contains("PT") || name.contains("PROFESSIONAL")) {
                                    profTax = amt;
                                } else if (code.contains("TDS") || name.contains("TAX")) {
                                    tds = amt;
                                } else if (code.contains("ESI") || name.contains("HEALTH") || name.contains("INSURANCE")) {
                                    healthIns = amt;
                                }
                            } else {
                                dynamicGross += amt;
                                if (code.contains("BASIC") || name.contains("BASIC")) {
                                    basic = amt;
                                } else if (code.contains("HRA") || name.contains("RENT")) {
                                    hra = amt;
                                } else if (code.contains("CONVEYANCE") || name.contains("TRAVEL")) {
                                    conveyance = amt;
                                } else if (code.contains("MEDICAL")) {
                                    medical = amt;
                                } else if (code.contains("BONUS") || name.contains("BONUS")) {
                                    bonus = amt;
                                } else if (code.contains("INCENTIVE") || name.contains("INCENTIVE")) {
                                    incentives = amt;
                                } else {
                                    special += amt;
                                }
                            }
                        }

                        if (dynamicGross > 0) {
                            gross = dynamicGross;
                            deductions = dynamicDeductions;
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Could not parse salary structure for " + emp.getEmail() + ": " + e.getMessage());
                }
            }

            if (deductions == 0.0) {
                deductions = epfEmployee + profTax + tds + healthIns;
            }
            double net = gross - deductions;

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
            slip.setPanNumber(emp.getPanNumber() != null ? emp.getPanNumber() : "ABCDE1234F");
            slip.setUanNumber(emp.getUanNumber() != null ? emp.getUanNumber() : "100987654321");
            slip.setBankAccount(emp.getAccountNumber() != null ? emp.getAccountNumber() : "918273645281");
            slip.setBankName(emp.getBankName() != null ? emp.getBankName() : "HDFC Bank");
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
            slip.setPaymentStatus("PAID");
            slip.setPaymentDate(LocalDate.now().toString());
            slip.setPaymentMode("NEFT");

            payslipRepository.save(slip);
        }

        savedRun.setTotalGrossPay(totalGross);
        savedRun.setTotalDeductions(totalDeductions);
        savedRun.setTotalNetPay(totalNet);

        return ResponseEntity.ok(payrollRunRepository.save(savedRun));
    }

    @PutMapping("/payslips/{id}/adjust")
    public ResponseEntity<Payslip> adjustPayslip(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        return payslipRepository.findById(id).map(slip -> {
            if (payload.containsKey("bonus")) {
                slip.setBonus(Double.parseDouble(payload.get("bonus").toString()));
            }
            if (payload.containsKey("incentives")) {
                slip.setIncentives(Double.parseDouble(payload.get("incentives").toString()));
            }
            if (payload.containsKey("specialAllowance")) {
                slip.setSpecialAllowance(Double.parseDouble(payload.get("specialAllowance").toString()));
            }
            if (payload.containsKey("lossOfPayDays")) {
                slip.setLossOfPayDays(Integer.parseInt(payload.get("lossOfPayDays").toString()));
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

            double updatedGross = basic + hra + special + conveyance + medical + bonus + incentives;
            slip.setGrossMonthly(updatedGross);

            double epf = slip.getEpfEmployee() != null ? slip.getEpfEmployee() : 0.0;
            double pt = slip.getProfessionalTax() != null ? slip.getProfessionalTax() : 0.0;
            double tds = slip.getTds() != null ? slip.getTds() : 0.0;
            double health = slip.getHealthInsurance() != null ? slip.getHealthInsurance() : 0.0;
            double lopDeduction = 0.0;
            if (slip.getLossOfPayDays() > 0) {
                double perDay = (basic + hra) / 30.0;
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
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/disburse/{runId}")
    public ResponseEntity<PayrollRun> disburseRun(@PathVariable Long runId, @RequestBody(required = false) Map<String, String> payload) {
        String disbursedBy = payload != null && payload.get("disbursedBy") != null ? payload.get("disbursedBy") : "Administrator";
        return payrollRunRepository.findById(runId).map(run -> {
            run.setStatus("DISBURSED");
            run.setDisbursedAt(LocalDate.now().toString());
            run.setDisbursedBy(disbursedBy);
            return ResponseEntity.ok(payrollRunRepository.save(run));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
