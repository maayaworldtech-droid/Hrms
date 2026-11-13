package com.example.entity;

import java.time.LocalDate;
import java.time.LocalTime;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.util.Date;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "on_duty_requests")
public class OnDutyRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long employeeId;
    private String employeeName;
    private String location;

    private LocalDate dutyDate;
    private LocalTime startTime;
    private LocalTime endTime;

    private String dutyType;  // BANK_DEPOSIT, PROCUREMENT, CLIENT_VISIT, DELIVERY, OFFICIAL_ERRAND, OTHER

    @Column(columnDefinition = "TEXT")
    private String reason;

    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED

    private String reviewedBy;
    private LocalDate reviewedOn;
    @Column(columnDefinition = "TEXT")
    private String reviewerComments;

    // Reimbursement / Expense tracking
    private Boolean hasExpense = false;
    private Double expenseAmount = 0.0;
    @Column(columnDefinition = "TEXT")
    private String expenseDescription;

    @Column(columnDefinition = "TEXT")
    private String billPhoto; // Base64 data URL or document URL

    private String reimbursementStatus = "NONE"; // NONE, PENDING, REIMBURSED, REJECTED
    private String reimbursedBy;
    private LocalDate reimbursedOn;
    @Column(columnDefinition = "TEXT")
    private String reimbursementComments;

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}

