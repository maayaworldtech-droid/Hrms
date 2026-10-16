package com.example.controller;

import com.example.entity.Employee;
import com.example.service.EmployeeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping({"/api/employees", "/employees"})
public class EmployeeController {

    @Autowired
    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    public ResponseEntity<List<Employee>> getAllEmployees() {
        return ResponseEntity.ok(employeeService.getAllEmployees());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        return employeeService.getEmployeeById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<Employee> getEmployeeByCode(@PathVariable String code) {
        return employeeService.getEmployeeByCode(code)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping({"", "/onboard", "/create"})
    public ResponseEntity<Employee> onboardEmployee(@RequestBody Employee employee, HttpServletRequest request) {
        String portalUrl = extractPortalUrl(request);
        Employee created = employeeService.onboardEmployee(employee, portalUrl);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateEmployee(@PathVariable Long id, @RequestBody Employee employee) {
        return employeeService.updateEmployee(id, employee)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        boolean deleted = employeeService.deleteEmployee(id);
        if (deleted) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/resend-email")
    public ResponseEntity<Map<String, Object>> resendEmail(@PathVariable Long id, HttpServletRequest request) {
        String portalUrl = extractPortalUrl(request);
        boolean sent = employeeService.resendWelcomeEmail(id, portalUrl);
        return ResponseEntity.ok(Map.of("success", sent, "message", sent ? "Email sent successfully" : "Failed to dispatch email"));
    }

    @PostMapping("/resend-email")
    public ResponseEntity<Map<String, Object>> resendEmailByQuery(@RequestParam String email, HttpServletRequest request) {
        String portalUrl = extractPortalUrl(request);
        boolean sent = employeeService.resendWelcomeEmailByEmail(email, portalUrl);
        return ResponseEntity.ok(Map.of("success", sent, "message", sent ? "Email sent successfully" : "Failed to dispatch email"));
    }

    private String extractPortalUrl(HttpServletRequest request) {
        if (request == null) return null;
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.trim().isEmpty() && !origin.equalsIgnoreCase("null")) {
            return origin.trim() + "/login";
        }
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.trim().isEmpty()) {
            try {
                URI uri = URI.create(referer);
                String scheme = uri.getScheme() != null ? uri.getScheme() : "http";
                String host = uri.getHost();
                int port = uri.getPort();
                if (host != null) {
                    String base = scheme + "://" + host + (port > 0 && port != 80 && port != 443 ? ":" + port : "");
                    return base + "/login";
                }
            } catch (Exception ignored) {}
        }
        return null;
    }
}
