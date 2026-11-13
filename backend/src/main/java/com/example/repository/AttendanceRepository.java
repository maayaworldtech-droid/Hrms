package com.example.repository;

import java.time.LocalDate;
import com.example.entity.AttendanceRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long>, JpaSpecificationExecutor<AttendanceRecord> {
    List<AttendanceRecord> findByEmployeeIdOrderByDateDesc(Long employeeId);
    Slice<AttendanceRecord> findByEmployeeIdAndDateBetweenOrderByDateDescIdDesc(
            Long employeeId,
            LocalDate fromDate,
            LocalDate toDate,
            Pageable pageable
    );
    boolean existsByEmployeeIdAndDateLessThan(Long employeeId, LocalDate date);
    Optional<AttendanceRecord> findByEmployeeIdAndDate(Long employeeId, LocalDate date);
    List<AttendanceRecord> findAllByOrderByDateDesc();

    /** Every record in a date range (dates are stored as YYYY-MM-DD, so string order is date order). */
    List<AttendanceRecord> findByDateBetween(LocalDate fromDate, LocalDate toDate);

    /** Clears check-in photos and face data older than the cut-off; returns how many rows changed. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query(
            "update AttendanceRecord a set a.facePhoto = null, a.faceBiometrics = null "
                    + "where a.date < :cutoff and (a.facePhoto is not null or a.faceBiometrics is not null)")
    int clearFaceDataBefore(@org.springframework.data.repository.query.Param("cutoff") LocalDate cutoff);

    /** Keeps the denormalized center name in step when a center is renamed. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Transactional
    @Query("update AttendanceRecord r set r.location = :newName where lower(r.location) = lower(:oldName)")
    int renameLocation(@Param("oldName") String oldName, @Param("newName") String newName);
}
