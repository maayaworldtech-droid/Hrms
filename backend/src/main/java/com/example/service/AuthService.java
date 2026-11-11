package com.example.service;

import com.example.entity.Employee;
import com.example.repository.EmployeeRepository;
import com.example.security.AuthTokenService;
import com.example.security.PasswordHasher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AuthService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private ZeptoMailService zeptoMailService;

    @Autowired
    private AuthTokenService authTokenService;

    public static class ResetTokenEntry {
        private final String email;
        private final String code;
        private final long expiresAt;
        private final AtomicInteger attempts = new AtomicInteger(0);

        public ResetTokenEntry(String email, String code, long expiresAt) {
            this.email = email;
            this.code = code;
            this.expiresAt = expiresAt;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }

        public int incrementAttempts() {
            return attempts.incrementAndGet();
        }

        public String getEmail() {
            return email;
        }

        public String getCode() {
            return code;
        }
    }

    private static final int MAX_RESET_ATTEMPTS = 5;
    private final Map<String, ResetTokenEntry> emailToResetToken = new ConcurrentHashMap<>();
    private final Map<String, ResetTokenEntry> codeToResetToken = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public Map<String, Object> authenticate(String email, String password) {
        Map<String, Object> response = new HashMap<>();
        if (email == null || password == null || email.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Email and password are required");
            return response;
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<Employee> empOpt = employeeRepository.findByEmailIgnoreCase(normalizedEmail);
        if (empOpt.isEmpty() && ("admin@themaayaworld.com".equals(normalizedEmail) || "admin@maayaworld.com".equals(normalizedEmail))) {
            empOpt = employeeRepository.findByEmailIgnoreCase("shyamsundaryedla1@gmail.com");
        }
        if (empOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Invalid email address or password");
            return response;
        }

        Employee emp = empOpt.get();
        if ("TERMINATED".equalsIgnoreCase(emp.getStatus())) {
            response.put("success", false);
            response.put("message", "This account has been deactivated");
            return response;
        }

        if (emp.getPassword() == null || !PasswordHasher.matches(password, emp.getPassword())) {
            response.put("success", false);
            response.put("message", "Invalid email address or password");
            return response;
        }

        // Upgrade legacy plaintext passwords transparently to salted PBKDF2
        if (!PasswordHasher.isHashed(emp.getPassword())) {
            emp.setPassword(PasswordHasher.hash(password));
            emp = employeeRepository.save(emp);
        }

        String role = emp.getRole() != null ? emp.getRole().trim().toUpperCase() : "EMPLOYEE";
        String token = authTokenService.issueToken(emp.getId(), emp.getEmail(), role);

        response.put("success", true);
        response.put("token", token);
        response.put("mustChangePassword", emp.isMustChangePassword());
        response.put("role", role);
        response.put("user", emp);
        return response;
    }

    public Map<String, Object> changePassword(String email, String currentPassword, String newPassword) {
        Map<String, Object> response = new HashMap<>();
        if (email == null || email.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Email address is required");
            return response;
        }
        if (currentPassword == null || currentPassword.isEmpty()) {
            response.put("success", false);
            response.put("message", "Current password is required");
            return response;
        }
        if (newPassword == null || newPassword.length() < 6) {
            response.put("success", false);
            response.put("message", "New password must be at least 6 characters");
            return response;
        }

        Optional<Employee> empOpt = employeeRepository.findByEmailIgnoreCase(email.trim());
        if (empOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "User not found");
            return response;
        }

        Employee emp = empOpt.get();
        if (emp.getPassword() == null || !PasswordHasher.matches(currentPassword, emp.getPassword())) {
            response.put("success", false);
            response.put("message", "Current password does not match");
            return response;
        }

        emp.setPassword(PasswordHasher.hash(newPassword));
        emp.setMustChangePassword(false);
        Employee saved = employeeRepository.save(emp);

        response.put("success", true);
        response.put("message", "Password updated successfully. You may now continue.");
        response.put("user", saved);
        return response;
    }

    public Map<String, Object> forgotPassword(String email, String portalUrl) {
        Map<String, Object> response = new HashMap<>();
        if (email == null || email.trim().isEmpty()) {
            response.put("success", false);
            response.put("message", "Email address is required");
            return response;
        }

        evictExpiredResetTokens();
        String cleanEmail = email.trim().toLowerCase();
        Optional<Employee> empOpt = employeeRepository.findByEmailIgnoreCase(cleanEmail);
        if (empOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "No account registered with this email address");
            return response;
        }

        Employee emp = empOpt.get();
        ResetTokenEntry previous = emailToResetToken.remove(cleanEmail);
        if (previous != null) {
            codeToResetToken.remove(previous.getCode(), previous);
        }

        String code = String.format("%06d", secureRandom.nextInt(1000000));
        long expiresAt = System.currentTimeMillis() + (15 * 60 * 1000L);

        ResetTokenEntry entry = new ResetTokenEntry(cleanEmail, code, expiresAt);
        emailToResetToken.put(cleanEmail, entry);
        codeToResetToken.put(code, entry);

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

        evictExpiredResetTokens();
        String cleanCode = code.trim();
        String cleanEmail = (email != null && !email.trim().isEmpty()) ? email.trim().toLowerCase() : null;

        // Bind lookup strictly to email when email is provided
        ResetTokenEntry entry = cleanEmail != null
                ? emailToResetToken.get(cleanEmail)
                : codeToResetToken.get(cleanCode);

        if (entry == null || entry.isExpired()) {
            response.put("success", false);
            response.put("message", "Verification code is invalid or has expired. Please request a new code.");
            return response;
        }

        if (entry.incrementAttempts() > MAX_RESET_ATTEMPTS) {
            emailToResetToken.remove(entry.getEmail());
            codeToResetToken.remove(entry.getCode(), entry);
            response.put("success", false);
            response.put("message", "Too many invalid attempts. Please request a new verification code.");
            return response;
        }

        if (!entry.getCode().equals(cleanCode)) {
            response.put("success", false);
            response.put("message", "Invalid verification code");
            return response;
        }

        Optional<Employee> empOpt = employeeRepository.findByEmailIgnoreCase(entry.getEmail());
        if (empOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "User account not found");
            return response;
        }

        Employee emp = empOpt.get();
        emp.setPassword(PasswordHasher.hash(newPassword));
        emp.setMustChangePassword(false);
        employeeRepository.save(emp);

        emailToResetToken.remove(entry.getEmail());
        codeToResetToken.remove(entry.getCode(), entry);

        response.put("success", true);
        response.put("message", "Password has been successfully updated. You may now sign in.");
        response.put("email", emp.getEmail());
        return response;
    }

    private void evictExpiredResetTokens() {
        emailToResetToken.entrySet().removeIf(e -> e.getValue().isExpired());
        codeToResetToken.entrySet().removeIf(e -> e.getValue().isExpired());
    }
}
