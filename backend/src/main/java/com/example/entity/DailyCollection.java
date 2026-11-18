package com.example.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One center's day, as reported by its manager: money in by channel (BookMyShow, cash deposited,
 * Google Pay, Paytm / Maaya World) and money spent (cash and online). The final amount is
 * collections less expenses.
 */
@Data
@Entity
@Table(name = "daily_collections")
public class DailyCollection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @JsonProperty("date")
    @Column(name = "collection_date", nullable = false)
    private LocalDate collectionDate;

    @Column(name = "book_my_show", nullable = false)
    private double bookMyShow;

    @Column(name = "cash_deposited", nullable = false)
    private double cashDeposited;

    @Column(name = "google_pay", nullable = false)
    private double googlePay;

    @Column(name = "paytm_maaya_world", nullable = false)
    private double paytmMaayaWorld;

    @Column(name = "expense_cash", nullable = false)
    private double expenseCash;

    @Column(name = "expense_online", nullable = false)
    private double expenseOnline;

    @Column(length = 500)
    private String notes;

    @Column(name = "submitted_by_id")
    private Long submittedById;

    @Column(name = "submitted_by_name")
    private String submittedByName;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @JsonProperty("center")
    public String getCenter() {
        return location != null ? location.getName() : null;
    }

    @JsonProperty("centerId")
    public Integer getCenterId() {
        return location != null ? location.getLocationId() : null;
    }

    /** Money in: BookMyShow + cash deposited + Google Pay + Paytm / Maaya World. */
    @JsonProperty("totalCollections")
    public double getTotalCollections() {
        return round2(bookMyShow + cashDeposited + googlePay + paytmMaayaWorld);
    }

    /** Money out: cash and online expenses. */
    @JsonProperty("totalExpenses")
    public double getTotalExpenses() {
        return round2(expenseCash + expenseOnline);
    }

    /** Collections less expenses. Can be below zero on a day with more spent than taken. */
    @JsonProperty("finalAmount")
    public double getFinalAmount() {
        return round2(getTotalCollections() - getTotalExpenses());
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
