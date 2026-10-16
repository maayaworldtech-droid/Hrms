package com.example.service;

import com.example.entity.Employee;

import java.util.List;
import java.util.Optional;

public interface EmployeeService {
    List<Employee> getAllEmployees();
    Optional<Employee> getEmployeeById(Long id);
    Optional<Employee> getEmployeeByCode(String code);
    Optional<Employee> getEmployeeByEmail(String email);
    Employee onboardEmployee(Employee employee);
    Employee createEmployee(Employee employee);
    Optional<Employee> updateEmployee(Long id, Employee employee);
    boolean deleteEmployee(Long id);

    boolean resendWelcomeEmail(Long id);
    boolean resendWelcomeEmailByEmail(String email);

    // Backward-compatibility aliases
    default List<Employee> getAllStudents() { return getAllEmployees(); }
    default Optional<Employee> getStudentById(Long id) { return getEmployeeById(id); }
    default Employee createStudent(Employee student) { return createEmployee(student); }
    default Optional<Employee> updateStudent(Long id, Employee student) { return updateEmployee(id, student); }
    default boolean deleteStudent(Long id) { return deleteEmployee(id); }
}
