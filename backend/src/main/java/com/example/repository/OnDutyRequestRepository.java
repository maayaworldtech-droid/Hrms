package com.example.repository;

import com.example.entity.OnDutyRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OnDutyRequestRepository extends JpaRepository<OnDutyRequest, Long> {
    List<OnDutyRequest> findByEmployeeIdOrderByDutyDateDesc(Long employeeId);
    List<OnDutyRequest> findAllByOrderByDutyDateDesc();
    List<OnDutyRequest> findByStatusOrderByDutyDateDesc(String status);

    /** Keeps the denormalized center name in step when a center is renamed. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional
    @Query("update OnDutyRequest r set r.location = :newName where lower(r.location) = lower(:oldName)")
    int renameLocation(@Param("oldName") String oldName, @Param("newName") String newName);
}
