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
 * How pay is worked out (Maaya World's rule):
 *  - Everyone has a set number of paid days off a month: week offs (4) + paid leave (1) = 5. Staff
 *    choose their own week offs (Sunday is a working day at the venues), so payroll does not look at
 *    which days they were; it only counts the days a person did not work.
 *  - Working days in the month = days in the month - paid days off (26 in a 31-day month).
 *  - Up to 5 days off: full salary. Every day off after that is cut at monthly salary / working days.
 *  - A day counts as worked when there is a check-in or an approved On Duty. Approved leave is shown
 *    on the payslip but is a day off like any other.
 *  - Someone who joins or leaves part way is paid for the days they were employed (salary x employed
 *    days / days in month), and their paid days off are prorated the same way.
 *  - Bonus is added on top in full.
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
    public static final double ESI_EMPLOYEE_RATE = 0.0075;
    public static final double ESI_EMPLOYER_RATE = 0.0325;
    public static final int DEFAULT_WEEK_OFFS_PER_MONTH = 4;
    public static final int DEFAULT_PAID_LEAVES_PER_MONTH = 1;

    private static final Set<String> WORKED_STATUSES = Set.of("PRESENT", "LATE", "ON_DUTY", "WORK_FROM_HOME");
    private static final Set<String> PAID_LEAVE_TYPES = Set.of(
            "CASUAL_LEAVE", "SICK_LEAVE", "EARNED_LEAVE", "MATERNITY_LEAVE", "PATERNITY_LEAVE", "COMP_OFF"
    );

    private PayrollCalculator() {}

    /** Days in the month less the paid days off: the number one day's salary is worked out from. */
    public static int workingDays(int daysInMonth, int weekOffsPerMonth, int paidLeavesPerMonth) {
        return Math.max(1, daysInMonth - Math.max(0, weekOffsPerMonth) - Math.max(0, paidLeavesPerMonth));
    }

    /** Attendance summary for one person in one month. */
    public static final class DayCount {
        public int daysInMonth;
        /** Days on the payroll this month: from the joining date (or the 1st) to the exit date (or month end). */
        public int employedDays;
        /** Days in the month less the paid days off; one unpaid day = salary / this. */
        public int workingDays;
        /** Paid days off for this person this month (prorated for part months). */
        public double daysOffAllowed;
        /** Days counted so far that they did not work. */
        public double daysOffTaken;
        public double workedDays;
        /** Approved paid-type leave on days not worked (shown on the payslip; counts as a day off). */
        public double paidLeaveDays;
        /** Approved loss-of-pay leave on days not worked (shown on the payslip; counts as a day off). */
        public double unpaidLeaveDays;
        /** Days not worked with no approved leave (week offs and absences). */
        public double absentDays;
        /** Unpaid days: days off beyond the allowance, rounded down. */
        public int suggestedLopDays;
        /** True when there was not a single check-in in the counted part of the month. */
        public boolean noAttendance;
    }

    /**
     * Counts worked days and days off for one person.
     *
     * Only days up to {@code countUntil} are judged, so running payroll before the month ends does not
     * treat the remaining days as days off.
     */
    public static DayCount countDays(
            YearMonth month,
            LocalDate joiningDate,
            LocalDate exitDate,
            int weekOffsPerMonth,
            int paidLeavesPerMonth,
            LocalDate countUntil,
            List<AttendanceRecord> attendance,
            List<LeaveRequest> approvedLeaves,
            List<OnDutyRequest> approvedDuties
    ) {
        DayCount c = new DayCount();
        LocalDate monthStart = month.atDay(1);
        LocalDate monthEnd = month.atEndOfMonth();
        c.daysInMonth = month.lengthOfMonth();
        int daysOffPerMonth = Math.max(0, weekOffsPerMonth) + Math.max(0, paidLeavesPerMonth);
        c.workingDays = workingDays(c.daysInMonth, weekOffsPerMonth, paidLeavesPerMonth);

        LocalDate start = joiningDate != null && joiningDate.isAfter(monthStart) ? joiningDate : monthStart;
        LocalDate last = exitDate != null && exitDate.isBefore(monthEnd) ? exitDate : monthEnd;
        if (start.isAfter(last)) {
            c.employedDays = 0;
            return c;
        }
        c.employedDays = (int) ChronoUnit.DAYS.between(start, last) + 1;
        // Part month: the paid days off shrink in proportion (17 of 31 days employed: 5 x 17 / 31 = 3)
        c.daysOffAllowed = c.employedDays == c.daysInMonth
                ? daysOffPerMonth
                : Math.round(daysOffPerMonth * (double) c.employedDays / c.daysInMonth);

        LocalDate end = countUntil.isBefore(last) ? countUntil : last;
        if (end.isBefore(start)) return c; // nothing to judge yet

        Map<LocalDate, Double> worked = new HashMap<>();
        for (AttendanceRecord r : attendance) {
            LocalDate d = r.getDate();
            if (d == null || d.isBefore(start) || d.isAfter(end)) continue;
            String status = r.getStatus() == null ? "" : r.getStatus().toUpperCase();
            double value;
            if ("HALF_DAY".equals(status)) value = 0.5;
            else if (WORKED_STATUSES.contains(status) || (r.getCheckIn() != null && !"ABSENT".equals(status))) value = 1.0;
            else value = 0.0;
            worked.merge(d, value, Math::max);
        }
        for (OnDutyRequest od : approvedDuties) {
            LocalDate d = od.getDutyDate();
            if (d == null || d.isBefore(start) || d.isAfter(end)) continue;
            worked.merge(d, 1.0, Math::max);
        }

        Map<LocalDate, Boolean> leaveIsPaid = new HashMap<>();
        for (LeaveRequest l : approvedLeaves) {
            LocalDate from = l.getStartDate();
            LocalDate to = l.getEndDate();
            if (from == null) continue;
            if (to == null || to.isBefore(from)) to = from;
            boolean paid = PAID_LEAVE_TYPES.contains(l.getLeaveType() == null ? "" : l.getLeaveType().toUpperCase());
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                if (d.isBefore(start) || d.isAfter(end)) continue;
                leaveIsPaid.merge(d, paid, (a, b) -> a || b);
            }
        }

        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            double w = Math.min(1.0, worked.getOrDefault(d, 0.0));
            double off = 1.0 - w;
            c.workedDays += w;
            c.daysOffTaken += off;
            if (off <= 0) continue;
            Boolean leave = leaveIsPaid.get(d);
            if (leave == null) c.absentDays += off;
            else if (leave) c.paidLeaveDays += off;
            else c.unpaidLeaveDays += off;
        }
        c.noAttendance = worked.values().stream().noneMatch(v -> v > 0);

        // Half days are rounded down so the cut never takes more than is certain
        int lop = (int) Math.floor(Math.max(0.0, c.daysOffTaken - c.daysOffAllowed) + 1e-9);
        c.suggestedLopDays = Math.min(lop, c.employedDays);
        return c;
    }

    /**
     * Copies a person's salary setup (as saved at onboarding or when edited) onto a payslip.
     *
     * <p>There are two ways to set pay up, and they never mix:
     * <ul>
     *   <li><b>Yearly salary</b>: no earning lines are saved. The month's salary is the yearly
     *       salary divided by 12 (₹3,00,000 a year is ₹25,000 a month) and is paid as one line.</li>
     *   <li><b>Salary breakdown</b>: the earning lines (basic, HRA, allowances...) are the salary.</li>
     * </ul>
     * Deductions are the same list in both cases. Only what was added for this person is taken:
     * PF and ESI are switched on by adding them and are worked out each month by rule; professional
     * tax, TDS and anything else are the monthly amounts entered. Nothing added means nothing deducted.
     */
    public static void applySalarySetup(Payslip slip, double monthlySalary, List<Map<String, Object>> items) {
        double monthly = Math.max(0.0, monthlySalary);
        double basic = 0, hra = 0, special = 0, conveyance = 0, medical = 0, tds = 0, pt = 0, other = 0;
        boolean pf = false;
        boolean esi = false;
        for (Map<String, Object> item : items == null ? List.<Map<String, Object>>of() : items) {
            String type = String.valueOf(item.getOrDefault("type", "EARNING")).toUpperCase();
            String code = String.valueOf(item.getOrDefault("code", "")).toUpperCase();
            String name = String.valueOf(item.getOrDefault("name", "")).toUpperCase();
            double amount;
            try {
                amount = Math.max(0.0, Double.parseDouble(String.valueOf(item.get("amount"))));
            } catch (Exception e) {
                amount = 0.0;
            }
            if ("DEDUCTION".equals(type)) {
                if (code.equals("PF") || name.contains("PROVIDENT") || name.contains("EPF")) pf = true;
                else if (code.equals("ESI") || name.contains("STATE INSURANCE")) esi = true;
                else if (code.equals("PT") || name.contains("PROFESSIONAL")) pt += amount;
                else if (code.equals("TDS") || name.contains("INCOME TAX") || name.contains("TDS")) tds += amount;
                else other += amount;
            } else {
                if (code.equals("BASIC") || name.contains("BASIC")) basic += amount;
                else if (code.equals("HRA") || name.contains("RENT")) hra += amount;
                else if (code.equals("CONVEYANCE") || name.contains("CONVEYANCE") || name.contains("TRAVEL")) conveyance += amount;
                else if (code.equals("MEDICAL") || name.contains("MEDICAL")) medical += amount;
                else special += amount;
            }
        }

        if (basic + hra + special + conveyance + medical <= 0) {
            // Yearly salary: the whole monthly amount is the salary (and the base for PF, if added)
            basic = Math.round(monthly);
            hra = 0;
            special = 0;
            conveyance = 0;
            medical = 0;
        }

        slip.setBasic(basic);
        slip.setHra(hra);
        slip.setSpecialAllowance(special);
        slip.setConveyanceAllowance(conveyance);
        slip.setMedicalAllowance(medical);
        slip.setBonus(0.0);
        slip.setIncentives(0.0);
        slip.setTds(tds);
        slip.setOtherDeductions(other);
        slip.setHealthInsurance(0.0);
        slip.setPfApplicable(pf);
        slip.setEsiApplicable(esi);
        slip.setPtMonthly(pt);
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
        s.setLossOfPayDays(lop);
        s.setPayableDays(employed - lop);

        double full = nz(s.getBasic()) + nz(s.getHra()) + nz(s.getSpecialAllowance())
                + nz(s.getConveyanceAllowance()) + nz(s.getMedicalAllowance());
        s.setFullMonthlySalary(full);

        double earnedBase;
        Integer workingDays = s.getWorkingDays();
        if (workingDays != null && workingDays > 0) {
            // Pay for the days employed, less one day's pay (salary / working days) per unpaid day
            earnedBase = Math.max(0.0, Math.round(full * employed / daysInMonth - lop * full / workingDays));
        } else {
            // Payslips made before the week-off rule
            earnedBase = Math.round(full * (employed - lop) / daysInMonth);
        }
        s.setUnpaidAmount(full - earnedBase);
        double bonus = nz(s.getBonus()) + nz(s.getIncentives());
        double gross = earnedBase + bonus;
        s.setGrossMonthly(gross);

        double earnedBasic = full > 0 ? nz(s.getBasic()) * earnedBase / full : 0.0;
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

    private static double nz(Double v) {
        return v != null ? v : 0.0;
    }

    private static int nzInt(Integer v, int fallback) {
        return v != null && v > 0 ? v : fallback;
    }
}
