package com.example.controller;

import com.example.entity.OnDutyRequest;
import com.example.repository.EmployeeRepository;
import com.example.repository.OnDutyRequestRepository;
import com.example.security.AuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/on-duty")
public class OnDutyController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final Set<String> ALLOWED_STATUSES = Set.of("PENDING", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED");

    @Autowired
    private com.example.service.StaffNotices staffNotices;

    @Autowired
    private OnDutyRequestRepository onDutyRequestRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @GetMapping
    public ResponseEntity<List<OnDutyRequest>> getAll() {
        return ResponseEntity.ok(onDutyRequestRepository.findAllByOrderByDutyDateDesc());
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<OnDutyRequest>> getByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(onDutyRequestRepository.findByEmployeeIdOrderByDutyDateDesc(employeeId));
    }

    @PostMapping("/apply")
    public ResponseEntity<?> apply(@RequestBody OnDutyRequest request, HttpServletRequest httpRequest) {
        String role = (String) httpRequest.getAttribute(AuthFilter.ATTR_ROLE);
        Long authId = (Long) httpRequest.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        boolean isPrivileged = "ADMIN".equals(role) || "MANAGER".equals(role);

        // An incoming id would overwrite an existing request; reimbursement outcome is never client-set
        request.setId(null);
        request.setReviewerComments(null);
        request.setReimbursedBy(null);
        request.setReimbursedOn(null);
        request.setReimbursementComments(null);

        if (!isPrivileged) {
            if (request.getEmployeeId() == null) {
                request.setEmployeeId(authId);
            } else if (authId == null || !authId.equals(request.getEmployeeId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "You can only submit On Duty requests for yourself."));
            }
            request.setStatus("PENDING");
            request.setReviewedBy(null);
            request.setReviewedOn(null);
        } else {
            // Allow Admin/Manager direct assignment with APPROVED status
            if (!"APPROVED".equalsIgnoreCase(request.getStatus())) {
                request.setStatus("PENDING");
            } else {
                request.setStatus("APPROVED");
                request.setReviewedOn(LocalDate.now(BUSINESS_ZONE));
                request.setReviewedBy(resolveReviewerName(httpRequest, request.getReviewedBy()));
            }
        }

        if (request.getDutyDate() == null) {
            request.setDutyDate(LocalDate.now(BUSINESS_ZONE));
        }

        if (request.getEmployeeId() != null) {
            employeeRepository.findById(request.getEmployeeId()).ifPresent(emp -> {
                request.setEmployeeName(emp.getFullName());
                request.setLocation(emp.getLocationName());
            });
        }

        if (Boolean.TRUE.equals(request.getHasExpense()) && request.getExpenseAmount() != null && request.getExpenseAmount() > 0) {
            request.setReimbursementStatus("PENDING");
        } else {
            request.setHasExpense(false);
            request.setReimbursementStatus("NONE");
        }

        OnDutyRequest saved = onDutyRequestRepository.save(request);
        // A manager or admin putting someone else on duty: tell that person
        if (isPrivileged && "APPROVED".equals(saved.getStatus())
                && saved.getEmployeeId() != null && !saved.getEmployeeId().equals(authId)) {
            staffNotices.onDutyAssigned(saved);
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            HttpServletRequest httpRequest
    ) {
        String status = payload.get("status"); // APPROVED, REJECTED, COMPLETED, CANCELLED
        String reviewerComments = payload.get("comments");
        String reviewer = payload.get("reviewer");

        String cleanStatus = status != null ? status.trim().toUpperCase() : null;
        if (cleanStatus != null && !ALLOWED_STATUSES.contains(cleanStatus)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unsupported On Duty status: " + cleanStatus));
        }

        Optional<OnDutyRequest> opt = onDutyRequestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        OnDutyRequest req = opt.get();
        if (isSelfReviewByNonAdmin(httpRequest, req.getEmployeeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You cannot review your own On Duty request."));
        }

        String previousStatus = req.getStatus();
        if (cleanStatus != null) req.setStatus(cleanStatus);
        req.setReviewedOn(LocalDate.now(BUSINESS_ZONE));
        req.setReviewedBy(resolveReviewerName(httpRequest, reviewer));
        if (reviewerComments != null) req.setReviewerComments(reviewerComments);

        OnDutyRequest saved = onDutyRequestRepository.save(req);
        if (cleanStatus != null && !cleanStatus.equalsIgnoreCase(previousStatus)) {
            staffNotices.onDutyDecided(saved, previousStatus);
        }
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/claim-expense")
    public ResponseEntity<?> claimExpense(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            HttpServletRequest httpRequest
    ) {
        Optional<OnDutyRequest> opt = onDutyRequestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        OnDutyRequest req = opt.get();
        String role = (String) httpRequest.getAttribute(AuthFilter.ATTR_ROLE);
        Long authId = (Long) httpRequest.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        if (!"ADMIN".equals(role) && !"MANAGER".equals(role)
                && (authId == null || !authId.equals(req.getEmployeeId()))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You can only claim expenses on your own On Duty request."));
        }

        String odStatus = req.getStatus() != null ? req.getStatus().toUpperCase() : "PENDING";
        if ("REJECTED".equals(odStatus) || "CANCELLED".equals(odStatus)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Expenses cannot be claimed on a " + odStatus.toLowerCase() + " On Duty request."));
        }
        if ("REIMBURSED".equalsIgnoreCase(req.getReimbursementStatus())) {
            // Re-claiming would reset the status to PENDING and allow the same trip to be paid twice
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "This expense has already been reimbursed."));
        }

        double amount = 0.0;
        if (payload.get("expenseAmount") != null) {
            try {
                amount = Double.parseDouble(payload.get("expenseAmount").toString());
            } catch (Exception ignored) {}
        }
        if (amount <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Expense amount must be greater than zero."));
        }

        req.setHasExpense(true);
        req.setExpenseAmount(amount);

        if (payload.get("expenseDescription") != null) {
            req.setExpenseDescription(payload.get("expenseDescription").toString());
        }

        if (payload.get("billPhoto") != null) {
            req.setBillPhoto(payload.get("billPhoto").toString());
        }

        req.setReimbursementStatus("PENDING");
        OnDutyRequest updated = onDutyRequestRepository.save(req);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/reimburse")
    public ResponseEntity<?> updateReimbursement(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            HttpServletRequest httpRequest
    ) {
        String status = payload.get("reimbursementStatus"); // REIMBURSED, REJECTED
        String reviewerComments = payload.get("comments");
        String reviewer = payload.get("reviewer");

        String cleanStatus = status != null ? status.trim().toUpperCase() : null;
        if (cleanStatus != null && !"REIMBURSED".equals(cleanStatus) && !"REJECTED".equals(cleanStatus)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unsupported reimbursement status: " + cleanStatus));
        }

        Optional<OnDutyRequest> opt = onDutyRequestRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        OnDutyRequest req = opt.get();
        if (isSelfReviewByNonAdmin(httpRequest, req.getEmployeeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You cannot approve reimbursement of your own expense."));
        }

        String previousReimbursement = req.getReimbursementStatus();
        if (cleanStatus != null) req.setReimbursementStatus(cleanStatus);
        req.setReimbursedOn(LocalDate.now(BUSINESS_ZONE));
        req.setReimbursedBy(resolveReviewerName(httpRequest, reviewer));
        if (reviewerComments != null) req.setReimbursementComments(reviewerComments);

        OnDutyRequest saved = onDutyRequestRepository.save(req);
        if (cleanStatus != null && !cleanStatus.equalsIgnoreCase(previousReimbursement)) {
            staffNotices.expenseDecided(saved, previousReimbursement);
        }
        return ResponseEntity.ok(saved);
    }

    private boolean isSelfReviewByNonAdmin(HttpServletRequest httpRequest, Long requestOwnerId) {
        String role = (String) httpRequest.getAttribute(AuthFilter.ATTR_ROLE);
        Long authId = (Long) httpRequest.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        return !"ADMIN".equals(role) && authId != null && authId.equals(requestOwnerId);
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

