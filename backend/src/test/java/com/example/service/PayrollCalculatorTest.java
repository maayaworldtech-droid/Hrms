package com.example.service;

import com.example.entity.AttendanceRecord;
import com.example.entity.LeaveRequest;
import com.example.entity.Payslip;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PayrollCalculatorTest {

    private static final YearMonth NOV_2026 = YearMonth.of(2026, 11); // 30 days
    private static final LocalDate AFTER_MONTH = LocalDate.of(2026, 12, 5);

    private static AttendanceRecord present(String date) {
        AttendanceRecord r = new AttendanceRecord();
        r.setDate(LocalDate.parse(date));
        r.setStatus("PRESENT");
        r.setCheckIn(java.time.LocalTime.of(9, 0));
        return r;
    }

    private static LeaveRequest leave(String type, String from, String to, double days) {
        LeaveRequest l = new LeaveRequest();
        l.setLeaveType(type);
        l.setStartDate(LocalDate.parse(from));
        l.setEndDate(LocalDate.parse(to));
        l.setDays(days);
        l.setStatus("APPROVED");
        return l;
    }

    /** Six working days a week: present every day except Sundays. */
    private static List<AttendanceRecord> fullMonthSixDays(YearMonth m, int skipFirstWorkdays) {
        List<AttendanceRecord> list = new ArrayList<>();
        int skipped = 0;
        for (int d = 1; d <= m.lengthOfMonth(); d++) {
            LocalDate date = m.atDay(d);
            if (date.getDayOfWeek().getValue() == 7) continue;
            if (skipped < skipFirstWorkdays) {
                skipped++;
                continue;
            }
            list.add(present(date.toString()));
        }
        return list;
    }

    private static Payslip slip(double basic, double hra, double special, int daysInMonth, int employed, int lop) {
        Payslip s = new Payslip();
        s.setBasic(basic);
        s.setHra(hra);
        s.setSpecialAllowance(special);
        s.setConveyanceAllowance(0.0);
        s.setMedicalAllowance(0.0);
        s.setDaysInMonth(daysInMonth);
        s.setEmployedDays(employed);
        s.setLossOfPayDays(lop);
        s.setBonus(0.0);
        s.setIncentives(0.0);
        s.setTds(0.0);
        s.setOtherDeductions(0.0);
        s.setHealthInsurance(0.0);
        s.setPtState("Telangana");
        s.setPtMonthly(0.0);
        return s;
    }

    @Test
    void fullAttendanceMeansNoUnpaidDays() {
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2025-01-01"), 6, 1, AFTER_MONTH, fullMonthSixDays(NOV_2026, 0), List.of(), List.of());
        assertEquals(30, c.daysInMonth);
        assertEquals(30, c.employedDays);
        assertEquals(0, c.suggestedLopDays);
    }

    @Test
    void missedWorkdaysBecomeUnpaidDays() {
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2025-01-01"), 6, 1, AFTER_MONTH, fullMonthSixDays(NOV_2026, 3), List.of(), List.of());
        assertEquals(3, c.suggestedLopDays);
        assertEquals(3.0, c.absentDays);
    }

    @Test
    void onlyOnePaidLeaveDayAMonth() {
        // Missed Nov 2 and 3 on approved casual leave: the first day is paid, the second is cut
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2025-01-01"), 6, 1, AFTER_MONTH, fullMonthSixDays(NOV_2026, 2),
                List.of(leave("CASUAL_LEAVE", "2026-11-02", "2026-11-03", 2)), List.of());
        assertEquals(1.0, c.paidLeaveDays);
        assertEquals(1.0, c.unpaidLeaveDays);
        assertEquals(1, c.suggestedLopDays);
    }

    @Test
    void oneLeaveDayIsFullyPaid() {
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2025-01-01"), 6, 1, AFTER_MONTH, fullMonthSixDays(NOV_2026, 1),
                List.of(leave("SICK_LEAVE", "2026-11-02", "2026-11-02", 1)), List.of());
        assertEquals(0, c.suggestedLopDays);
        assertEquals(1.0, c.paidLeaveDays);
    }

    @Test
    void paidLeaveAllowanceComesFromSettings() {
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2025-01-01"), 6, 2, AFTER_MONTH, fullMonthSixDays(NOV_2026, 2),
                List.of(leave("CASUAL_LEAVE", "2026-11-02", "2026-11-03", 2)), List.of());
        assertEquals(0, c.suggestedLopDays);
    }

    @Test
    void eachUnpaidDayCostsOneDaysSalary() {
        // Rs 30,000 in a 30-day month is Rs 1,000 a day
        Payslip s = slip(15000, 7500, 7500, 30, 30, 2);
        PayrollCalculator.recompute(s);
        assertEquals(2000.0, s.getUnpaidAmount());
    }

    @Test
    void unpaidLeaveAlwaysCounts() {
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2025-01-01"), 6, 1, AFTER_MONTH, fullMonthSixDays(NOV_2026, 2),
                List.of(leave("LOSS_OF_PAY", "2026-11-02", "2026-11-03", 2)), List.of());
        assertEquals(2, c.suggestedLopDays);
        assertEquals(2.0, c.unpaidLeaveDays);
        assertEquals(0.0, c.absentDays);
    }

    @Test
    void joiningMidMonthOnlyCountsEmployedDays() {
        List<AttendanceRecord> fromJoining = new ArrayList<>();
        for (AttendanceRecord r : fullMonthSixDays(NOV_2026, 0)) if (!r.getDate().isBefore(LocalDate.of(2026, 11, 16))) fromJoining.add(r);
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2026-11-16"), 6, 1, AFTER_MONTH, fromJoining, List.of(), List.of());
        assertEquals(15, c.employedDays);
        assertEquals(0, c.suggestedLopDays);
    }

    @Test
    void runningMidMonthDoesNotTreatFutureDaysAsAbsent() {
        LocalDate midMonth = LocalDate.of(2026, 11, 10);
        List<AttendanceRecord> soFar = new ArrayList<>();
        for (AttendanceRecord r : fullMonthSixDays(NOV_2026, 0)) if (!r.getDate().isAfter(LocalDate.of(2026, 11, 10))) soFar.add(r);
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2025-01-01"), 6, 1, midMonth, soFar, List.of(), List.of());
        assertEquals(0, c.suggestedLopDays);
    }

    @Test
    void earningsAreProratedForUnpaidDays() {
        // Rs 30,000 a month, 30-day month, 3 unpaid days => Rs 27,000 earned, Rs 3,000 not paid
        Payslip s = slip(15000, 7500, 7500, 30, 30, 3);
        PayrollCalculator.recompute(s);
        assertEquals(27, s.getPayableDays());
        assertEquals(30000.0, s.getFullMonthlySalary());
        assertEquals(3000.0, s.getUnpaidAmount());
        assertEquals(27000.0, s.getGrossMonthly());
        assertEquals(0.0, s.getTotalDeductions());
        assertEquals(27000.0, s.getNetMonthly());
    }

    @Test
    void pfIsCappedAtFifteenThousandBasic() {
        Payslip s = slip(40000, 20000, 20000, 30, 30, 0);
        s.setPfApplicable(true);
        PayrollCalculator.recompute(s);
        assertEquals(1800.0, s.getEpfEmployee());
    }

    @Test
    void esiOnlyForLowerSalaries() {
        Payslip s = slip(9000, 4500, 4500, 30, 30, 0); // Rs 18,000
        s.setEsiApplicable(true);
        PayrollCalculator.recompute(s);
        assertEquals(Math.ceil(18000 * 0.0075), s.getEsiEmployee());
        assertTrue(s.getNetMonthly() < 18000);
    }

    @Test
    void nothingIsDeductedUnlessAdded() {
        Payslip s = slip(40000, 20000, 20000, 30, 30, 0); // no PF, ESI, tax or other deduction added
        PayrollCalculator.recompute(s);
        assertEquals(0.0, s.getEpfEmployee());
        assertEquals(0.0, s.getEsiEmployee());
        assertEquals(0.0, s.getProfessionalTax());
        assertEquals(0.0, s.getTotalDeductions());
        assertEquals(80000.0, s.getNetMonthly());
    }

    @Test
    void professionalTaxIsTheAmountEntered() {
        Payslip s = slip(15000, 7500, 7500, 30, 30, 0);
        s.setPtMonthly(200.0);
        PayrollCalculator.recompute(s);
        assertEquals(200.0, s.getProfessionalTax());
        assertEquals(29800.0, s.getNetMonthly());
    }
}
