package com.example.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "payslips")
public class Payslip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long payrollRunId;
    private Long employeeId;
    private String employeeCode;
    private String employeeName;
    private String designation;
    private String department;
    private String location;

    private String panNumber;
    private String uanNumber;
    private String bankAccount;
    private String bankName;

    private String month;
    private int year;
    private int payableDays = 30;
    private int lossOfPayDays = 0;

    // Salary Components
    private Double basic = 0.0;
    private Double hra = 0.0;
    private Double specialAllowance = 0.0;
    private Double conveyanceAllowance = 0.0;
    private Double medicalAllowance = 0.0;
    private Double grossMonthly = 0.0;
    private Double epfEmployee = 0.0;
    private Double epfEmployer = 0.0;
    private Double professionalTax = 0.0;
    private Double tds = 0.0;
    private Double healthInsurance = 0.0;
    private Double totalDeductions = 0.0;
    private Double netMonthly = 0.0;
    private Double ctcAnnual = 0.0;

    private String paymentStatus = "PAID"; // PAID, PENDING, FAILED
    private String paymentDate;
    private String paymentMode = "NEFT";

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt;

    @JsonProperty("components")
    public Map<String, Object> getComponents() {
        Map<String, Object> comp = new HashMap<>();
        comp.put("basic", basic != null ? basic : 0.0);
        comp.put("hra", hra != null ? hra : 0.0);
        comp.put("specialAllowance", specialAllowance != null ? specialAllowance : 0.0);
        comp.put("conveyanceAllowance", conveyanceAllowance != null ? conveyanceAllowance : 0.0);
        comp.put("medicalAllowance", medicalAllowance != null ? medicalAllowance : 0.0);
        comp.put("grossMonthly", grossMonthly != null ? grossMonthly : 0.0);
        comp.put("epfEmployee", epfEmployee != null ? epfEmployee : 0.0);
        comp.put("epfEmployer", epfEmployer != null ? epfEmployer : 0.0);
        comp.put("professionalTax", professionalTax != null ? professionalTax : 0.0);
        comp.put("tds", tds != null ? tds : 0.0);
        comp.put("healthInsurance", healthInsurance != null ? healthInsurance : 0.0);
        comp.put("totalDeductions", totalDeductions != null ? totalDeductions : 0.0);
        comp.put("netMonthly", netMonthly != null ? netMonthly : 0.0);
        comp.put("ctcAnnual", ctcAnnual != null ? ctcAnnual : 0.0);
        return comp;
    }
}
