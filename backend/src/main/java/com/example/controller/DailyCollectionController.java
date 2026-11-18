package com.example.controller;

import com.example.entity.DailyCollection;
import com.example.entity.Employee;
import com.example.entity.Location;
import com.example.repository.DailyCollectionRepository;
import com.example.repository.EmployeeRepository;
import com.example.repository.LocationRepository;
import com.example.security.AuthFilter;
import com.example.service.SalesReportService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

/**
 * Daily sales per center: BookMyShow, cash deposited, Google Pay and Paytm / Maaya World, less cash
 * and online expenses. A manager reports for their own center; the admin can report for any center
 * and sees all of them, and is told about every report a manager sends.
 */
@RestController
@RequestMapping("/api/collections")
public class DailyCollectionController {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    /** Managers may fill in or correct the last few days, not rewrite old ones. */
    private static final int MANAGER_DAYS_BACK = 7;

    private final DailyCollectionRepository collections;
    private final EmployeeRepository employees;
    private final LocationRepository locations;
    private final SalesReportService salesReports;

    public DailyCollectionController(DailyCollectionRepository collections, EmployeeRepository employees,
                                     LocationRepository locations, SalesReportService salesReports) {
        this.collections = collections;
        this.employees = employees;
        this.locations = locations;
        this.salesReports = salesReports;
    }

    /** Reports for a date range (default: this month so far). Managers only see their own center. */
    @GetMapping
    public List<DailyCollection> list(@RequestParam(required = false) String from,
                                      @RequestParam(required = false) String to,
                                      @RequestParam(required = false) String center,
                                      HttpServletRequest request) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate toDate = parse(to, today);
        LocalDate fromDate = parse(from, toDate.withDayOfMonth(1));
        if (fromDate.isAfter(toDate)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The start date is after the end date.");

        if (isManager(request)) {
            Location own = ownCenter(request);
            return collections.findByLocation_LocationIdAndCollectionDateBetweenOrderByCollectionDateDesc(own.getLocationId(), fromDate, toDate);
        }
        if (center != null && !center.isBlank() && !"ALL".equalsIgnoreCase(center)) {
            Location loc = locations.findFirstByNameIgnoreCaseOrderByLocationIdAsc(center.trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown center: " + center));
            return collections.findByLocation_LocationIdAndCollectionDateBetweenOrderByCollectionDateDesc(loc.getLocationId(), fromDate, toDate);
        }
        return collections.findByCollectionDateBetweenOrderByCollectionDateDescIdDesc(fromDate, toDate);
    }

    /** Saves a day's sales. Sending the same center and day again corrects the earlier figures. */
    @PostMapping
    public DailyCollection submit(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate date = parse(body.get("date") == null ? null : body.get("date").toString(), today);
        if (date.isAfter(today)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot report sales for a future date.");

        Location loc;
        if (isManager(request)) {
            loc = ownCenter(request);
            if (date.isBefore(today.minusDays(MANAGER_DAYS_BACK))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "You can report up to " + MANAGER_DAYS_BACK + " days back. Ask the admin to change older days.");
            }
        } else {
            String center = body.get("center") == null ? "" : body.get("center").toString().trim();
            if (center.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a center.");
            loc = locations.findFirstByNameIgnoreCaseOrderByLocationIdAsc(center)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown center: " + center));
        }

        double bookMyShow = amount(body.get("bookMyShow"), "BookMyShow");
        double cashDeposited = amount(body.get("cashDeposited"), "Cash deposited");
        double googlePay = amount(body.get("googlePay"), "Google Pay");
        double paytmMaayaWorld = amount(body.get("paytmMaayaWorld"), "Paytm / Maaya World");
        double expenseCash = amount(body.get("expenseCash"), "Cash expenses");
        double expenseOnline = amount(body.get("expenseOnline"), "Online expenses");
        String notes = body.get("notes") == null ? null : body.get("notes").toString().trim();
        if (notes != null && notes.length() > 500) notes = notes.substring(0, 500);
        if (notes != null && notes.isEmpty()) notes = null;

        Long me = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        String myName = me == null ? null : employees.findById(me).map(Employee::getFullName).orElse(null);
        LocalDateTime now = LocalDateTime.now(BUSINESS_ZONE).withNano(0);

        DailyCollection row = collections.findByLocation_LocationIdAndCollectionDate(loc.getLocationId(), date).orElse(null);
        boolean corrected = row != null;
        if (row == null) {
            row = new DailyCollection();
            row.setLocation(loc);
            row.setCollectionDate(date);
            row.setSubmittedAt(now);
        } else {
            row.setUpdatedAt(now);
        }
        row.setBookMyShow(bookMyShow);
        row.setCashDeposited(cashDeposited);
        row.setGooglePay(googlePay);
        row.setPaytmMaayaWorld(paytmMaayaWorld);
        row.setExpenseCash(expenseCash);
        row.setExpenseOnline(expenseOnline);
        row.setNotes(notes);
        row.setSubmittedById(me);
        row.setSubmittedByName(myName);
        DailyCollection saved = collections.save(row);
        // Every report goes to the admin (in the app and by email); a notice never blocks the save
        try {
            salesReports.reportSent(saved, corrected, me);
        } catch (RuntimeException e) {
            System.err.println("Could not tell the admin about sales " + saved.getId() + ": " + e.getMessage());
        }
        return saved;
    }

    private static boolean isManager(HttpServletRequest request) {
        return "MANAGER".equals(request.getAttribute(AuthFilter.ATTR_ROLE));
    }

    private Location ownCenter(HttpServletRequest request) {
        Long me = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        return employees.findById(me == null ? -1L : me).map(Employee::getLocation)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to a center."));
    }

    private static LocalDate parse(String raw, LocalDate fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return LocalDate.parse(raw.trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a date like 2026-11-13.");
        }
    }

    private static double amount(Object raw, String label) {
        if (raw == null || raw.toString().isBlank()) return 0.0;
        double value;
        try {
            value = Double.parseDouble(raw.toString().trim());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " must be a number.");
        }
        if (value < 0 || Double.isNaN(value) || Double.isInfinite(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " cannot be less than zero.");
        }
        return Math.round(value * 100.0) / 100.0;
    }
}
