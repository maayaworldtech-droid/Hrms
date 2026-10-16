package com.example.controller;

import com.example.entity.AttendanceRecord;
import com.example.entity.Employee;
import com.example.repository.AttendanceRepository;
import com.example.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

    @GetMapping
    public ResponseEntity<List<AttendanceRecord>> getAll() {
        return ResponseEntity.ok(attendanceRepository.findAllByOrderByDateDesc());
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<AttendanceRecord>> getByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(attendanceRepository.findByEmployeeIdOrderByDateDesc(employeeId));
    }

    @PostMapping("/check-in")
    public ResponseEntity<AttendanceRecord> checkIn(@RequestBody Map<String, Object> payload) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        String date = payload.get("date") != null ? payload.get("date").toString() : java.time.LocalDate.now().toString();
        String time = payload.get("time") != null ? payload.get("time").toString() : LocalTime.now().format(TIME_FORMATTER);

        Optional<AttendanceRecord> existingOpt = attendanceRepository.findByEmployeeIdAndDate(employeeId, date);
        AttendanceRecord record;
        if (existingOpt.isPresent()) {
            record = existingOpt.get();
            if (record.getCheckIn() == null) {
                record.setCheckIn(time);
            }
        } else {
            record = new AttendanceRecord();
            record.setEmployeeId(employeeId);
            record.setDate(date);
            record.setCheckIn(time);
            record.setStatus("PRESENT");

            employeeRepository.findById(employeeId).ifPresent(emp -> {
                record.setEmployeeName(emp.getFullName());
                record.setDepartmentName(emp.getDepartment());
                record.setLocation(emp.getLocationName());
                record.setShift(emp.getShift());
            });
        }

        record.setStatus("PRESENT");
        record.setRegularizationStatus("NONE");
        return ResponseEntity.ok(attendanceRepository.save(record));
    }

    @PostMapping("/check-out")
    public ResponseEntity<AttendanceRecord> checkOut(@RequestBody Map<String, Object> payload) {
        Long employeeId = Long.valueOf(payload.get("employeeId").toString());
        String date = payload.get("date") != null ? payload.get("date").toString() : java.time.LocalDate.now().toString();
        String time = payload.get("time") != null ? payload.get("time").toString() : LocalTime.now().format(TIME_FORMATTER);

        Optional<AttendanceRecord> existingOpt = attendanceRepository.findByEmployeeIdAndDate(employeeId, date);
        AttendanceRecord record;
        if (existingOpt.isPresent()) {
            record = existingOpt.get();
        } else {
            record = new AttendanceRecord();
            record.setEmployeeId(employeeId);
            record.setDate(date);
            record.setCheckIn("09:00:00");
            employeeRepository.findById(employeeId).ifPresent(emp -> {
                record.setEmployeeName(emp.getFullName());
                record.setDepartmentName(emp.getDepartment());
                record.setLocation(emp.getLocationName());
                record.setShift(emp.getShift());
            });
        }

        record.setCheckOut(time);
        record.setWorkHours(8.5);
        record.setStatus("PRESENT");
        return ResponseEntity.ok(attendanceRepository.save(record));
    }

    @PostMapping("/regularize")
    public ResponseEntity<AttendanceRecord> regularize(@RequestBody Map<String, Object> payload) {
        Long recordId = Long.valueOf(payload.get("recordId").toString());
        String reason = payload.get("reason") != null ? payload.get("reason").toString() : "Time adjustment";

        return attendanceRepository.findById(recordId).map(record -> {
            record.setRegularizationStatus("PENDING");
            record.setRegularizationReason(reason);
            return ResponseEntity.ok(attendanceRepository.save(record));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<AttendanceRecord> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        return attendanceRepository.findById(id).map(record -> {
            if (status != null) record.setStatus(status);
            return ResponseEntity.ok(attendanceRepository.save(record));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/approve-regularization")
    public ResponseEntity<AttendanceRecord> approveRegularization(@PathVariable Long id) {
        return attendanceRepository.findById(id).map(record -> {
            record.setRegularizationStatus("APPROVED");
            record.setStatus("PRESENT");
            return ResponseEntity.ok(attendanceRepository.save(record));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
