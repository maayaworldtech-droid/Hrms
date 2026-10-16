package com.example.service;

import com.example.entity.Employee;
import com.example.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private EmployeeRepository employeeRepository;

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
}
