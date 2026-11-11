package com.example.service;

import com.example.entity.Employee;
import com.example.entity.LeaveBalance;
import com.example.entity.Location;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveBalanceRepository;
import com.example.repository.LocationRepository;
import com.example.security.PasswordHasher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;

@Service
public class EmployeeServiceImpl implements EmployeeService {

    @Autowired
    private final EmployeeRepository employeeRepository;

    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private ZeptoMailService zeptoMailService;

    private final SecureRandom secureRandom = new SecureRandom();

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
        if (email == null) return Optional.empty();
        return employeeRepository.findByEmailIgnoreCase(email.trim());
    }

    @Override
    public Employee createEmployee(Employee employee) {
        return onboardEmployee(employee);
    }

    @Override
    public Employee saveEmployee(Employee employee) {
        return employeeRepository.save(employee);
    }

    @Override
    public Employee onboardEmployee(Employee employee) {
        return onboardEmployee(employee, null);
    }

    @Override
    public Employee onboardEmployee(Employee employee, String portalUrl) {
        if (employee.getEmail() == null || employee.getEmail().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }
        String normalizedEmail = employee.getEmail().trim().toLowerCase();
        if (employeeRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An employee with this email already exists.");
        }
        employee.setEmail(normalizedEmail);
        Employee target = employee;

        // Resolve existing Location row rather than creating duplicate rows
        resolveAndAttachLocation(target, employee.getLocationName());

        // Auto-generate employee code if missing or empty
        if (target.getEmployeeCode() == null || target.getEmployeeCode().trim().isEmpty()) {
            long count = employeeRepository.count();
            String nextCode = String.format("MW-%04d", 1001 + count);
            while (employeeRepository.existsByEmployeeCode(nextCode)) {
                count++;
                nextCode = String.format("MW-%04d", 1001 + count);
            }
            target.setEmployeeCode(nextCode);
        }

        // Auto-generate secure temporary password if not provided
        String plainPassword = employee.getPassword();
        if (plainPassword == null || plainPassword.trim().isEmpty()) {
            int randomDigits = 100000 + secureRandom.nextInt(900000);
            plainPassword = "Maaya@" + randomDigits;
        }
        target.setPassword(PasswordHasher.hash(plainPassword));
        target.setMustChangePassword(true);

        if (target.getRole() == null || target.getRole().trim().isEmpty()) {
            target.setRole("EMPLOYEE");
        }
        if (target.getStatus() == null || target.getStatus().trim().isEmpty()) {
            target.setStatus("ACTIVE");
        }
        if (target.getEmploymentType() == null || target.getEmploymentType().trim().isEmpty()) {
            target.setEmploymentType("FULL_TIME");
        }

        // Save employee to PostgreSQL
        Employee saved = employeeRepository.save(target);
        saved.setTemporaryPassword(plainPassword);

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
        final String targetUrl = portalUrl;

        new Thread(() -> {
            try {
                boolean sent = zeptoMailService.sendOnboardingEmail(email, fullName, code, pwd, targetUrl);
                System.out.println("Onboarding email status for " + email + ": " + (sent ? "SENT" : "FAILED_OR_SIMULATED"));
            } catch (Exception e) {
                System.err.println("Could not dispatch onboarding email for " + email + ": " + e.getMessage());
            }
        }).start();

        return saved;
    }

    @Override
    public boolean resendWelcomeEmail(Long id) {
        return resendWelcomeEmail(id, null);
    }

    @Override
    public boolean resendWelcomeEmail(Long id, String portalUrl) {
        return employeeRepository.findById(id).map(emp -> sendWelcomeEmailToEmployee(emp, portalUrl)).orElse(false);
    }

    @Override
    public boolean resendWelcomeEmailByEmail(String email) {
        return resendWelcomeEmailByEmail(email, null);
    }

    @Override
    public boolean resendWelcomeEmailByEmail(String email, String portalUrl) {
        if (email == null || email.trim().isEmpty()) return false;
        return employeeRepository.findByEmailIgnoreCase(email.trim()).map(emp -> sendWelcomeEmailToEmployee(emp, portalUrl)).orElse(false);
    }

    private boolean sendWelcomeEmailToEmployee(Employee emp, String portalUrl) {
        int randomDigits = 100000 + secureRandom.nextInt(900000);
        String pwd = "Maaya@" + randomDigits;
        emp.setPassword(PasswordHasher.hash(pwd));
        emp.setMustChangePassword(true);
        employeeRepository.save(emp);
        return zeptoMailService.sendOnboardingEmail(emp.getEmail(), emp.getFullName(), emp.getEmployeeCode(), pwd, portalUrl);
    }

    @Override
    public Optional<Employee> updateEmployee(Long id, Employee updates) {
        return employeeRepository.findById(id).map(existing -> {
            if (updates.getEmployeeCode() != null) existing.setEmployeeCode(updates.getEmployeeCode());
            if (updates.getFirstName() != null) existing.setFirstName(updates.getFirstName());
            if (updates.getLastName() != null) existing.setLastName(updates.getLastName());
            if (updates.getEmail() != null && !updates.getEmail().trim().isEmpty()) {
                existing.setEmail(updates.getEmail().trim().toLowerCase());
            }
            if (updates.getPhone() != null) existing.setPhone(updates.getPhone());
            if (updates.getAddress() != null) existing.setAddress(updates.getAddress());
            if (updates.getJobTitle() != null) existing.setJobTitle(updates.getJobTitle());
            if (updates.getDepartment() != null) existing.setDepartment(updates.getDepartment());
            if (updates.getManagerId() != null) existing.setManagerId(updates.getManagerId());
            if (updates.getManagerName() != null) existing.setManagerName(updates.getManagerName());
            if (updates.getEmploymentType() != null) existing.setEmploymentType(updates.getEmploymentType());
            if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
            if (updates.getShift() != null) existing.setShift(updates.getShift());
            if (updates.getDateOfJoining() != null) existing.setDateOfJoining(updates.getDateOfJoining());
            if (updates.getMonthlySalary() != null) existing.setMonthlySalary(updates.getMonthlySalary());
            if (updates.getCtcAnnual() != null) existing.setCtcAnnual(updates.getCtcAnnual());
            if (updates.getRole() != null) existing.setRole(updates.getRole());

            // Bank details
            if (updates.getAccountNumber() != null) existing.setAccountNumber(updates.getAccountNumber());
            if (updates.getIfscCode() != null) existing.setIfscCode(updates.getIfscCode());
            if (updates.getBankName() != null) existing.setBankName(updates.getBankName());
            if (updates.getPanNumber() != null) existing.setPanNumber(updates.getPanNumber());
            if (updates.getUanNumber() != null) existing.setUanNumber(updates.getUanNumber());

            // Health & Emergency
            if (updates.getBloodGroup() != null) existing.setBloodGroup(updates.getBloodGroup());
            if (updates.getEmergencyContactName() != null) existing.setEmergencyContactName(updates.getEmergencyContactName());
            if (updates.getEmergencyContactPhone() != null) existing.setEmergencyContactPhone(updates.getEmergencyContactPhone());
            if (updates.getEmergencyContactRelationship() != null) existing.setEmergencyContactRelationship(updates.getEmergencyContactRelationship());

            // Dynamic Salary Structure
            if (updates.getSalaryStructureJson() != null) existing.setSalaryStructureJson(updates.getSalaryStructureJson());

            if (updates.getLocation() != null && updates.getLocation().getName() != null) {
                resolveAndAttachLocation(existing, updates.getLocation().getName());
            }

            if (updates.getEnrolledFacePhoto() != null) {
                existing.setEnrolledFacePhoto(updates.getEnrolledFacePhoto());
            }
            if (updates.getEnrolledFaceBiometrics() != null) {
                existing.setEnrolledFaceBiometrics(updates.getEnrolledFaceBiometrics());
            }

            return employeeRepository.save(existing);
        });
    }

    private void resolveAndAttachLocation(Employee target, String locationName) {
        if (locationName == null || locationName.trim().isEmpty()) return;
        String cleanName = locationName.trim();
        Location loc = locationRepository.findByNameIgnoreCase(cleanName)
                .orElseGet(() -> locationRepository.save(new Location(cleanName)));
        target.setLocation(loc);
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
