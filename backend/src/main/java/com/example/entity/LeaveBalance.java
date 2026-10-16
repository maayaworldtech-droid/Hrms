package com.example.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "leave_balances")
public class LeaveBalance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private Long employeeId;

    private int casualTotal = 12;
    private int casualUsed = 0;

    private int sickTotal = 10;
    private int sickUsed = 0;

    private int earnedTotal = 18;
    private int earnedUsed = 0;

    private int compOffTotal = 2;
    private int compOffUsed = 0;

    @JsonProperty("casualLeave")
    public Map<String, Integer> getCasualLeave() {
        Map<String, Integer> map = new HashMap<>();
        map.put("total", casualTotal);
        map.put("used", casualUsed);
        map.put("remaining", Math.max(0, casualTotal - casualUsed));
        return map;
    }

    @JsonProperty("sickLeave")
    public Map<String, Integer> getSickLeave() {
        Map<String, Integer> map = new HashMap<>();
        map.put("total", sickTotal);
        map.put("used", sickUsed);
        map.put("remaining", Math.max(0, sickTotal - sickUsed));
        return map;
    }

    @JsonProperty("earnedLeave")
    public Map<String, Integer> getEarnedLeave() {
        Map<String, Integer> map = new HashMap<>();
        map.put("total", earnedTotal);
        map.put("used", earnedUsed);
        map.put("remaining", Math.max(0, earnedTotal - earnedUsed));
        return map;
    }

    @JsonProperty("compOff")
    public Map<String, Integer> getCompOff() {
        Map<String, Integer> map = new HashMap<>();
        map.put("total", compOffTotal);
        map.put("used", compOffUsed);
        map.put("remaining", Math.max(0, compOffTotal - compOffUsed));
        return map;
    }
}
