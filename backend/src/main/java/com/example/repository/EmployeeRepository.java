package com.example.repository;

import com.example.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    Optional<Employee> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmployeeCode(String employeeCode);
    List<Employee> findByLocation_LocationId(int locationId);
    List<Employee> findByLocationIsNull();
}