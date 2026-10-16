package com.example.controller;

import com.example.entity.Employee;
import com.example.entity.LeaveBalance;
import com.example.entity.LeaveRequest;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveBalanceRepository;
import com.example.repository.LeaveRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/leaves")
public class LeaveController {

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
    public ResponseEntity<LeaveRequest> apply(@RequestBody LeaveRequest request) {
        if (request.getAppliedOn() == null) {
            request.setAppliedOn(LocalDate.now().toString());
        }
        request.setStatus("PENDING");

        if (request.getEmployeeId() != null) {
            employeeRepository.findById(request.getEmployeeId()).ifPresent(emp -> {
                request.setEmployeeName(emp.getFullName());
                request.setDepartmentName(emp.getDepartment());
                request.setLocation(emp.getLocationName());
            });
        }

        LeaveRequest saved = leaveRequestRepository.save(request);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<LeaveRequest> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload
    ) {
        String status = payload.get("status"); // APPROVED, REJECTED
        String reviewerComments = payload.get("comments");
        String reviewer = payload.get("reviewer");

        return leaveRequestRepository.findById(id).map(req -> {
            req.setStatus(status);
            req.setReviewedOn(LocalDate.now().toString());
            if (reviewer != null) req.setReviewedBy(reviewer);
            if (reviewerComments != null) req.setReviewerComments(reviewerComments);

            // If approved, deduct from leave balance
            if ("APPROVED".equalsIgnoreCase(status) && req.getEmployeeId() != null) {
                leaveBalanceRepository.findByEmployeeId(req.getEmployeeId()).ifPresent(balance -> {
                    int days = req.getDays() != null ? req.getDays().intValue() : 1;
                    String type = req.getLeaveType() != null ? req.getLeaveType() : "CASUAL_LEAVE";

                    switch (type) {
                        case "SICK_LEAVE":
                            balance.setSickUsed(balance.getSickUsed() + days);
                            break;
                        case "EARNED_LEAVE":
                            balance.setEarnedUsed(balance.getEarnedUsed() + days);
                            break;
                        case "COMP_OFF":
                            balance.setCompOffUsed(balance.getCompOffUsed() + days);
                            break;
                        case "CASUAL_LEAVE":
                        default:
                            balance.setCasualUsed(balance.getCasualUsed() + days);
                            break;
                    }
                    leaveBalanceRepository.save(balance);
                });
            }

            return ResponseEntity.ok(leaveRequestRepository.save(req));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
