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
    private Double bonus = 0.0;
    private Double incentives = 0.0;
    private String adjustmentNotes;
    private Double grossMonthly = 0.0;
    private Double epfEmployee = 0.0;
    private Double epfEmployer = 0.0;
    private Double professionalTax = 0.0;
    private Double tds = 0.0;
    private Double healthInsurance = 0.0;
    private Double totalDeductions = 0.0;
    private Double netMonthly = 0.0;
    private Double ctcAnnual = 0.0;

    // ---- Days (worked out from attendance and approved leave when the month is generated)
    private Integer daysInMonth;
    /** Days on the payroll this month, from the joining date (or the 1st) to the month end. */
    private Integer employedDays;
    private Double workedDays = 0.0;
    private Double paidLeaveDays = 0.0;
    private Double unpaidLeaveDays = 0.0;
    private Double absentDays = 0.0;
    /** Unpaid days suggested from attendance; lossOfPayDays may differ if the admin changed it. */
    private Integer suggestedLopDays = 0;
    /** No check-in at all this month: the unpaid days need a look before paying. */
    private Boolean noAttendance = false;

    // ---- Amounts
    /** Full monthly salary before unpaid days (sum of the earning lines above). */
    private Double fullMonthlySalary = 0.0;
    /** Salary not paid for unpaid days and days before joining. */
    private Double unpaidAmount = 0.0;
    private Double esiEmployee = 0.0;
    private Double esiEmployer = 0.0;
    /** Salary advance recovery and similar, entered by the admin. */
    private Double otherDeductions = 0.0;

    // ---- Rules that apply to this person
    private Boolean pfApplicable = false;
    private Boolean esiApplicable = false;
    /** State of the person's center (kept for reference). */
    private String ptState;
    /** Professional tax entered in the person's salary breakdown; 0 when none was added. */
    private Double ptMonthly = 0.0;

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
        comp.put("bonus", bonus != null ? bonus : 0.0);
        comp.put("incentives", incentives != null ? incentives : 0.0);
        comp.put("adjustmentNotes", adjustmentNotes != null ? adjustmentNotes : "");
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
