package com.example.repository;

import com.example.entity.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayrollRunRepository extends JpaRepository<PayrollRun, Long> {
    List<PayrollRun> findAllByOrderByYearDescMonthDesc();
}
