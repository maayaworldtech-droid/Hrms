package com.example.service;

import com.example.entity.AttendanceRecord;
import com.example.entity.Employee;
import com.example.entity.LeaveRequest;
import com.example.entity.OnDutyRequest;
import com.example.entity.Payslip;
import org.springframework.stereotype.Component;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The wording of every staff notification and email, in one place. Controllers call these after
 * the change has been saved; {@link NotificationService} takes care of "only once" and "only after
 * it is saved for good".
 */
@Component
public class StaffNotices {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

    private final NotificationService notifications;

    public StaffNotices(NotificationService notifications) {
        this.notifications = notifications;
    }

    // ------------------------------------------------------------------ account

    /** In-app welcome note (the welcome email with sign-in details is sent by onboarding itself). */
    public void welcome(Employee emp) {
        notifications.notify(emp.getId(), "WELCOME", "WELCOME",
                "Welcome to Maaya World",
                "Check in from Home each day with your face. Apply for leave and On Duty, and see your payslips, from the tabs below.",
                "/employee/dashboard", null);
    }

    public void passwordChanged(Employee emp) {
        String when = LocalDateTime.now(BUSINESS_ZONE).format(DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a", Locale.ENGLISH));
        notifications.notify(emp.getId(), "ACCOUNT", "PASSWORD:" + System.currentTimeMillis(),
                "Your password was changed",
                "Your password was changed on " + when + ". If this was not you, tell your manager straight away.",
                "/employee/profile",
                new NotificationService.Email(
                        "Your Maaya World password was changed",
                        "Your password was changed",
                        "The password for your Maaya World staff account was changed on " + when
                                + ". If you did not do this, tell your center manager straight away so the account can be secured.",
                        List.of(), null));
    }

    public void faceUpdated(Employee emp) {
        notifications.notify(emp.getId(), "ACCOUNT", "FACE:" + System.currentTimeMillis(),
                "Your check-in face was updated",
                "The admin saved a new photo of your face for check-in. Use it from your next check-in.",
                "/employee/dashboard",
                new NotificationService.Email(
                        "Your check-in face was updated",
                        "Your check-in face was updated",
                        "The admin saved a new photo of your face for daily check-in. If you did not expect this, tell your center manager.",
                        List.of(), "Open Maaya World"));
    }

    public void centerChanged(Employee emp, String newCenter) {
        if (newCenter == null || newCenter.isBlank()) return;
        notifications.notify(emp.getId(), "ACCOUNT", "CENTER:" + newCenter + ":" + LocalDate.now(BUSINESS_ZONE),
                "You have moved to " + newCenter,
                "From now on you check in at " + newCenter + ".",
                "/employee/dashboard",
                new NotificationService.Email(
                        "You have moved to " + newCenter,
                        "You have moved to " + newCenter,
                        "Your center has been changed. From now on you check in at " + newCenter + ".",
                        rows("Center", newCenter), "Open Maaya World"));
    }

    // ------------------------------------------------------------------ leave

    public void leaveDecided(LeaveRequest req, String previousStatus) {
        String status = upper(req.getStatus());
        String verb = switch (status) {
            case "APPROVED" -> "approved";
            case "REJECTED" -> "not approved";
            case "CANCELLED" -> "cancelled";
            default -> null;
        };
        if (verb == null) return;
        String dates = range(req.getStartDate(), req.getEndDate());
        String title = "Leave " + verb + ": " + dates;
        String message = label(req.getLeaveType()) + " for " + days(req.getDays()) + " was " + verb
                + (req.getReviewedBy() != null ? " by " + req.getReviewedBy() : "") + "."
                + note(req.getReviewerComments());
        notifications.notify(req.getEmployeeId(), "LEAVE",
                notifications.decisionKey(req.getEmployeeId(), "LEAVE:" + req.getId(), upper(previousStatus) + ">" + status),
                title, message, "/employee/leaves",
                new NotificationService.Email(
                        "Your leave was " + verb + " (" + dates + ")",
                        "Your leave was " + verb,
                        "APPROVED".equals(status)
                                ? "Your leave request has been approved."
                                : "REJECTED".equals(status)
                                ? "Your leave request was not approved. Speak to your center manager if you have questions."
                                : "Your leave has been cancelled.",
                        rows("Dates", dates,
                                "Days", days(req.getDays()),
                                "Type", label(req.getLeaveType()),
                                "Decided by", req.getReviewedBy(),
                                "Note", req.getReviewerComments()),
                        "See my leave"));
    }

    // ------------------------------------------------------------------ on duty and expenses

    public void onDutyAssigned(OnDutyRequest req) {
        String day = date(req.getDutyDate());
        notifications.notify(req.getEmployeeId(), "ON_DUTY", "OD:" + req.getId() + ":ASSIGNED",
                "On Duty on " + day,
                label(req.getDutyType()) + " on " + day + timeRange(req.getStartTime(), req.getEndTime()) + "." + note(req.getReason()),
                "/employee/on-duty",
                new NotificationService.Email(
                        "On Duty on " + day,
                        "You have On Duty on " + day,
                        "Your manager has put you on duty outside the center. It counts as a working day.",
                        rows("Date", day,
                                "Time", timeText(req.getStartTime(), req.getEndTime()),
                                "Work", label(req.getDutyType()),
                                "Details", req.getReason(),
                                "Set by", req.getReviewedBy()),
                        "See On Duty"));
    }

    public void onDutyDecided(OnDutyRequest req, String previousStatus) {
        String status = upper(req.getStatus());
        String verb = switch (status) {
            case "APPROVED" -> "approved";
            case "REJECTED" -> "not approved";
            case "COMPLETED" -> "marked as done";
            case "CANCELLED" -> "cancelled";
            default -> null;
        };
        if (verb == null) return;
        String day = date(req.getDutyDate());
        notifications.notify(req.getEmployeeId(), "ON_DUTY",
                notifications.decisionKey(req.getEmployeeId(), "OD:" + req.getId(), upper(previousStatus) + ">" + status),
                "On Duty " + verb + ": " + day,
                label(req.getDutyType()) + " on " + day + " was " + verb
                        + (req.getReviewedBy() != null ? " by " + req.getReviewedBy() : "") + "." + note(req.getReviewerComments()),
                "/employee/on-duty",
                new NotificationService.Email(
                        "Your On Duty was " + verb + " (" + day + ")",
                        "Your On Duty was " + verb,
                        "REJECTED".equals(status)
                                ? "Your On Duty request was not approved. Speak to your center manager if you have questions."
                                : "There is an update on your On Duty request.",
                        rows("Date", day,
                                "Time", timeText(req.getStartTime(), req.getEndTime()),
                                "Work", label(req.getDutyType()),
                                "Status", capitalise(verb),
                                "Decided by", req.getReviewedBy(),
                                "Note", req.getReviewerComments()),
                        "See On Duty"));
    }

    public void expenseDecided(OnDutyRequest req, String previousStatus) {
        String status = upper(req.getReimbursementStatus());
        boolean paid = "REIMBURSED".equals(status);
        if (!paid && !"REJECTED".equals(status)) return;
        String amount = rupees(req.getExpenseAmount());
        String day = date(req.getDutyDate());
        String title = paid ? "Expense claim approved: " + amount : "Expense claim not approved: " + amount;
        notifications.notify(req.getEmployeeId(), "EXPENSE",
                notifications.decisionKey(req.getEmployeeId(), "EXPENSE:" + req.getId(), upper(previousStatus) + ">" + status),
                title,
                (paid ? "Your " + amount + " claim for On Duty on " + day + " was approved for payment."
                        : "Your " + amount + " claim for On Duty on " + day + " was not approved.")
                        + note(req.getReimbursementComments()),
                "/employee/on-duty",
                new NotificationService.Email(
                        (paid ? "Expense claim approved: " : "Expense claim not approved: ") + amount,
                        paid ? "Your expense claim was approved" : "Your expense claim was not approved",
                        paid ? "Your expense claim has been approved and will be paid to you."
                                : "Your expense claim was not approved. Speak to your center manager if you have questions.",
                        rows("Amount", amount,
                                "On Duty date", day,
                                "What for", req.getExpenseDescription(),
                                "Decided by", req.getReimbursedBy(),
                                "Note", req.getReimbursementComments()),
                        "See On Duty"));
    }

    // ------------------------------------------------------------------ attendance and salary

    public void correctionApproved(AttendanceRecord rec) {
        String day = date(rec.getDate());
        notifications.notify(rec.getEmployeeId(), "ATTENDANCE", notifications.decisionKey(rec.getEmployeeId(), "CORRECTION:" + rec.getId(), "APPROVED"),
                "Attendance corrected: " + day,
                "Your correction for " + day + " was approved. The day now counts as present.",
                "/employee/dashboard",
                new NotificationService.Email(
                        "Attendance corrected for " + day,
                        "Your attendance was corrected",
                        "Your correction request was approved. The day now counts as present.",
                        rows("Date", day, "Your reason", rec.getRegularizationReason()),
                        "See my attendance"));
    }

    public void salaryPaid(Payslip slip) {
        String period = slip.getMonth() + " " + slip.getYear();
        String net = rupees(slip.getNetMonthly());
        String bank = slip.getBankAccount() != null && slip.getBankAccount().length() >= 4
                ? (slip.getBankName() != null && !slip.getBankName().isBlank() ? slip.getBankName() + " " : "") + "account ending " + slip.getBankAccount().substring(slip.getBankAccount().length() - 4)
                : null;
        Integer daysInMonth = slip.getDaysInMonth();
        notifications.notify(slip.getEmployeeId(), "SALARY", "SALARY:" + slip.getId(),
                "Salary for " + period + " paid: " + net,
                "Your take-home pay of " + net + " for " + period + " has been paid" + (bank != null ? " to your " + bank : "") + ". Your payslip is ready.",
                "/employee/salary",
                new NotificationService.Email(
                        "Salary paid for " + period + ": " + net,
                        "Your salary for " + period + " has been paid",
                        "Your salary has been paid. Your payslip is in the Payslips tab.",
                        rows("Month", period,
                                "Paid for", daysInMonth != null ? slip.getPayableDays() + " of " + daysInMonth + " days" : null,
                                "Earned", rupees(slip.getGrossMonthly()),
                                "Deductions", rupees(slip.getTotalDeductions()),
                                "Take-home pay", net,
                                "Paid to", bank,
                                "Paid on", date(slip.getPaymentDate())),
                        "See my payslip"));
    }

    // ------------------------------------------------------------------ helpers

    private static List<String[]> rows(String... labelValuePairs) {
        List<String[]> out = new ArrayList<>();
        for (int i = 0; i + 1 < labelValuePairs.length; i += 2) {
            String value = labelValuePairs[i + 1];
            if (value != null && !value.isBlank()) out.add(new String[]{labelValuePairs[i], value});
        }
        return out;
    }

    private static String upper(String s) {
        return s == null ? "PENDING" : s.trim().toUpperCase(Locale.ROOT);
    }

    /** CASUAL_LEAVE -> "Casual leave". */
    private static String label(String code) {
        if (code == null || code.isBlank()) return "Leave";
        String s = code.trim().replace('_', ' ').toLowerCase(Locale.ROOT);
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String capitalise(String s) {
        return s == null || s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String date(LocalDate d) {
        return d == null ? null : d.format(DAY);
    }

    private static String range(LocalDate from, LocalDate to) {
        if (from == null) return "";
        if (to == null || to.equals(from)) return from.format(DAY);
        return from.format(DAY) + " to " + to.format(DAY);
    }

    private static String days(Double d) {
        if (d == null) return null;
        String n = d == Math.floor(d) ? String.valueOf(d.longValue()) : String.valueOf(d);
        return n + (d == 1.0 ? " day" : " days");
    }

    private static String timeText(LocalTime start, LocalTime end) {
        if (start == null) return null;
        return end == null ? "From " + start.format(TIME) : start.format(TIME) + " to " + end.format(TIME);
    }

    private static String timeRange(LocalTime start, LocalTime end) {
        String t = timeText(start, end);
        return t == null ? "" : ", " + Character.toLowerCase(t.charAt(0)) + t.substring(1);
    }

    private static String note(String comments) {
        return comments == null || comments.isBlank() ? "" : " Note: " + comments.trim();
    }

    private static String rupees(Double amount) {
        if (amount == null) return null;
        NumberFormat f = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        f.setMaximumFractionDigits(0);
        f.setMinimumFractionDigits(0);
        return f.format(Math.round(amount));
    }
}
