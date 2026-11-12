package com.example.controller;

import com.example.entity.LeaveBalance;
import com.example.entity.LeaveRequest;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveBalanceRepository;
import com.example.repository.LeaveRequestRepository;
import com.example.security.AuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final Set<String> ALLOWED_REVIEW_STATUSES = Set.of("APPROVED", "REJECTED", "CANCELLED");

    @Autowired
    private LeaveRequestRepository leaveRequestRepository;

    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;

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

    @GetMapping("/balances/{employeeId}")
    public ResponseEntity<LeaveBalance> getBalance(@PathVariable Long employeeId) {
        LeaveBalance balance = leaveBalanceRepository.findByEmployeeId(employeeId)
                .orElseGet(() -> {
                    LeaveBalance b = new LeaveBalance();
                    b.setEmployeeId(employeeId);
                    return leaveBalanceRepository.save(b);
                });
        return ResponseEntity.ok(balance);
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

        if (request.getStartDate() == null || request.getStartDate().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Start date is required."));
        }
        LocalDate start;
        LocalDate end;
        try {
            start = LocalDate.parse(request.getStartDate().trim());
            end = (request.getEndDate() != null && !request.getEndDate().isBlank())
                    ? LocalDate.parse(request.getEndDate().trim())
                    : start;
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Valid start and end dates (YYYY-MM-DD) are required."));
        }
        if (end.isBefore(start)) {
            return ResponseEntity.badRequest().body(Map.of("message", "End date cannot be earlier than start date."));
        }

        // Never trust client-controlled identity, workflow or duration fields: an incoming id would
        // overwrite an existing (possibly another employee's) request, and a client-sent day count
        // would let a long leave deduct only one day of balance.
        request.setId(null);
        request.setStartDate(start.toString());
        request.setEndDate(end.toString());
        request.setDays((double) (ChronoUnit.DAYS.between(start, end) + 1));
        request.setAppliedOn(LocalDate.now(BUSINESS_ZONE).toString());
        request.setStatus("PENDING");
        request.setReviewedBy(null);
        request.setReviewedOn(null);
        request.setReviewerComments(null);

        employeeRepository.findById(request.getEmployeeId()).ifPresent(emp -> {
            request.setEmployeeName(emp.getFullName());
            request.setDepartmentName(emp.getDepartment());
            request.setLocation(emp.getLocationName());
        });

        LeaveRequest saved = leaveRequestRepository.save(request);
        return ResponseEntity.ok(saved);
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
        String reviewerComments = payload.get("comments");
        String reviewer = payload.get("reviewer");

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

        int days = req.getDays() != null ? Math.max(1, (int) Math.round(req.getDays())) : 1;
        String type = req.getLeaveType() != null ? req.getLeaveType().toUpperCase() : "CASUAL_LEAVE";

        if ("APPROVED".equals(cleanStatus) && req.getEmployeeId() != null && isQuotaTrackedType(type)) {
            LeaveBalance balance = leaveBalanceRepository.findByEmployeeId(req.getEmployeeId())
                    .orElseGet(() -> {
                        LeaveBalance b = new LeaveBalance();
                        b.setEmployeeId(req.getEmployeeId());
                        return leaveBalanceRepository.save(b);
                    });

            int remaining = getRemainingForType(balance, type);
            if (remaining < days) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Insufficient " + type.replace("_", " ").toLowerCase() + " balance (" + remaining + " days left)."
                ));
            }
            adjustUsedBalance(balance, type, days);
            leaveBalanceRepository.save(balance);
        } else if ("APPROVED".equals(previousStatus) && !"APPROVED".equals(cleanStatus)
                && req.getEmployeeId() != null && isQuotaTrackedType(type)) {
            // Any move out of APPROVED (rejected or cancelled after approval) returns the deducted days
            leaveBalanceRepository.findByEmployeeId(req.getEmployeeId()).ifPresent(balance -> {
                adjustUsedBalance(balance, type, -days);
                leaveBalanceRepository.save(balance);
            });
        }

        req.setStatus(cleanStatus);
        req.setReviewedOn(LocalDate.now(BUSINESS_ZONE).toString());
        req.setReviewedBy(resolveReviewerName(httpRequest, reviewer));
        if (reviewerComments != null) req.setReviewerComments(reviewerComments);

        return ResponseEntity.ok(leaveRequestRepository.save(req));
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

    private boolean isQuotaTrackedType(String type) {
        return "CASUAL_LEAVE".equals(type)
                || "SICK_LEAVE".equals(type)
                || "EARNED_LEAVE".equals(type)
                || "COMP_OFF".equals(type);
    }

    private int getRemainingForType(LeaveBalance balance, String type) {
        return switch (type) {
            case "SICK_LEAVE" -> Math.max(0, balance.getSickTotal() - balance.getSickUsed());
            case "EARNED_LEAVE" -> Math.max(0, balance.getEarnedTotal() - balance.getEarnedUsed());
            case "COMP_OFF" -> Math.max(0, balance.getCompOffTotal() - balance.getCompOffUsed());
            default -> Math.max(0, balance.getCasualTotal() - balance.getCasualUsed());
        };
    }

    private void adjustUsedBalance(LeaveBalance balance, String type, int delta) {
        switch (type) {
            case "SICK_LEAVE" -> balance.setSickUsed(Math.max(0, balance.getSickUsed() + delta));
            case "EARNED_LEAVE" -> balance.setEarnedUsed(Math.max(0, balance.getEarnedUsed() + delta));
            case "COMP_OFF" -> balance.setCompOffUsed(Math.max(0, balance.getCompOffUsed() + delta));
            case "CASUAL_LEAVE" -> balance.setCasualUsed(Math.max(0, balance.getCasualUsed() + delta));
            default -> {}
        }
    }
}
