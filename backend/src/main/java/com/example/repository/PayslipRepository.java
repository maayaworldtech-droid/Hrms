package com.example.repository;

import com.example.entity.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, Long> {
    List<Payslip> findByEmployeeIdOrderByYearDescMonthDesc(Long employeeId);
    List<Payslip> findByPayrollRunId(Long payrollRunId);
}
