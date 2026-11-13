package com.example.entity;

import java.time.LocalDate;
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
@Table(name = "leave_requests")
public class LeaveRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long employeeId;
    private String employeeName;
    private String location;

    private String leaveType; // CASUAL_LEAVE, SICK_LEAVE, EARNED_LEAVE, MATERNITY_LEAVE, PATERNITY_LEAVE, LOSS_OF_PAY
    private LocalDate startDate;
    private LocalDate endDate;
    private Double days = 1.0;

    @Column(columnDefinition = "TEXT")
    private String reason;

    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED
    private LocalDate appliedOn;

    private String reviewedBy;
    private LocalDate reviewedOn;
    @Column(columnDefinition = "TEXT")
    private String reviewerComments;

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
