package com.example.repository;

import com.example.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByEmployeeIdOrderByAppliedOnDesc(Long employeeId);
    List<LeaveRequest> findAllByOrderByAppliedOnDesc();
    List<LeaveRequest> findByStatusOrderByAppliedOnDesc(String status);
}
