package com.example.repository;

import com.example.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByEmployeeIdOrderByAppliedOnDesc(Long employeeId);
    List<LeaveRequest> findAllByOrderByAppliedOnDesc();
    List<LeaveRequest> findByStatusOrderByAppliedOnDesc(String status);

    /** Keeps the denormalized center name in step when a center is renamed. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional
    @Query("update LeaveRequest r set r.location = :newName where lower(r.location) = lower(:oldName)")
    int renameLocation(@Param("oldName") String oldName, @Param("newName") String newName);
}
