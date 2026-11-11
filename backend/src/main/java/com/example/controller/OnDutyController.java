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

@RestController
@RequestMapping("/api/on-duty")
public class OnDutyController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

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
                if (request.getReviewedOn() == null) {
                    request.setReviewedOn(LocalDate.now(BUSINESS_ZONE).toString());
                }
            }
        }

        if (request.getDutyDate() == null || request.getDutyDate().trim().isEmpty()) {
            request.setDutyDate(LocalDate.now(BUSINESS_ZONE).toString());
        }

        if (request.getEmployeeId() != null) {
            employeeRepository.findById(request.getEmployeeId()).ifPresent(emp -> {
                request.setEmployeeName(emp.getFullName());
                request.setDepartmentName(emp.getDepartment());
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
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<OnDutyRequest> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String status = payload.get("status"); // APPROVED, REJECTED, COMPLETED, CANCELLED
        String reviewerComments = payload.get("comments");
        String reviewer = payload.get("reviewer");

        return onDutyRequestRepository.findById(id).map(req -> {
            if (status != null) req.setStatus(status);
            req.setReviewedOn(LocalDate.now(BUSINESS_ZONE).toString());
            if (reviewer != null) req.setReviewedBy(reviewer);
            if (reviewerComments != null) req.setReviewerComments(reviewerComments);

            OnDutyRequest updated = onDutyRequestRepository.save(req);
            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.notFound().build());
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
    public ResponseEntity<OnDutyRequest> updateReimbursement(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String status = payload.get("reimbursementStatus"); // REIMBURSED, REJECTED
        String reviewerComments = payload.get("comments");
        String reviewer = payload.get("reviewer");

        return onDutyRequestRepository.findById(id).map(req -> {
            if (status != null) req.setReimbursementStatus(status);
            req.setReimbursedOn(LocalDate.now(BUSINESS_ZONE).toString());
            if (reviewer != null) req.setReimbursedBy(reviewer);
            if (reviewerComments != null) req.setReimbursementComments(reviewerComments);

            OnDutyRequest updated = onDutyRequestRepository.save(req);
            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}

