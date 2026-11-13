package com.example.service;

import com.example.entity.AttendanceRecord;
import com.example.entity.LeaveRequest;
import com.example.entity.OnDutyRequest;
import com.example.entity.Payslip;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Payroll rules in one place, used both when a month is generated and when a payslip is adjusted,
 * so the two can never disagree.
 *
 * How pay is worked out (the same approach Zoho and RazorpayX Payroll use):
 *  - Pay is per calendar day: monthly salary / days in the month.
 *  - Paid days = days employed in the month (from the joining date) minus unpaid (loss-of-pay) days.
 *  - Only a set number of leave days a month are paid (1 by default, set in Settings). Every leave day
 *    after that, and every absent day, is unpaid and cut at one day's salary.
 *  - Salary earned = monthly salary x paid days / days in the month. Bonus is added on top in full.
 *  - Only deductions added to the person's salary breakdown at onboarding are taken. Someone with
 *    no breakdown, or no deduction lines in it, has nothing deducted.
 *      PF   if added: 12% of basic pay earned, counting basic only up to Rs 15,000 (at most Rs 1,800).
 *      ESI  if added: 0.75% of pay earned. Employer pays 3.25%.
 *      PT   if added: the amount entered (none in a month with no pay).
 *      TDS  if added: the amount entered.
 *      Other deductions (health insurance, salary advance and so on): the amount entered.
 */
public final class PayrollCalculator {

    public static final double PF_WAGE_CEILING = 15000.0;
    public static final double PF_RATE = 0.12;
    public static final double ESI_WAGE_LIMIT = 21000.0;
    public static final double ESI_EMPLOYEE_RATE = 0.0075;
    public static final double ESI_EMPLOYER_RATE = 0.0325;

    private static final Set<String> WORKED_STATUSES = Set.of("PRESENT", "LATE", "ON_DUTY", "WORK_FROM_HOME");
    private static final Set<String> PAID_LEAVE_TYPES = Set.of(
            "CASUAL_LEAVE", "SICK_LEAVE", "EARNED_LEAVE", "MATERNITY_LEAVE", "PATERNITY_LEAVE", "COMP_OFF"
    );

    private PayrollCalculator() {}

    /** Attendance summary for one person in one month. */
    public static final class DayCount {
        public int daysInMonth;
        /** Days on the payroll this month: from the joining date (or the 1st) to the month end. */
        public int employedDays;
        public double workedDays;
        public double paidLeaveDays;
        public double unpaidLeaveDays;
        /** Expected working days with no check-in and no leave. */
        public double absentDays;
        /** Unpaid days suggested from attendance and leave. */
        public int suggestedLopDays;
        /** True when there was not a single check-in in the counted part of the month. */
        public boolean noAttendance;
    }

    /**
     * Counts worked, leave and absent days for one person.
     *
     * Only days up to {@code countUntil} are judged (so running payroll before the month ends does not
     * treat the remaining days as absent). Expected working days come from the company's working days
     * per week, so weekly offs are not counted as absences.
     */
    public static DayCount countDays(
            YearMonth month,
            String joiningDate,
            int workDaysPerWeek,
            double paidLeavesPerMonth,
            LocalDate countUntil,
            List<AttendanceRecord> attendance,
            List<LeaveRequest> approvedLeaves,
            List<OnDutyRequest> approvedDuties
    ) {
        DayCount c = new DayCount();
        LocalDate monthStart = month.atDay(1);
        LocalDate monthEnd = month.atEndOfMonth();
        c.daysInMonth = month.lengthOfMonth();

        LocalDate start = monthStart;
        LocalDate joined = parse(joiningDate);
        if (joined != null && joined.isAfter(start)) start = joined;
        if (start.isAfter(monthEnd)) {
            c.employedDays = 0;
            return c;
        }
        c.employedDays = (int) ChronoUnit.DAYS.between(start, monthEnd) + 1;

        LocalDate end = countUntil.isBefore(monthEnd) ? countUntil : monthEnd;
        if (end.isBefore(start)) return c; // month not started yet: nothing to judge

        Map<LocalDate, Double> worked = new HashMap<>();
        for (AttendanceRecord r : attendance) {
            LocalDate d = parse(r.getDate());
            if (d == null || d.isBefore(start) || d.isAfter(end)) continue;
            String status = r.getStatus() == null ? "" : r.getStatus().toUpperCase();
            double value;
            if ("HALF_DAY".equals(status)) value = 0.5;
            else if (WORKED_STATUSES.contains(status) || (r.getCheckIn() != null && !r.getCheckIn().isBlank() && !"ABSENT".equals(status))) value = 1.0;
            else value = 0.0;
            worked.merge(d, value, Math::max);
        }
        for (OnDutyRequest od : approvedDuties) {
            LocalDate d = parse(od.getDutyDate());
            if (d == null || d.isBefore(start) || d.isAfter(end)) continue;
            worked.merge(d, 1.0, Math::max);
        }

        Map<LocalDate, Double> paidLeave = new HashMap<>();
        Map<LocalDate, Double> unpaidLeave = new HashMap<>();
        for (LeaveRequest l : approvedLeaves) {
            LocalDate from = parse(l.getStartDate());
            LocalDate to = parse(l.getEndDate());
            if (from == null) continue;
            if (to == null || to.isBefore(from)) to = from;
            // A single-day request for half a day counts as half
            double perDay = (from.equals(to) && l.getDays() != null && l.getDays() > 0 && l.getDays() < 1) ? l.getDays() : 1.0;
            boolean paid = PAID_LEAVE_TYPES.contains(l.getLeaveType() == null ? "" : l.getLeaveType().toUpperCase());
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                if (d.isBefore(start) || d.isAfter(end)) continue;
                (paid ? paidLeave : unpaidLeave).merge(d, perDay, Math::max);
            }
        }

