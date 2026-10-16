package com.example.repository;

import com.example.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findByEmployeeIdOrderByDateDesc(Long employeeId);
    Optional<AttendanceRecord> findByEmployeeIdAndDate(Long employeeId, String date);
    List<AttendanceRecord> findAllByOrderByDateDesc();
}
