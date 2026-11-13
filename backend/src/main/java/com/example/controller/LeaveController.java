package com.example.controller;

import com.example.entity.LeaveRequest;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveRequestRepository;
import com.example.security.AuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Leave requests. There are no yearly balances: a set number of leave days a month is paid
 * (Settings) and payroll cuts the rest, so approving leave is never blocked by a quota.
 */
@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final Set<String> ALLOWED_REVIEW_STATUSES = Set.of("APPROVED", "REJECTED", "CANCELLED");

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private com.example.service.StaffNotices staffNotices;

    @Autowired
    private EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<List<LeaveRequest>> getAll() {
        return ResponseEntity.ok(leaveRequestRepository.findAllByOrderByAppliedOnDesc());
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<LeaveRequest>> getByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(leaveRequestRepository.findByEmployeeIdOrderByAppliedOnDesc(employeeId));
    }

    @PostMapping("/apply")
    public ResponseEntity<?> apply(@RequestBody LeaveRequest request, HttpServletRequest httpRequest) {
        String role = (String) httpRequest.getAttribute(AuthFilter.ATTR_ROLE);
        Long authId = (Long) httpRequest.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        if (!"ADMIN".equals(role) && !"MANAGER".equals(role)) {
            if (request.getEmployeeId() == null) {
                request.setEmployeeId(authId);
            } else if (authId == null || !authId.equals(request.getEmployeeId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "You can only apply leave for yourself."));
            }
        }

        if (request.getEmployeeId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "employeeId is required."));
        }
        if (request.getStartDate() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Start date is required."));
        }
        LocalDate start = request.getStartDate();
        LocalDate end = request.getEndDate() != null ? request.getEndDate() : start;
        if (end.isBefore(start)) {
            return ResponseEntity.badRequest().body(Map.of("message", "End date cannot be earlier than start date."));
        }

        // Never trust client-controlled identity, workflow or duration fields
        request.setId(null);
        request.setEndDate(end);
        request.setDays((double) (ChronoUnit.DAYS.between(start, end) + 1));
        request.setAppliedOn(LocalDate.now(BUSINESS_ZONE));
        request.setStatus("PENDING");
        request.setReviewedBy(null);
        request.setReviewedOn(null);
        request.setReviewerComments(null);

        employeeRepository.findById(request.getEmployeeId()).ifPresent(emp -> {
            request.setEmployeeName(emp.getFullName());
            request.setLocation(emp.getLocationName());
        });

        return ResponseEntity.ok(leaveRequestRepository.save(request));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            HttpServletRequest httpRequest
    ) {
        String status = payload.get("status"); // APPROVED, REJECTED, CANCELLED
        if (status == null || status.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status is required"));
        }
        String cleanStatus = status.trim().toUpperCase();
        if (!ALLOWED_REVIEW_STATUSES.contains(cleanStatus)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unsupported leave status: " + cleanStatus));
        }

        Optional<LeaveRequest> opt = leaveRequestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        LeaveRequest req = opt.get();
        String previousStatus = req.getStatus() != null ? req.getStatus().toUpperCase() : "PENDING";

        Long authId = (Long) httpRequest.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        String role = (String) httpRequest.getAttribute(AuthFilter.ATTR_ROLE);
        if (!"ADMIN".equals(role) && authId != null && authId.equals(req.getEmployeeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You cannot review your own leave request."));
        }
        if (cleanStatus.equals(previousStatus)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Leave request is already " + cleanStatus.toLowerCase() + "."));
        }
        if ("CANCELLED".equals(previousStatus)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Cancelled leave requests cannot be changed."));
        }

        req.setStatus(cleanStatus);
        req.setReviewedOn(LocalDate.now(BUSINESS_ZONE));
        req.setReviewedBy(resolveReviewerName(httpRequest, payload.get("reviewer")));
        if (payload.get("comments") != null) req.setReviewerComments(payload.get("comments"));

        LeaveRequest saved = leaveRequestRepository.save(req);
        // Tell the person, unless they changed it themselves
        if (authId == null || !authId.equals(saved.getEmployeeId())) {
            staffNotices.leaveDecided(saved, previousStatus);
        }
        return ResponseEntity.ok(saved);
    }

    /** Reviewer identity comes from the authenticated session, not from the request body. */
    private String resolveReviewerName(HttpServletRequest httpRequest, String fallback) {
        Long authId = (Long) httpRequest.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        if (authId != null) {
            Optional<String> name = employeeRepository.findById(authId).map(e -> e.getFullName());
            if (name.isPresent()) return name.get();
        }
        String email = (String) httpRequest.getAttribute(AuthFilter.ATTR_EMAIL);
        return email != null ? email : fallback;
    }
}
