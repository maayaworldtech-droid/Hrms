package com.example.controller;

import com.example.entity.OnDutyRequest;
import com.example.repository.EmployeeRepository;
import com.example.repository.OnDutyRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/on-duty")
public class OnDutyController {

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
    public ResponseEntity<OnDutyRequest> apply(@RequestBody OnDutyRequest request) {
        if (request.getDutyDate() == null || request.getDutyDate().trim().isEmpty()) {
            request.setDutyDate(LocalDate.now().toString());
        }
        request.setStatus("PENDING");

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
            req.setReviewedOn(LocalDate.now().toString());
            if (reviewer != null) req.setReviewedBy(reviewer);
            if (reviewerComments != null) req.setReviewerComments(reviewerComments);

            OnDutyRequest updated = onDutyRequestRepository.save(req);
            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/claim-expense")
    public ResponseEntity<OnDutyRequest> claimExpense(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        return onDutyRequestRepository.findById(id).map(req -> {
            req.setHasExpense(true);

            if (payload.get("expenseAmount") != null) {
                try {
                    req.setExpenseAmount(Double.valueOf(payload.get("expenseAmount").toString()));
                } catch (Exception ignored) {}
            }

            if (payload.get("expenseDescription") != null) {
                req.setExpenseDescription(payload.get("expenseDescription").toString());
            }

            if (payload.get("billPhoto") != null) {
                req.setBillPhoto(payload.get("billPhoto").toString());
            }

            req.setReimbursementStatus("PENDING");
            OnDutyRequest updated = onDutyRequestRepository.save(req);
            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.notFound().build());
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
            req.setReimbursedOn(LocalDate.now().toString());
            if (reviewer != null) req.setReimbursedBy(reviewer);
            if (reviewerComments != null) req.setReimbursementComments(reviewerComments);

            OnDutyRequest updated = onDutyRequestRepository.save(req);
            return ResponseEntity.ok(updated);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}

