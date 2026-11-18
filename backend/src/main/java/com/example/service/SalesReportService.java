package com.example.service;

import com.example.entity.DailyCollection;
import com.example.entity.Employee;
import com.example.entity.Location;
import com.example.repository.DailyCollectionRepository;
import com.example.repository.EmployeeRepository;
import com.example.repository.LocationRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Daily sales reports for the admin: tells every admin when a center manager sends or corrects a
 * day, and works out each month's totals per center (sent to the admins on the 1st of the next month).
 */
@Service
public class SalesReportService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    private final DailyCollectionRepository collections;
    private final LocationRepository locations;
    private final EmployeeRepository employees;
    private final StaffNotices notices;

    public SalesReportService(DailyCollectionRepository collections, LocationRepository locations,
                              EmployeeRepository employees, StaffNotices notices) {
        this.collections = collections;
        this.locations = locations;
        this.employees = employees;
        this.notices = notices;
    }

    /** One center's month (or the grand total when center is null). */
    public record MonthTotals(String center, int daysReported, double bookMyShow, double cashDeposited, double googlePay,
                              double paytmMaayaWorld, double totalCollections, double expenseCash, double expenseOnline,
                              double totalExpenses, double finalAmount) {}

    /** Every center's totals for the month, then the grand total as the last row (center = null). */
    public List<MonthTotals> monthTotals(YearMonth month) {
        List<DailyCollection> rows = collections.findByCollectionDateBetweenOrderByCollectionDateDescIdDesc(month.atDay(1), month.atEndOfMonth());
        Map<String, List<DailyCollection>> byCenter = new LinkedHashMap<>();
        for (Location loc : locations.findAllByOrderByNameAsc()) byCenter.put(loc.getName(), new ArrayList<>());
        for (DailyCollection r : rows) byCenter.computeIfAbsent(r.getCenter(), k -> new ArrayList<>()).add(r);

        List<MonthTotals> out = new ArrayList<>();
        for (Map.Entry<String, List<DailyCollection>> e : byCenter.entrySet()) out.add(sum(e.getKey(), e.getValue()));
        out.add(sum(null, rows));
        return out;
    }

    /** Tells every admin about a day's report (also when it is corrected). Not sent when an admin entered it. */
    public void reportSent(DailyCollection row, boolean corrected, Long submittedBy) {
        List<Long> adminIds = adminIds();
        if (adminIds.contains(submittedBy)) return;
        for (Long adminId : adminIds) notices.dailySalesReported(adminId, row, corrected);
    }

    /** Sends the month's totals to every admin. Sending the same month again does nothing. */
    public void sendMonthReport(YearMonth month) {
        List<MonthTotals> totals = monthTotals(month);
        for (Long adminId : adminIds()) notices.monthlySalesReport(adminId, month, totals);
    }

    /** On the 1st of each month at 8 am, last month's sales go to the admins. */
    @Scheduled(cron = "0 0 8 1 * *", zone = "Asia/Kolkata")
    public void sendLastMonthReport() {
        try {
            sendMonthReport(YearMonth.now(BUSINESS_ZONE).minusMonths(1));
        } catch (RuntimeException e) {
            System.err.println("Could not send the monthly sales report: " + e.getMessage());
        }
    }

    private List<Long> adminIds() {
        return employees.findAll().stream()
                .filter(e -> "ADMIN".equalsIgnoreCase(e.getRole()) && !"TERMINATED".equalsIgnoreCase(e.getStatus()))
                .map(Employee::getId)
                .toList();
    }

    private static MonthTotals sum(String center, List<DailyCollection> rows) {
        double bms = 0, cash = 0, gpay = 0, paytm = 0, exCash = 0, exOnline = 0;
        for (DailyCollection r : rows) {
            bms += r.getBookMyShow();
            cash += r.getCashDeposited();
            gpay += r.getGooglePay();
            paytm += r.getPaytmMaayaWorld();
            exCash += r.getExpenseCash();
            exOnline += r.getExpenseOnline();
        }
        double in = r2(bms + cash + gpay + paytm);
        double out = r2(exCash + exOnline);
        return new MonthTotals(center, rows.size(), r2(bms), r2(cash), r2(gpay), r2(paytm), in, r2(exCash), r2(exOnline), out, r2(in - out));
    }

    private static double r2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
