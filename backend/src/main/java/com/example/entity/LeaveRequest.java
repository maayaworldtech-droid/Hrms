package com.example.entity;

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
    private String departmentName;
    private String location;

    private String leaveType; // CASUAL_LEAVE, SICK_LEAVE, EARNED_LEAVE, MATERNITY_LEAVE, PATERNITY_LEAVE, LOSS_OF_PAY
    private String startDate; // YYYY-MM-DD
    private String endDate;   // YYYY-MM-DD
    private Double days = 1.0;

    @Column(columnDefinition = "TEXT")
    private String reason;

    private String status = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED
    private String appliedOn; // YYYY-MM-DD

    private String reviewedBy;
    private String reviewedOn;
    @Column(columnDefinition = "TEXT")
    private String reviewerComments;

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
