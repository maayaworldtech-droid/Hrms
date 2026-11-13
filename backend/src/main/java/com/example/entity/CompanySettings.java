package com.example.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "company_settings")
public class CompanySettings {
    public static final String DEFAULT_MORNING_START = "09:00";
    public static final String DEFAULT_MORNING_END = "13:00";
    public static final String DEFAULT_EVENING_START = "13:00";
    public static final String DEFAULT_EVENING_END = "21:00";
    public static final int DEFAULT_LATE_GRACE_MINUTES = 15;

    /**
     * Placeholder values earlier versions seeded into new databases. They are not real registrations,
     * so they are cleared on startup when a stored value still matches one exactly.
     */
    public static final List<String> LEGACY_SEED_VALUES = List.of(
            "Maaya World Technologies Private Limited",
            "AAACM1234F",
            "MH/BAN/0012345/000",
            "31000123450000999",
            "Level 5, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081",
            "operations@maayaworld.com",
            "+91 40 4821 9900"
    );

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String companyName = "Maaya World";
    // Official details start empty; the admin fills them in from Settings
    private String legalEntityName = "";
    private String corporateTaxId = "";
    private String pfRegistrationNo = "";
    private String esiRegistrationNo = "";
    private String registeredAddress = "";
    private String contactEmail = "";
    private String contactPhone = "";
    private int standardWorkHoursPerDay = 8;
    private int workDaysPerWeek = 5;
    /** Leave days a month paid in full; every leave day after these is cut from salary. */
    private Integer paidLeavesPerMonth = 1;
    private String fiscalYearStartMonth = "April";
    private String currencySymbol = "INR";
    private boolean enableGeoFencingAttendance = true;
    private int autoApproveRegularizationWithinDays = 3;

    // Shift timings (HH:mm, 24-hour). Wrapper types so the columns can be added to an existing
    // settings row; a null value means "use the default" (see getters below).
    private String morningShiftStart;
    private String morningShiftEnd;
    private String eveningShiftStart;
    private String eveningShiftEnd;
    private Integer lateGraceMinutes;

    public String getMorningShiftStart() {
        return morningShiftStart != null ? morningShiftStart : DEFAULT_MORNING_START;
    }

    public String getMorningShiftEnd() {
        return morningShiftEnd != null ? morningShiftEnd : DEFAULT_MORNING_END;
    }

    public String getEveningShiftStart() {
        return eveningShiftStart != null ? eveningShiftStart : DEFAULT_EVENING_START;
    }

    public String getEveningShiftEnd() {
        return eveningShiftEnd != null ? eveningShiftEnd : DEFAULT_EVENING_END;
    }

    public Integer getLateGraceMinutes() {
        return lateGraceMinutes != null ? lateGraceMinutes : DEFAULT_LATE_GRACE_MINUTES;
    }

    // Raw values (null when not sent), so an update copies only the shift fields a request contains.
    // Not bean-style names, so Jackson does not serialize them.
    public String rawMorningShiftStart() { return morningShiftStart; }
    public String rawMorningShiftEnd() { return morningShiftEnd; }
    public String rawEveningShiftStart() { return eveningShiftStart; }
    public String rawEveningShiftEnd() { return eveningShiftEnd; }
    public Integer rawLateGraceMinutes() { return lateGraceMinutes; }
}
