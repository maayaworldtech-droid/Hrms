package com.example.controller;

import com.example.entity.Employee;
import com.example.entity.PayrollRun;
import com.example.entity.Payslip;
import com.example.repository.EmployeeRepository;
import com.example.repository.PayrollRunRepository;
import com.example.repository.PayslipRepository;
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

            double epfEmployee = Math.round(basic * 0.12);
            double epfEmployer = Math.round(basic * 0.12);
            double profTax = 200.0;
            double tds = Math.round(gross * 0.05);
            double healthIns = 500.0;

            double deductions = epfEmployee + profTax + tds + healthIns;
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
