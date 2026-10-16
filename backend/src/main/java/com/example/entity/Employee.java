package com.example.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "employees")
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_code", unique = true)
    private String employeeCode;

    private int employeeId; // legacy numeric id
    private String firstName;
    private String lastName;

    @Column(unique = true, nullable = false)
    private String email;

    private String password;
    private String role; // "ADMIN", "MANAGER", "EMPLOYEE"
    private boolean mustChangePassword = true;

    private String phone;
    
    @Column(columnDefinition = "TEXT")
    private String address;

    private String jobTitle; // designation
    private String department;
    private Long managerId;
    private String managerName;
    private String employmentType; // FULL_TIME, PART_TIME, CONTRACT, INTERN
    private String status;         // ACTIVE, PROBATION, ON_LEAVE, TERMINATED
    private String shift;          // MORNING, EVENING
    private String dateOfJoining;  // YYYY-MM-DD

    private Double monthlySalary;
    private Double ctcAnnual;

    // Bank & Tax Details
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String panNumber;
    private String uanNumber;

    // Emergency Contact
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;

    @ManyToOne(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "location_id", nullable = true)
    private Location location;

    @CreationTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdDate;

    @UpdateTimestamp
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedDate;

    // JSON compatibility helpers for frontend
    @JsonProperty("fullName")
    public String getFullName() {
        if (firstName == null && lastName == null) return email;
        if (lastName == null || lastName.trim().isEmpty()) return firstName;
        if (firstName == null || firstName.trim().isEmpty()) return lastName;
        return firstName + " " + lastName;
    }

    @JsonProperty("designation")
    public String getDesignation() {
        return jobTitle;
    }

    public void setDesignation(String designation) {
        this.jobTitle = designation;
    }

    @JsonProperty("joiningDate")
    public String getJoiningDate() {
        return dateOfJoining;
    }

    public void setJoiningDate(String joiningDate) {
        this.dateOfJoining = joiningDate;
    }

    @JsonProperty("location")
    public String getLocationName() {
        if (location != null && location.getName() != null) {
            return location.getName();
        }
        return "Hyderabad";
    }

    @JsonProperty("location")
    public void setLocationName(String locationName) {
        if (locationName != null && !locationName.trim().isEmpty()) {
            if (this.location == null) {
                this.location = new Location();
            }
            this.location.setName(locationName);
            this.location.setCity(locationName);
        }
    }

    @JsonProperty("bankDetails")
    public Map<String, String> getBankDetails() {
        Map<String, String> details = new HashMap<>();
        details.put("accountNumber", accountNumber != null ? accountNumber : "");
        details.put("ifscCode", ifscCode != null ? ifscCode : "");
        details.put("bankName", bankName != null ? bankName : "");
        details.put("panNumber", panNumber != null ? panNumber : "");
        details.put("uanNumber", uanNumber != null ? uanNumber : "");
        return details;
    }

    @JsonProperty("emergencyContact")
    public Map<String, String> getEmergencyContact() {
        Map<String, String> contact = new HashMap<>();
        contact.put("name", emergencyContactName != null ? emergencyContactName : "");
        contact.put("phone", emergencyContactPhone != null ? emergencyContactPhone : "");
        contact.put("relationship", emergencyContactRelationship != null ? emergencyContactRelationship : "");
        return contact;
    }
}
