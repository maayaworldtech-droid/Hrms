package com.example.service;

import com.example.entity.Employee;
import com.example.entity.LeaveBalance;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveBalanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class EmployeeServiceImpl implements EmployeeService {

    @Autowired
    private final EmployeeRepository employeeRepository;

    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;

    @Autowired
    private ZeptoMailService zeptoMailService;

    public EmployeeServiceImpl(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @Override
    public List<Employee> getAllEmployees() {
        return employeeRepository.findAll();
    }

    @Override
    public Optional<Employee> getEmployeeById(Long id) {
        return employeeRepository.findById(id);
    }

    @Override
    public Optional<Employee> getEmployeeByCode(String code) {
        return employeeRepository.findByEmployeeCode(code);
    }

    @Override
    public Optional<Employee> getEmployeeByEmail(String email) {
        return employeeRepository.findByEmail(email);
    }

    @Override
    public Employee createEmployee(Employee employee) {
        return onboardEmployee(employee);
    }

    @Override
    public Employee onboardEmployee(Employee employee) {
        // Auto-generate employee code if missing or empty
        if (employee.getEmployeeCode() == null || employee.getEmployeeCode().trim().isEmpty()) {
            long count = employeeRepository.count();
            String nextCode = String.format("MW-%04d", 1001 + count);
            while (employeeRepository.existsByEmployeeCode(nextCode)) {
                count++;
                nextCode = String.format("MW-%04d", 1001 + count);
            }
            employee.setEmployeeCode(nextCode);
        }

        // Auto-generate secure temporary password if not provided
        String plainPassword = employee.getPassword();
        if (plainPassword == null || plainPassword.trim().isEmpty()) {
            int randomDigits = 1000 + new Random().nextInt(9000);
            plainPassword = "Maaya@" + randomDigits;
            employee.setPassword(plainPassword);
        }

        // Force password change on first login
        employee.setMustChangePassword(true);

        if (employee.getRole() == null || employee.getRole().trim().isEmpty()) {
            employee.setRole("EMPLOYEE");
        }
        if (employee.getStatus() == null || employee.getStatus().trim().isEmpty()) {
            employee.setStatus("ACTIVE");
        }
        if (employee.getEmploymentType() == null || employee.getEmploymentType().trim().isEmpty()) {
            employee.setEmploymentType("FULL_TIME");
        }

        // Save employee to PostgreSQL
        Employee saved = employeeRepository.save(employee);

        // Initialize Leave Balance for this employee
        if (leaveBalanceRepository.findByEmployeeId(saved.getId()).isEmpty()) {
            LeaveBalance balance = new LeaveBalance();
            balance.setEmployeeId(saved.getId());
            balance.setCasualTotal(12);
            balance.setCasualUsed(0);
            balance.setSickTotal(10);
            balance.setSickUsed(0);
            balance.setEarnedTotal(18);
            balance.setEarnedUsed(0);
            balance.setCompOffTotal(2);
            balance.setCompOffUsed(0);
            leaveBalanceRepository.save(balance);
        }

        // Send onboarding email via ZeptoMail
        final String email = saved.getEmail();
        final String fullName = saved.getFullName();
        final String code = saved.getEmployeeCode();
        final String pwd = plainPassword;

        new Thread(() -> {
            try {
                boolean sent = zeptoMailService.sendOnboardingEmail(email, fullName, code, pwd);
                System.out.println("Onboarding email status for " + email + ": " + (sent ? "SENT" : "FAILED_OR_SIMULATED"));
            } catch (Exception e) {
                System.err.println("Could not dispatch onboarding email for " + email + ": " + e.getMessage());
            }
        }).start();

        return saved;
    }

    @Override
    public Optional<Employee> updateEmployee(Long id, Employee student) {
        return employeeRepository.findById(id).map(existing -> {
            if (student.getEmployeeCode() != null) existing.setEmployeeCode(student.getEmployeeCode());
            if (student.getFirstName() != null) existing.setFirstName(student.getFirstName());
            if (student.getLastName() != null) existing.setLastName(student.getLastName());
            if (student.getEmail() != null) existing.setEmail(student.getEmail());
            if (student.getPhone() != null) existing.setPhone(student.getPhone());
            if (student.getAddress() != null) existing.setAddress(student.getAddress());
            if (student.getJobTitle() != null) existing.setJobTitle(student.getJobTitle());
            if (student.getDepartment() != null) existing.setDepartment(student.getDepartment());
            if (student.getManagerId() != null) existing.setManagerId(student.getManagerId());
            if (student.getEmploymentType() != null) existing.setEmploymentType(student.getEmploymentType());
            if (student.getStatus() != null) existing.setStatus(student.getStatus());
            if (student.getShift() != null) existing.setShift(student.getShift());
            if (student.getDateOfJoining() != null) existing.setDateOfJoining(student.getDateOfJoining());
            if (student.getMonthlySalary() != null) existing.setMonthlySalary(student.getMonthlySalary());
            if (student.getCtcAnnual() != null) existing.setCtcAnnual(student.getCtcAnnual());
            if (student.getRole() != null) existing.setRole(student.getRole());
            
            // Bank details
            if (student.getAccountNumber() != null) existing.setAccountNumber(student.getAccountNumber());
            if (student.getIfscCode() != null) existing.setIfscCode(student.getIfscCode());
            if (student.getBankName() != null) existing.setBankName(student.getBankName());
            if (student.getPanNumber() != null) existing.setPanNumber(student.getPanNumber());
            if (student.getUanNumber() != null) existing.setUanNumber(student.getUanNumber());

            // Emergency contact
            if (student.getEmergencyContactName() != null) existing.setEmergencyContactName(student.getEmergencyContactName());
            if (student.getEmergencyContactPhone() != null) existing.setEmergencyContactPhone(student.getEmergencyContactPhone());
            if (student.getEmergencyContactRelationship() != null) existing.setEmergencyContactRelationship(student.getEmergencyContactRelationship());

            if (student.getLocation() != null) {
                existing.setLocation(student.getLocation());
            }
            return employeeRepository.save(existing);
        });
    }

    @Override
    public boolean deleteEmployee(Long id) {
        if (employeeRepository.existsById(id)) {
            employeeRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
