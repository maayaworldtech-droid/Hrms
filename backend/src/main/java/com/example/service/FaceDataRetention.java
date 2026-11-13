package com.example.service;

import com.example.repository.AttendanceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Check-in photos and face data are kept for a limited time (90 days by default) so the database
 * does not grow by about 1 GB a month. The attendance row itself (date, times, status, location,
 * whether the face matched) is kept for good; only the image and face measurements are cleared.
 * Reference photos on employee records and On Duty bills are not touched.
 */
@Component
public class FaceDataRetention {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");

    private final AttendanceRepository attendanceRepository;
    private final int keepDays;

    public FaceDataRetention(AttendanceRepository attendanceRepository,
                             @Value("${hrms.attendance.face-data-retention-days:90}") int keepDays) {
        this.attendanceRepository = attendanceRepository;
        this.keepDays = Math.max(1, keepDays);
    }

    /** Every night at 02:30 India time. */
    @Scheduled(cron = "0 30 2 * * *", zone = "Asia/Kolkata")
    public void clearOldFaceData() {
        LocalDate cutoff = LocalDate.now(BUSINESS_ZONE).minusDays(keepDays);
        int cleared = attendanceRepository.clearFaceDataBefore(cutoff);
        if (cleared > 0) {
            System.out.println("Cleared check-in photos older than " + cutoff + " from " + cleared + " attendance record(s)");
        }
    }

    /** Also once at startup, in case the server was off at 02:30. */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        clearOldFaceData();
    }
}
