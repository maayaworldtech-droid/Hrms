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
@Table(name = "attendance_records")
public class AttendanceRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long employeeId;
    private String employeeName;
    private String departmentName;
    private String location;
    private String shift;

    @Column(nullable = false)
    private String date; // YYYY-MM-DD

    private String checkIn; // HH:mm:ss
    private String checkOut; // HH:mm:ss
    private String status; // PRESENT, ABSENT, HALF_DAY, ON_LEAVE, LATE, WORK_FROM_HOME
    private Double workHours = 0.0;

    private String regularizationStatus; // NONE, PENDING, APPROVED, REJECTED
    @Column(columnDefinition = "TEXT")
    private String regularizationReason;
    private String notes;

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
