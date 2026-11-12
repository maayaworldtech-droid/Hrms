package com.example.controller;

import com.example.entity.Employee;
import com.example.entity.Location;
import com.example.repository.EmployeeRepository;
import com.example.service.AuditService;
import com.example.service.CenterService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Centers and their managers. Reading is open to any signed-in user (employees need their center's
 * check-in geofence); every change is admin-only, enforced in AuthFilter.
 */
@RestController
@RequestMapping("/api/centers")
public class CenterController {

    private final CenterService centerService;
    private final EmployeeRepository employeeRepository;
    private final AuditService auditService;

    public CenterController(CenterService centerService, EmployeeRepository employeeRepository, AuditService auditService) {
        this.centerService = centerService;
        this.employeeRepository = employeeRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(centerService.listWithStaff());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Location created = centerService.create(body);
        auditService.record(request, "CENTERS", "CENTER_CREATED", "Created center " + created.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(centerService.toView(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable int id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request
    ) {
        StringBuilder previousName = new StringBuilder();
        Location updated = centerService.update(id, body, previousName);
        String details = previousName.toString().equals(updated.getName())
                ? "Updated details of " + updated.getName()
                : "Renamed center " + previousName + " to " + updated.getName();
        auditService.record(request, "CENTERS", "CENTER_UPDATED", details);
        return ResponseEntity.ok(centerService.toView(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable int id, HttpServletRequest request) {
        Location removed = centerService.delete(id);
        auditService.record(request, "CENTERS", "CENTER_DELETED", "Deleted center " + removed.getName());
        return ResponseEntity.noContent().build();
    }

    /** Makes an existing employee a manager of this center (also moves them to this center). */
    @PostMapping("/{id}/managers")
    public ResponseEntity<Map<String, Object>> addManager(
            @PathVariable int id,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request
    ) {
        Location center = centerService.getById(id);
        Employee emp = findEmployee(body.get("employeeId"));
        if ("TERMINATED".equalsIgnoreCase(emp.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, emp.getFullName() + "'s account is deactivated. Reactivate it first.");
        }
        if ("ADMIN".equalsIgnoreCase(emp.getRole())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, emp.getFullName() + " is an administrator and already has full access.");
        }
        emp.setRole("MANAGER");
        emp.setLocation(center);
        employeeRepository.save(emp);
        auditService.record(request, "CENTERS", "MANAGER_ASSIGNED",
                emp.getFullName() + " made manager of " + center.getName());
        return ResponseEntity.ok(centerService.toView(center));
    }

    /**
     * Removes a manager from this center. action=demote keeps them as regular staff;
     * action=deactivate also blocks their sign-in (status TERMINATED). Neither deletes history.
     */
    @DeleteMapping("/{id}/managers/{employeeId}")
    public ResponseEntity<Map<String, Object>> removeManager(
            @PathVariable int id,
            @PathVariable Long employeeId,
            @RequestParam(defaultValue = "demote") String action,
            HttpServletRequest request
    ) {
        Location center = centerService.getById(id);
        Employee emp = findEmployee(employeeId);
        if (emp.getLocation() == null || emp.getLocation().getLocationId() != id || !"MANAGER".equalsIgnoreCase(emp.getRole())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, emp.getFullName() + " is not a manager of " + center.getName() + ".");
        }
        Long selfId = (Long) request.getAttribute(com.example.security.AuthFilter.ATTR_EMPLOYEE_ID);
        if (selfId != null && selfId.equals(emp.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot remove your own access.");
        }

        emp.setRole("EMPLOYEE");
        String outcome = "changed to regular staff";
        if ("deactivate".equalsIgnoreCase(action)) {
            emp.setStatus("TERMINATED");
            outcome = "removed and account deactivated";
        }
        employeeRepository.save(emp);
        auditService.record(request, "CENTERS", "MANAGER_REMOVED",
                emp.getFullName() + " " + outcome + " at " + center.getName());
        return ResponseEntity.ok(centerService.toView(center));
    }

    private Employee findEmployee(Object rawId) {
        Long employeeId;
        try {
            employeeId = Long.valueOf(String.valueOf(rawId).replace("emp-", "").trim());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valid employeeId is required.");
        }
        return employeeRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found."));
    }
}
