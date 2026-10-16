package com.example.demo;

import com.example.entity.Department;
import com.example.entity.Employee;
import com.example.entity.LeaveBalance;
import com.example.repository.DepartmentRepository;
import com.example.repository.EmployeeRepository;
import com.example.repository.LeaveBalanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;

@Component
public class DataInitializer {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private LeaveBalanceRepository leaveBalanceRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initData() {
        System.out.println("Checking and initializing live database seeds...");

        // 1. Ensure Admin User: shyamsundaryedla1@gmail.com
        String adminEmail = "shyamsundaryedla1@gmail.com";
        Optional<Employee> adminOpt = employeeRepository.findByEmail(adminEmail);
        Employee admin;
        if (adminOpt.isEmpty()) {
            admin = new Employee();
            admin.setEmail(adminEmail);
            admin.setFirstName("Shyam Sundar");
            admin.setLastName("Yedla");
            admin.setEmployeeCode("MW-1000");
            admin.setRole("ADMIN");
            admin.setPassword("Admin@12345");
            admin.setMustChangePassword(false);
            admin.setPhone("+91 98765 43210");
            admin.setAddress("Floor 5, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081");
            admin.setJobTitle("HR Administrator & Operations Lead");
            admin.setDepartment("Executive Management");
            admin.setEmploymentType("FULL_TIME");
            admin.setStatus("ACTIVE");
            admin.setShift("MORNING");
            admin.setDateOfJoining("2024-01-15");
            admin.setMonthlySalary(125000.0);
            admin.setCtcAnnual(1500000.0);
            admin.setBankName("HDFC Bank");
            admin.setAccountNumber("50100987654321");
            admin.setIfscCode("HDFC0001234");
            admin.setPanNumber("ABCDE1234F");
            admin.setUanNumber("100987654321");
            admin.setEmergencyContactName("Kavitha Yedla");
            admin.setEmergencyContactPhone("+91 98765 43211");
            admin.setEmergencyContactRelationship("Spouse");
            admin = employeeRepository.save(admin);
            System.out.println("Created administrator account for: " + adminEmail);
        } else {
            admin = adminOpt.get();
            admin.setRole("ADMIN");
            admin.setMustChangePassword(false);
            if (admin.getPassword() == null || admin.getPassword().isEmpty()) {
                admin.setPassword("Admin@12345");
            }
            employeeRepository.save(admin);
            System.out.println("Verified administrator role for: " + adminEmail);
        }

        // Initialize Leave Balance for admin
        if (leaveBalanceRepository.findByEmployeeId(admin.getId()).isEmpty()) {
            LeaveBalance lb = new LeaveBalance();
            lb.setEmployeeId(admin.getId());
            leaveBalanceRepository.save(lb);
        }

        // 2. Ensure Departments
        seedDepartment("Engineering", "ENG", "Kiran Varma", "kiran.varma@maayaworld.com", 24, 7500000.0);
        seedDepartment("Product & Design", "DES", "Ananya Reddy", "ananya.reddy@maayaworld.com", 8, 3000000.0);
        seedDepartment("Human Resources", "HR", "Shyam Sundar Yedla", adminEmail, 4, 1500000.0);
        seedDepartment("Finance & Accounts", "FIN", "Suresh Nair", "suresh.nair@maayaworld.com", 6, 2200000.0);
        seedDepartment("Sales & Operations", "OPS", "Rahul Sen", "rahul.sen@maayaworld.com", 12, 4000000.0);

        // 3. Ensure Team Manager (Rajesh Kumar) and Staff (Priya Sharma)
        seedStaffIfMissing(
                "rajesh.kumar@maayaworld.com", "Rajesh", "Kumar", "MW-1002", "MANAGER", "Manager@12345",
                "Senior Engineering Manager", "Engineering", 85000.0, "Hyderabad", "+91 98765 11223"
        );
        seedStaffIfMissing(
                "priya.sharma@maayaworld.com", "Priya", "Sharma", "MW-1003", "EMPLOYEE", "Welcome@2026",
                "Senior Software Engineer", "Engineering", 65000.0, "Hyderabad", "+91 99887 76655"
        );

        System.out.println("Live PostgreSQL database initialization complete!");
    }

    private void seedDepartment(String name, String code, String headName, String headEmail, int count, double budget) {
        if (departmentRepository.findByName(name).isEmpty()) {
            Department d = new Department();
            d.setName(name);
            d.setCode(code);
            d.setHeadName(headName);
            d.setHeadEmail(headEmail);
            d.setEmployeeCount(count);
            d.setBudgetAllocated(budget);
            departmentRepository.save(d);
        }
    }

    private void seedStaffIfMissing(
            String email, String first, String last, String code, String role, String pwd,
            String title, String dept, double salary, String loc, String phone
    ) {
        if (employeeRepository.findByEmail(email).isEmpty()) {
            Employee emp = new Employee();
            emp.setEmail(email);
            emp.setFirstName(first);
            emp.setLastName(last);
            emp.setEmployeeCode(code);
            emp.setRole(role);
            emp.setPassword(pwd);
            emp.setMustChangePassword(false);
            emp.setJobTitle(title);
            emp.setDepartment(dept);
            emp.setMonthlySalary(salary);
            emp.setCtcAnnual(salary * 12);
            emp.setPhone(phone);
            emp.setAddress("Cyber Hills, Madhapur, Hyderabad, Telangana 500081");
            emp.setDateOfJoining("2024-06-01");
            emp.setEmploymentType("FULL_TIME");
            emp.setStatus("ACTIVE");
            emp.setShift("MORNING");
            emp.setBankName("HDFC Bank");
            emp.setAccountNumber("918273645281");
            emp.setIfscCode("HDFC0001234");
            emp.setPanNumber("ABCPS1234F");
            emp.setUanNumber("100928374699");
            emp.setEmergencyContactName("Ramesh Sharma");
            emp.setEmergencyContactPhone("+91 98765 00000");
            emp.setEmergencyContactRelationship("Spouse");

            Employee saved = employeeRepository.save(emp);
            LeaveBalance lb = new LeaveBalance();
            lb.setEmployeeId(saved.getId());
            leaveBalanceRepository.save(lb);
        }
    }
}
