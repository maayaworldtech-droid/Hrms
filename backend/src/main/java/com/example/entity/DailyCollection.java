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

/** One center's sales for one day, as reported by its manager. */
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

    @Column(nullable = false)
    private double website;

    @Column(name = "cash_counter", nullable = false)
    private double cashCounter;

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

    @JsonProperty("total")
    public double getTotal() {
        return bookMyShow + website + cashCounter;
    }
}
