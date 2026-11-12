package com.example.repository;

import com.example.entity.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayslipRepository extends JpaRepository<Payslip, Long> {
    List<Payslip> findByEmployeeIdOrderByYearDescMonthDesc(Long employeeId);
    List<Payslip> findByPayrollRunId(Long payrollRunId);
    void deleteByPayrollRunId(Long payrollRunId);

    /** Keeps the denormalized center name in step when a center is renamed. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional
    @Query("update Payslip r set r.location = :newName where lower(r.location) = lower(:oldName)")
    int renameLocation(@Param("oldName") String oldName, @Param("newName") String newName);
}
