package com.example.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "company_settings")
public class CompanySettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String companyName = "Maaya World";
    private String legalEntityName = "Maaya World Technologies Private Limited";
    private String corporateTaxId = "AAACM1234F";
    private String pfRegistrationNo = "MH/BAN/0012345/000";
    private String esiRegistrationNo = "31000123450000999";
    private String registeredAddress = "Level 5, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081";
    private String contactEmail = "operations@maayaworld.com";
    private String contactPhone = "+91 40 4821 9900";
    private int standardWorkHoursPerDay = 8;
    private int workDaysPerWeek = 5;
    private String fiscalYearStartMonth = "April";
    private String currencySymbol = "INR";
    private boolean enableGeoFencingAttendance = true;
    private int autoApproveRegularizationWithinDays = 3;
}
