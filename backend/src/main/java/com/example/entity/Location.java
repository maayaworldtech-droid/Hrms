package com.example.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A Maaya World center (e.g. "Maaya World Hyderabad") or gaming zone. Employees reference it by
 * foreign key; attendance, leave, On Duty and payslip rows keep a copy of the name as text.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "locations")
public class Location {
    public static final String TYPE_CENTER = "CENTER";
    public static final String TYPE_GAMING_ZONE = "GAMING_ZONE";
    public static final int DEFAULT_RADIUS_METERS = 250;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int locationId;
    private String name;
    private String address;
    private String city;
    private String state;
    private String country;
    private String zipCode;

    /** CENTER or GAMING_ZONE */
    private String centerType;

    /** Geofence used for attendance check-in */
    private Double latitude;
    private Double longitude;
    private Integer radiusMeters;

    public Location(String name) {
        this.name = name;
        this.city = name;
    }
}
