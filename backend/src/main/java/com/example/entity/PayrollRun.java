package com.example.entity;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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

    /** The center this payroll covers. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "location_id", nullable = false)
    @JsonIgnore
    private Location location;

    /** Center name for the app; always the current name, so renaming a center never breaks payroll. */
    @JsonProperty("center")
    public String getCenter() {
        return location != null ? location.getName() : null;
    }

    @JsonProperty("locationId")
    public Integer getLocationId() {
        return location != null ? location.getLocationId() : null;
    }

    private String month; // e.g. "October" or "2026-10"
    private int year = 2026;
    private int totalEmployees = 0;

    private Double totalGrossPay = 0.0;
    private Double totalDeductions = 0.0;
    private Double totalNetPay = 0.0;

    private String status = "DRAFT"; // DRAFT, APPROVED, DISBURSED
    private LocalDate processedAt;
    private LocalDate disbursedAt;
    private String disbursedBy;

    @Transient
    private List<Payslip> payslips = new ArrayList<>();

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;
}