        // Only the first leave days of the month, up to the allowance, are paid; the rest are unpaid.
        // Days already worked are not counted as leave.
        double allowanceLeft = Math.max(0.0, paidLeavesPerMonth);
        for (LocalDate d : new java.util.TreeSet<>(paidLeave.keySet())) {
            double asked = Math.max(0.0, paidLeave.get(d) - worked.getOrDefault(d, 0.0));
            double granted = Math.min(asked, allowanceLeft);
            allowanceLeft -= granted;
            if (asked - granted > 0) unpaidLeave.merge(d, asked - granted, Math::max);
            paidLeave.put(d, granted);
        }

        double covered = 0.0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            double w = worked.getOrDefault(d, 0.0);
            double p = paidLeave.getOrDefault(d, 0.0);
            covered += Math.min(1.0, w + p);
        }
        c.workedDays = worked.values().stream().mapToDouble(Double::doubleValue).sum();
        c.paidLeaveDays = paidLeave.values().stream().mapToDouble(Double::doubleValue).sum();
        c.unpaidLeaveDays = unpaidLeave.values().stream().mapToDouble(Double::doubleValue).sum();
        c.noAttendance = worked.isEmpty();

        int judgedDays = (int) ChronoUnit.DAYS.between(start, end) + 1;
        int perWeek = Math.max(1, Math.min(7, workDaysPerWeek));
        // Weekly offs are rounded up, so a month with five Sundays never costs anyone a day's pay
        int daysOff = (int) Math.ceil(judgedDays * (7 - perWeek) / 7.0);
        double expectedWorkDays = Math.max(0, judgedDays - daysOff);
        double shortfall = Math.max(0.0, expectedWorkDays - covered);

        // Approved unpaid leave always counts, even if it fell on what the estimate treats as a day off.
        // Half days are rounded down so the estimate never takes more than is certain.
        int lop = (int) Math.floor(Math.max(shortfall, c.unpaidLeaveDays));
        c.suggestedLopDays = Math.min(lop, c.employedDays);
        c.absentDays = Math.max(0.0, c.suggestedLopDays - c.unpaidLeaveDays);
        return c;
    }

    /**
     * Works out every amount on a payslip from its stored inputs: the full monthly earning lines,
     * employed days, unpaid days, bonus, income tax and other deductions, and whether PF and ESI apply.
     */
    public static void recompute(Payslip s) {
        int daysInMonth = Math.max(1, nzInt(s.getDaysInMonth(), 30));
        // Older payslips have no employed days stored; they covered the full month
        int employed = s.getEmployedDays() == null ? daysInMonth : Math.max(0, Math.min(daysInMonth, s.getEmployedDays()));
        int lop = Math.max(0, Math.min(employed, s.getLossOfPayDays()));
        int paid = employed - lop;
        s.setLossOfPayDays(lop);
        s.setPayableDays(paid);

        double full = nz(s.getBasic()) + nz(s.getHra()) + nz(s.getSpecialAllowance())
                + nz(s.getConveyanceAllowance()) + nz(s.getMedicalAllowance());
        s.setFullMonthlySalary(full);

        double earnedBase = Math.round(full * paid / daysInMonth);
        s.setUnpaidAmount(full - earnedBase);
        double bonus = nz(s.getBonus()) + nz(s.getIncentives());
        double gross = earnedBase + bonus;
        s.setGrossMonthly(gross);

        double earnedBasic = nz(s.getBasic()) * paid / daysInMonth;
        double pf = Boolean.TRUE.equals(s.getPfApplicable()) ? Math.round(Math.min(earnedBasic, PF_WAGE_CEILING) * PF_RATE) : 0.0;
        s.setEpfEmployee(pf);
        s.setEpfEmployer(pf);

        boolean esi = Boolean.TRUE.equals(s.getEsiApplicable()) && gross > 0;
        s.setEsiEmployee(esi ? Math.ceil(gross * ESI_EMPLOYEE_RATE) : 0.0);
        s.setEsiEmployer(esi ? Math.ceil(gross * ESI_EMPLOYER_RATE) : 0.0);

        s.setProfessionalTax(gross > 0 ? Math.max(0.0, nz(s.getPtMonthly())) : 0.0);

        double other = nz(s.getOtherDeductions()) + nz(s.getHealthInsurance());
        double total = pf + nz(s.getEsiEmployee()) + nz(s.getProfessionalTax()) + nz(s.getTds()) + other;
        s.setTotalDeductions(total);
        s.setNetMonthly(Math.max(0.0, gross - total));
    }

    private static LocalDate parse(String iso) {
        if (iso == null || iso.isBlank()) return null;
        try {
            return LocalDate.parse(iso.trim().substring(0, Math.min(10, iso.trim().length())));
        } catch (Exception e) {
            return null;
        }
    }

    private static double nz(Double v) {
        return v != null ? v : 0.0;
    }

    private static int nzInt(Integer v, int fallback) {
        return v != null && v > 0 ? v : fallback;
    }
}
