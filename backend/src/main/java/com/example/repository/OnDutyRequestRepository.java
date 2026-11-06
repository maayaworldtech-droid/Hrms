package com.example.repository;

import com.example.entity.OnDutyRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnDutyRequestRepository extends JpaRepository<OnDutyRequest, Long> {
    List<OnDutyRequest> findByEmployeeIdOrderByDutyDateDesc(Long employeeId);
    List<OnDutyRequest> findAllByOrderByDutyDateDesc();
    List<OnDutyRequest> findByStatusOrderByDutyDateDesc(String status);
}
