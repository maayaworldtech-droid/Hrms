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

    private static final YearMonth OCT_2026 = YearMonth.of(2026, 10); // 31 days
    private static final YearMonth FEB_2026 = YearMonth.of(2026, 2);  // 28 days

    /** Present every day of the month except the given day numbers (week offs on any day, Sundays included). */
    private static List<AttendanceRecord> presentExcept(YearMonth m, int... offDays) {
        java.util.Set<Integer> off = new java.util.HashSet<>();
        for (int d : offDays) off.add(d);
        List<AttendanceRecord> list = new ArrayList<>();
        for (int d = 1; d <= m.lengthOfMonth(); d++) {
            if (!off.contains(d)) list.add(present(m.atDay(d).toString()));
        }
        return list;
    }

    private static PayrollCalculator.DayCount count(YearMonth m, String joined, String exit, List<AttendanceRecord> att, List<LeaveRequest> leaves) {
        return PayrollCalculator.countDays(m, joined == null ? LocalDate.parse("2025-01-01") : LocalDate.parse(joined),
                exit == null ? null : LocalDate.parse(exit), 4, 1, AFTER_MONTH.plusMonths(3), att, leaves, List.of());
    }

    /** Pays a Rs 26,000 salary for a counted month, the way payroll does. */
    private static Payslip pay(PayrollCalculator.DayCount c, double monthly) {
        Payslip s = slip(monthly, 0, 0, c.daysInMonth, c.employedDays, c.suggestedLopDays);
        s.setWorkingDays(c.workingDays);
        PayrollCalculator.recompute(s);
        return s;
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
    void workingDaysAreDaysInMonthLessFivePaidDaysOff() {
        assertEquals(26, PayrollCalculator.workingDays(31, 4, 1));
        assertEquals(25, PayrollCalculator.workingDays(30, 4, 1));
        assertEquals(23, PayrollCalculator.workingDays(28, 4, 1));
    }

    @Test
    void fiveDaysOffOnAnyDaysIsFullPay() {
        // Week offs on a Monday, a Wednesday and two Saturdays, worked every Sunday, plus one leave day
        var c = count(OCT_2026, null, null, presentExcept(OCT_2026, 5, 7, 10, 17, 22), List.of());
        assertEquals(5.0, c.daysOffTaken);
        assertEquals(5.0, c.daysOffAllowed);
        assertEquals(0, c.suggestedLopDays);
        assertEquals(26000.0, pay(c, 26000).getNetMonthly());
    }

    @Test
    void sixthDayOffIsCutAtSalaryOverWorkingDays() {
        var c = count(OCT_2026, null, null, presentExcept(OCT_2026, 1, 2, 3, 4, 5, 6), List.of());
        assertEquals(1, c.suggestedLopDays);
        // Rs 26,000 / 26 working days = Rs 1,000 a day
        assertEquals(25000.0, pay(c, 26000).getNetMonthly());
    }

    @Test
    void thirtyDayMonthDividesByTwentyFive() {
        YearMonth nov = YearMonth.of(2026, 11);
        var c = count(nov, null, null, presentExcept(nov, 1, 2, 3, 4, 5, 6, 7), List.of());
        assertEquals(2, c.suggestedLopDays);
        assertEquals(25, c.workingDays);
        assertEquals(25000.0 - 2 * 1000.0, pay(c, 25000).getNetMonthly());
    }

    @Test
    void februaryDividesByTwentyThree() {
        var c = count(FEB_2026, null, null, presentExcept(FEB_2026, 1, 2, 3, 4, 5, 6), List.of());
        assertEquals(23, c.workingDays);
        assertEquals(1, c.suggestedLopDays);
        assertEquals((double) Math.round(23000.0 - 23000.0 / 23), pay(c, 23000).getNetMonthly());
    }

    @Test
    void approvedLeaveIsADayOffLikeAnyOther() {
        // 4 week offs + 3 days casual leave = 7 days off: 2 unpaid
        var c = count(OCT_2026, null, null, presentExcept(OCT_2026, 3, 10, 13, 14, 15, 17, 24),
                List.of(leave("CASUAL_LEAVE", "2026-10-13", "2026-10-15", 3)));
        assertEquals(7.0, c.daysOffTaken);
        assertEquals(3.0, c.paidLeaveDays);
        assertEquals(2, c.suggestedLopDays);
    }

    @Test
    void leaveOnADayWorkedIsNotADayOff() {
        var c = count(OCT_2026, null, null, presentExcept(OCT_2026, 3, 10, 17, 24),
                List.of(leave("CASUAL_LEAVE", "2026-10-13", "2026-10-13", 1)));
        assertEquals(4.0, c.daysOffTaken);
        assertEquals(0.0, c.paidLeaveDays);
        assertEquals(0, c.suggestedLopDays);
    }

    @Test
    void noAttendanceAtAllPaysNothing() {
        var c = count(OCT_2026, null, null, List.of(), List.of());
        assertTrue(c.noAttendance);
        assertEquals(26, c.suggestedLopDays);
        assertEquals(0.0, pay(c, 26000).getNetMonthly());
    }

    @Test
    void joinerIsPaidForEmployedDaysWithProratedDaysOff() {
        // Joined 15 Oct: 17 days employed, 5 x 17 / 31 = 2.7 -> 3 paid days off
        List<AttendanceRecord> att = new ArrayList<>();
        for (int d = 15; d <= 31; d++) if (d != 18 && d != 25) att.add(present(OCT_2026.atDay(d).toString()));
        var c = count(OCT_2026, "2026-10-15", null, att, List.of());
        assertEquals(17, c.employedDays);
        assertEquals(3.0, c.daysOffAllowed);
        assertEquals(0, c.suggestedLopDays);
        assertEquals((double) Math.round(31000.0 * 17 / 31), pay(c, 31000).getNetMonthly());
    }

    @Test
    void leaverIsPaidUpToTheLastWorkingDay() {
        // Last working day 20 Oct: 20 days employed, 5 x 20 / 31 = 3.2 -> 3 paid days off
        List<AttendanceRecord> att = new ArrayList<>();
        for (int d = 1; d <= 20; d++) if (d != 4 && d != 11 && d != 18) att.add(present(OCT_2026.atDay(d).toString()));
        var c = count(OCT_2026, null, "2026-10-20", att, List.of());
        assertEquals(20, c.employedDays);
        assertEquals(3.0, c.daysOffAllowed);
        assertEquals(0, c.suggestedLopDays);
        assertEquals(20000.0, pay(c, 31000).getNetMonthly());
    }

    @Test
    void runningMidMonthDoesNotTreatFutureDaysAsDaysOff() {
        List<AttendanceRecord> att = new ArrayList<>();
        for (int d = 1; d <= 10; d++) att.add(present(NOV_2026.atDay(d).toString()));
        var c = PayrollCalculator.countDays(NOV_2026, LocalDate.parse("2025-01-01"), null, 4, 1,
                LocalDate.parse("2026-11-10"), att, List.of(), List.of());
        assertEquals(0.0, c.daysOffTaken);
        assertEquals(0, c.suggestedLopDays);
    }

    @Test
    void halfDayRoundsDown() {
        List<AttendanceRecord> att = presentExcept(OCT_2026, 1, 2, 3, 4, 5, 6);
        AttendanceRecord half = present("2026-10-07");
        half.setStatus("HALF_DAY");
        att.removeIf(r -> r.getDate().equals(LocalDate.parse("2026-10-07")));
        att.add(half);
        var c = count(OCT_2026, null, null, att, List.of());
        assertEquals(6.5, c.daysOffTaken);
        assertEquals(1, c.suggestedLopDays);
    }

    @Test
    void pfFollowsEarnedBasicUnderTheNewRule() {
        Payslip s = slip(13000, 0, 0, 31, 31, 2);
        s.setWorkingDays(26);
        s.setPfApplicable(true);
        PayrollCalculator.recompute(s);
        assertEquals(12000.0, s.getGrossMonthly()); // 13,000 - 2 x 500
        assertEquals(1440.0, s.getEpfEmployee());   // 12% of 12,000
    }

    // Payslips made before the week-off rule (no working days stored) keep the old calculation
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

    // ---------------------------------------------------------------- salary setup from onboarding

    private static java.util.Map<String, Object> item(String type, String code, double amount) {
        return java.util.Map.of("type", type, "code", code, "name", code, "amount", amount);
    }

    /** A full month with every day paid. */
    private static Payslip fullMonth(Payslip s) {
        s.setDaysInMonth(30);
        s.setEmployedDays(30);
        s.setLossOfPayDays(0);
        PayrollCalculator.recompute(s);
        return s;
    }

    @Test
    void yearlySalaryWithNothingAddedIsOneTwelfthWithNoDeductions() {
        Payslip s = new Payslip();
        PayrollCalculator.applySalarySetup(s, 300000.0 / 12, List.of());
        fullMonth(s);
        assertEquals(25000.0, s.getFullMonthlySalary());
        assertEquals(25000.0, s.getGrossMonthly());
        assertEquals(0.0, s.getTotalDeductions());
        assertEquals(25000.0, s.getNetMonthly());
        assertEquals(0.0, s.getHra());
    }

    @Test
    void yearlySalaryTakesOnlyTheDeductionsAdded() {
        Payslip s = new Payslip();
        PayrollCalculator.applySalarySetup(s, 25000.0, List.of(
                item("DEDUCTION", "PF", 0), item("DEDUCTION", "TDS", 500), item("DEDUCTION", "OTHER_DEDUCTION", 300)));
        fullMonth(s);
        assertEquals(25000.0, s.getGrossMonthly());
        assertEquals(1800.0, s.getEpfEmployee()); // 12% of the ₹15,000 cap
        assertEquals(500.0, s.getTds());
        assertEquals(0.0, s.getEsiEmployee()); // not added, not taken
        assertEquals(0.0, s.getProfessionalTax()); // not added, not taken
        assertEquals(2600.0, s.getTotalDeductions());
        assertEquals(22400.0, s.getNetMonthly());
    }

    @Test
    void breakdownUsesItsOwnEarningLines() {
        Payslip s = new Payslip();
        PayrollCalculator.applySalarySetup(s, 99999.0, List.of(
                item("EARNING", "BASIC", 12000), item("EARNING", "HRA", 6000), item("EARNING", "OTHER_EARNING", 2000),
                item("DEDUCTION", "PF", 0), item("DEDUCTION", "PT", 200)));
        fullMonth(s);
        assertEquals(20000.0, s.getFullMonthlySalary());
        assertEquals(1440.0, s.getEpfEmployee()); // 12% of basic 12,000
        assertEquals(200.0, s.getProfessionalTax());
        assertEquals(18360.0, s.getNetMonthly());
    }
}
