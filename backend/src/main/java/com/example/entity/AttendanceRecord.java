package com.example.entity;

import java.time.LocalDate;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonProperty;
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
    private String location;
    private String shift;

    @Column(nullable = false)
    private LocalDate date;

    private LocalTime checkIn;
    private LocalTime checkOut;
    private String status; // PRESENT, ABSENT, HALF_DAY, ON_LEAVE, LATE, WORK_FROM_HOME
    private Double workHours = 0.0;

    private String regularizationStatus; // NONE, PENDING, APPROVED, REJECTED
    @Column(columnDefinition = "TEXT")
    private String regularizationReason;
    private String notes;

    private Double latitude;
    private Double longitude;
    private Integer distanceMeters;
    private Double biometricScore;
    private Boolean isLocationVerified;
    private Boolean isBiometricVerified;

    @Column(columnDefinition = "TEXT")
    private String facePhoto;

    /** Face measurements taken at check-in. Accepted from the app but never sent back: lists stay small. */
    @Column(columnDefinition = "TEXT")
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String faceBiometrics;

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
