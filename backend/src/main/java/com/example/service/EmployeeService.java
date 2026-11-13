package com.example.service;

import com.example.entity.Employee;

import java.util.List;
import java.util.Optional;

public interface EmployeeService {
    List<Employee> getAllEmployees();
    Optional<Employee> getEmployeeById(Long id);
    Employee onboardEmployee(Employee employee, String portalUrl);
    Employee saveEmployee(Employee employee);
    Optional<Employee> updateEmployee(Long id, Employee employee);
    boolean deleteEmployee(Long id);

    boolean resendWelcomeEmail(Long id, String portalUrl);
    boolean resendWelcomeEmailByEmail(String email, String portalUrl);
}
