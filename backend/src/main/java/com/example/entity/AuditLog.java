package com.example.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String action;
    private String module; // AUTH, EMPLOYEE, ATTENDANCE, LEAVE, PAYROLL, SETTINGS
    @Column(columnDefinition = "TEXT")
    private String details;
    private String actorName;
    private String actorRole;
    private String timestamp;
    private String ipAddress;
}

