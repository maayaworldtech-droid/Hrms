package com.example.demo;

import com.example.entity.CompanySettings;
import com.example.entity.Employee;
import com.example.entity.LeaveBalance;
import com.example.entity.PayrollRun;
import com.example.entity.Payslip;
import com.example.repository.CompanySettingsRepository;
import com.example.repository.PayrollRunRepository;
import com.example.repository.PayslipRepository;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveBalanceRepository;
import com.example.security.PasswordHasher;
import com.example.service.CenterService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.function.Consumer;
import java.util.function.Supplier;

/**
 * Startup checks. Creates no demo people or departments: the only account it ensures is the
 * administrator, so someone can sign in and set everything else up from the admin panel.
 */
@Component
public class DataInitializer {

    private static final String ADMIN_EMAIL = "shyamsundaryedla1@gmail.com";

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;

    @Autowired
    private CompanySettingsRepository settingsRepository;

    @Autowired
    private CenterService centerService;

    @Autowired
    private PayrollRunRepository payrollRunRepository;

    @Autowired
    private PayslipRepository payslipRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initData() {
        System.out.println("Running startup checks...");

        // Centers: one-time rename of legacy short names to "Maaya World ..." and geofence setup
        centerService.migrateLegacyCenters();

        ensureAdministrator();
        clearLegacyPlaceholderSettings();
        removeOwnersFromDraftPayroll();

        // Anyone without a center (e.g. a freshly created admin) is assigned to the head center
        centerService.assignUnassignedEmployees();

        System.out.println("Startup checks complete.");
    }

    /**
     * Admins are the owners, not salaried staff. Drafts generated before that rule existed may still
     * hold payslips for them; remove those and correct the draft's totals. Paid months are never changed.
     */
    private void removeOwnersFromDraftPayroll() {
        Set<Long> adminIds = employeeRepository.findAll().stream()
                .filter(e -> "ADMIN".equalsIgnoreCase(e.getRole()))
                .map(Employee::getId)
                .collect(Collectors.toSet());
        if (adminIds.isEmpty()) return;

        for (PayrollRun run : payrollRunRepository.findAll()) {
            if ("DISBURSED".equalsIgnoreCase(run.getStatus())) continue;
            List<Payslip> slips = payslipRepository.findByPayrollRunId(run.getId());
            List<Payslip> ownerSlips = slips.stream().filter(s -> adminIds.contains(s.getEmployeeId())).toList();
            if (ownerSlips.isEmpty()) continue;

            payslipRepository.deleteAll(ownerSlips);
            List<Payslip> kept = slips.stream().filter(s -> !adminIds.contains(s.getEmployeeId())).toList();
            run.setTotalEmployees(kept.size());
            run.setTotalGrossPay(kept.stream().mapToDouble(s -> s.getGrossMonthly() != null ? s.getGrossMonthly() : 0.0).sum());
            run.setTotalDeductions(kept.stream().mapToDouble(s -> s.getTotalDeductions() != null ? s.getTotalDeductions() : 0.0).sum());
            run.setTotalNetPay(kept.stream().mapToDouble(s -> s.getNetMonthly() != null ? s.getNetMonthly() : 0.0).sum());
            payrollRunRepository.save(run);
            System.out.println("Removed " + ownerSlips.size() + " admin payslip(s) from draft payroll " + run.getMonth() + " " + run.getYear());
        }
    }

    /** Creates the administrator account if missing; never overwrites details on an existing one. */
    private void ensureAdministrator() {
        Optional<Employee> adminOpt = employeeRepository.findByEmailIgnoreCase(ADMIN_EMAIL);
        Employee admin;
        if (adminOpt.isEmpty()) {
            admin = new Employee();
            admin.setEmail(ADMIN_EMAIL);
            admin.setFirstName("Shyam Sundar");
            admin.setLastName("Yedla");
            admin.setEmployeeCode(resolveAvailableCode("MW-1000"));
            admin.setRole("ADMIN");
            admin.setPassword(PasswordHasher.hash("Admin@12345"));
            admin.setMustChangePassword(false);
            admin.setJobTitle("Administrator");
            admin.setEmploymentType("FULL_TIME");
            admin.setStatus("ACTIVE");
            admin.setShift("MORNING");
            admin.setDateOfJoining(LocalDate.now(ZoneId.of("Asia/Kolkata")).toString());
            admin = employeeRepository.save(admin);
            System.out.println("Created administrator account for: " + ADMIN_EMAIL);
        } else {
            admin = adminOpt.get();
            admin.setRole("ADMIN");
            admin.setMustChangePassword(false);
            if (admin.getPassword() == null || admin.getPassword().isEmpty()) {
                admin.setPassword(PasswordHasher.hash("Admin@12345"));
            } else if (!PasswordHasher.isHashed(admin.getPassword())) {
                admin.setPassword(PasswordHasher.hash(admin.getPassword()));
            }
            employeeRepository.save(admin);
        }

        if (leaveBalanceRepository.findByEmployeeId(admin.getId()).isEmpty()) {
            LeaveBalance lb = new LeaveBalance();
            lb.setEmployeeId(admin.getId());
            leaveBalanceRepository.save(lb);
        }
    }

    /**
     * Earlier versions filled company settings with made-up registration numbers and an office address.
     * Clear a field only when it still holds that exact placeholder, so anything the admin typed survives.
     */
    private void clearLegacyPlaceholderSettings() {
        settingsRepository.findAll().stream().findFirst().ifPresent(settings -> {
            int cleared = 0;
            cleared += clearIfPlaceholder(settings::getLegalEntityName, settings::setLegalEntityName);
            cleared += clearIfPlaceholder(settings::getCorporateTaxId, settings::setCorporateTaxId);
            cleared += clearIfPlaceholder(settings::getPfRegistrationNo, settings::setPfRegistrationNo);
            cleared += clearIfPlaceholder(settings::getEsiRegistrationNo, settings::setEsiRegistrationNo);
            cleared += clearIfPlaceholder(settings::getRegisteredAddress, settings::setRegisteredAddress);
            cleared += clearIfPlaceholder(settings::getContactEmail, settings::setContactEmail);
            cleared += clearIfPlaceholder(settings::getContactPhone, settings::setContactPhone);
            if (cleared > 0) {
                settingsRepository.save(settings);
                System.out.println("Cleared " + cleared + " placeholder company setting(s); fill them in from Settings.");
            }
        });
    }

    private int clearIfPlaceholder(Supplier<String> getter, Consumer<String> setter) {
        String value = getter.get();
        if (value != null && CompanySettings.LEGACY_SEED_VALUES.contains(value.trim())) {
            setter.accept("");
            return 1;
        }
        return 0;
    }

    private String resolveAvailableCode(String preferredCode) {
        if (!employeeRepository.existsByEmployeeCode(preferredCode)) {
            return preferredCode;
        }
        int suffix = 1001;
        while (employeeRepository.existsByEmployeeCode("MW-" + suffix)) {
            suffix++;
        }
        return "MW-" + suffix;
    }
}
