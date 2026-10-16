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
@Table(name = "payroll_runs")
public class PayrollRun {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String month; // e.g. "October" or "2026-10"
    private int year = 2026;
    private int totalEmployees = 0;

    private Double totalGrossPay = 0.0;
    private Double totalDeductions = 0.0;
    private Double totalNetPay = 0.0;

    private String status = "DISBURSED"; // DRAFT, APPROVED, DISBURSED
    private String processedAt; // YYYY-MM-DD
    private String disbursedAt; // YYYY-MM-DD
    private String disbursedBy;

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
