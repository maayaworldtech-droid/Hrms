package com.example.controller;

import com.example.entity.Employee;
import com.example.security.AuthFilter;
import com.example.security.PortalUrlResolver;
import com.example.service.EmployeeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final PortalUrlResolver portalUrlResolver;

    private final ObjectMapper objectMapper;
    private final com.example.service.StaffNotices staffNotices;

    public EmployeeController(EmployeeService employeeService, PortalUrlResolver portalUrlResolver, ObjectMapper objectMapper,
                              com.example.service.StaffNotices staffNotices) {
        this.employeeService = employeeService;
        this.portalUrlResolver = portalUrlResolver;
        this.objectMapper = objectMapper;
        this.staffNotices = staffNotices;
    }

    /**
     * The list leaves out the saved face photo and face measurements (about 90 KB per person),
     * so a center of 40 people does not send megabytes on every page load. It says whether a
     * face is saved instead; open one employee to get the photo.
     */
    @GetMapping
    public ResponseEntity<List<ObjectNode>> getAllEmployees() {
        List<ObjectNode> rows = employeeService.getAllEmployees().stream().map(emp -> {
            ObjectNode node = objectMapper.valueToTree(emp);
            node.remove("enrolledFacePhoto");
            node.remove("enrolledFaceBiometrics");
            node.put("hasFacePhoto", emp.getEnrolledFacePhoto() != null && !emp.getEnrolledFacePhoto().isBlank());
            return node;
        }).toList();
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Employee> getEmployeeById(@PathVariable Long id) {
        return employeeService.getEmployeeById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping({"", "/onboard", "/create"})
    public ResponseEntity<Employee> onboardEmployee(@RequestBody Employee employee, HttpServletRequest request) {
        // A client-supplied id would turn this insert into an overwrite of an existing employee row
        employee.setId(null);
        String portalUrl = extractPortalUrl(request);
        Employee created = employeeService.onboardEmployee(employee, portalUrl);
        if (created.getId() != null && !"ADMIN".equals(created.getRole())) {
            staffNotices.welcome(created);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Employee> updateEmployee(
            @PathVariable Long id,
            @RequestBody Employee employee,
            HttpServletRequest request
    ) {
        String authRole = (String) request.getAttribute(AuthFilter.ATTR_ROLE);
        Long authId = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        if (!"ADMIN".equals(authRole)) {
            if (authId == null || !authId.equals(id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            // Non-admin self-updates are restricted strictly to contact details
            Employee safeUpdate = new Employee();
            safeUpdate.setPhone(employee.getPhone());
            safeUpdate.setAddress(employee.getAddress());
            return employeeService.updateEmployee(id, safeUpdate)
                    .map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.notFound().build());
        }
        String centerBefore = employeeService.getEmployeeById(id).map(Employee::getLocationName).orElse(null);
        return employeeService.updateEmployee(id, employee)
                .map(updated -> {
                    String centerAfter = updated.getLocationName();
                    if (centerAfter != null && !centerAfter.equalsIgnoreCase(centerBefore == null ? "" : centerBefore)) {
                        staffNotices.centerChanged(updated, centerAfter);
                    }
                    return ResponseEntity.ok(updated);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/enroll-face")
    public ResponseEntity<Map<String, Object>> enrollFaceBiometrics(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            HttpServletRequest request
    ) {
        String authRole = (String) request.getAttribute(AuthFilter.ATTR_ROLE);
        Long authId = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        // Only the admin saves or replaces the face used for check-in. Staff cannot change their own,
        // otherwise anyone could register a different face and check in for someone else.
        if (!"ADMIN".equals(authRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("success", false, "message", "Ask your admin to update the face used for check-in."));
        }

        String facePhoto = payload.get("enrolledFacePhoto");
        String faceBiometrics = payload.get("enrolledFaceBiometrics");
        return employeeService.getEmployeeById(id).map(emp -> {
            if (facePhoto != null && !facePhoto.trim().isEmpty()) {
                emp.setEnrolledFacePhoto(facePhoto);
            }
            if (faceBiometrics != null && !faceBiometrics.trim().isEmpty()) {
                emp.setEnrolledFaceBiometrics(faceBiometrics);
            }
            Employee updated = employeeService.saveEmployee(emp);
            if (!"ADMIN".equals(updated.getRole())) staffNotices.faceUpdated(updated);
            return ResponseEntity.ok(Map.<String, Object>of(
                    "success", true,
                    "message", "Face biometrics enrolled successfully",
                    "employeeId", updated.getId(),
                    "enrolledFacePhoto", updated.getEnrolledFacePhoto() != null ? updated.getEnrolledFacePhoto() : ""
            ));
        }).orElseGet(() -> ResponseEntity.notFound().build());
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
        String origin = portalUrlResolver.resolveTrustedOrigin(request);
        return origin != null ? origin + "/login" : null;
    }
}
