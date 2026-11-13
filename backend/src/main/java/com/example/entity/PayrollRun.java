package com.example.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payroll_runs")
public class PayrollRun {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The center this payroll covers. Older runs made before payroll was per center have none. */
    private String center;

    private String month; // e.g. "October" or "2026-10"
    private int year = 2026;
    private int totalEmployees = 0;

    private Double totalGrossPay = 0.0;
    private Double totalDeductions = 0.0;
    private Double totalNetPay = 0.0;

    private String status = "DRAFT"; // DRAFT, APPROVED, DISBURSED
    private String processedAt; // YYYY-MM-DD
    private String disbursedAt; // YYYY-MM-DD
    private String disbursedBy;

    @Transient
    private List<Payslip> payslips = new ArrayList<>();

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
