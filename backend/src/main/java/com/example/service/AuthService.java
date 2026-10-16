package com.example.service;

import com.example.entity.Employee;
import com.example.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private ZeptoMailService zeptoMailService;

    public static class ResetTokenEntry {
        private final String email;
        private final String code;
        private final long expiresAt;

        public ResetTokenEntry(String email, String code, long expiresAt) {
            this.email = email;
            this.code = code;
            this.expiresAt = expiresAt;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }

        public String getEmail() {
            return email;
        }

        public String getCode() {
            return code;
        }
    }

    private final Map<String, ResetTokenEntry> emailToResetToken = new ConcurrentHashMap<>();
    private final Map<String, ResetTokenEntry> codeToResetToken = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public Map<String, Object> authenticate(String email, String password) {
        Map<String, Object> response = new HashMap<>();
        if (email == null || password == null) {
            response.put("success", false);
            response.put("message", "Email and password are required");
            return response;
        }

        Optional<Employee> empOpt = employeeRepository.findByEmail(email.trim().toLowerCase());
        if (empOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Invalid email address or user not found");
            return response;
        }

        Employee emp = empOpt.get();
        // Check password (allow default Admin@12345 or Welcome@2026 or matches)
        if (emp.getPassword() != null && !emp.getPassword().equals(password)) {
            response.put("success", false);
            response.put("message", "Invalid password");
            return response;
        }

        response.put("success", true);
        response.put("token", "mw_sess_" + System.currentTimeMillis() + "_" + emp.getId());
        response.put("mustChangePassword", emp.isMustChangePassword());
        response.put("role", emp.getRole() != null ? emp.getRole() : "EMPLOYEE");
        response.put("user", emp);
        return response;
    }

    public Map<String, Object> changePassword(String email, String currentPassword, String newPassword) {
        Map<String, Object> response = new HashMap<>();
        if (email == null || newPassword == null || newPassword.length() < 6) {
            response.put("success", false);
            response.put("message", "New password must be at least 6 characters");
            return response;
        }

        Optional<Employee> empOpt = employeeRepository.findByEmail(email.trim().toLowerCase());
        if (empOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "User not found");
            return response;
        }

        Employee emp = empOpt.get();
        // If currentPassword is provided and emp already has a password, verify it
        if (currentPassword != null && emp.getPassword() != null && !emp.getPassword().equals(currentPassword)) {
            response.put("success", false);
            response.put("message", "Current password does not match");
            return response;
        }

        emp.setPassword(newPassword);
        emp.setMustChangePassword(false);
        employeeRepository.save(emp);

        response.put("success", true);
        response.put("message", "Password updated successfully. You may now continue.");
        response.put("user", emp);
        return response;
    }

    public Map<String, Object> forgotPassword(String email, String portalUrl) {
        Map<String, Object> response = new HashMap<>();
        if (email == null || email.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Email address is required");
            return response;
        }

        String cleanEmail = email.trim().toLowerCase();
        Optional<Employee> empOpt = employeeRepository.findByEmail(cleanEmail);
        if (empOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "No account registered with this email address");
            return response;
        }

        Employee emp = empOpt.get();
        // Generate secure 6-digit verification code
        String code = String.format("%06d", secureRandom.nextInt(1000000));
        long expiresAt = System.currentTimeMillis() + (15 * 60 * 1000L); // 15 minutes validity

        ResetTokenEntry entry = new ResetTokenEntry(cleanEmail, code, expiresAt);
        emailToResetToken.put(cleanEmail, entry);
        codeToResetToken.put(code, entry);

        // Dispatch password recovery email via ZeptoMail
        boolean emailSent = zeptoMailService.sendPasswordResetEmail(emp.getEmail(), emp.getFullName(), code, portalUrl);

        response.put("success", true);
        response.put("message", "A 6-digit verification code has been dispatched to your email address.");
        response.put("emailSent", emailSent);
        response.put("email", cleanEmail);
        return response;
    }

    public Map<String, Object> resetPassword(String email, String code, String newPassword) {
        Map<String, Object> response = new HashMap<>();
        if (code == null || code.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Verification code is required");
            return response;
        }
        if (newPassword == null || newPassword.length() < 6) {
            response.put("success", false);
            response.put("message", "New password must be at least 6 characters");
            return response;
        }

        String cleanCode = code.trim();
        ResetTokenEntry entry = codeToResetToken.get(cleanCode);

        if (entry == null && email != null && !email.trim().isEmpty()) {
            entry = emailToResetToken.get(email.trim().toLowerCase());
        }

        if (entry == null || entry.isExpired()) {
            response.put("success", false);
            response.put("message", "Verification code is invalid or has expired. Please request a new code.");
            return response;
        }

        if (!entry.getCode().equalsIgnoreCase(cleanCode)) {
            response.put("success", false);
            response.put("message", "Invalid verification code");
            return response;
        }

        Optional<Employee> empOpt = employeeRepository.findByEmail(entry.getEmail());
        if (empOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "User account not found");
            return response;
        }

        Employee emp = empOpt.get();
        emp.setPassword(newPassword);
        emp.setMustChangePassword(false);
        employeeRepository.save(emp);

        // Invalidate tokens
        emailToResetToken.remove(entry.getEmail());
        codeToResetToken.remove(cleanCode);

        response.put("success", true);
        response.put("message", "Password has been successfully updated. You may now sign in.");
        response.put("email", emp.getEmail());
        return response;
    }
}
