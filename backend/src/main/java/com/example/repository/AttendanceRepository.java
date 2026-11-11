package com.example.repository;

import com.example.entity.AttendanceRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long>, JpaSpecificationExecutor<AttendanceRecord> {
    List<AttendanceRecord> findByEmployeeIdOrderByDateDesc(Long employeeId);
    Slice<AttendanceRecord> findByEmployeeIdAndDateBetweenOrderByDateDescIdDesc(
            Long employeeId,
            String fromDate,
            String toDate,
            Pageable pageable
    );
    boolean existsByEmployeeIdAndDateLessThan(Long employeeId, String date);
    Optional<AttendanceRecord> findByEmployeeIdAndDate(Long employeeId, String date);
    List<AttendanceRecord> findAllByOrderByDateDesc();
}
