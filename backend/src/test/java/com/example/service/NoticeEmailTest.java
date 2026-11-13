package com.example.service;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NoticeEmailTest {

    private ZeptoMailService mail(String portalUrl) {
        ZeptoMailService mail = new ZeptoMailService();
        ReflectionTestUtils.setField(mail, "portalUrl", portalUrl);
        ReflectionTestUtils.setField(mail, "logoUrl", "https://example.invalid/logo.png");
        return mail;
    }

    @Test
    void salaryPaidEmailLinksToThePayslipsPage() throws Exception {
        String html = mail("http://localhost:5173/login").buildNoticeHtml(
                "Ravi Kumar",
                "Salary paid for October 2026: ₹25,000",
                "Your salary for October 2026 has been paid",
                "Your salary has been paid. Your payslip is in the Payslips tab.",
                List.of(new String[]{"Month", "October 2026"},
                        new String[]{"Paid for", "31 of 31 days"},
                        new String[]{"Take-home pay", "₹25,000"},
                        new String[]{"Paid to", "SBI account ending 4321"},
                        new String[]{"Note", ""}),
                "See my payslip",
                "/employee/salary");

        assertTrue(html.contains("href=\"http://localhost:5173/employee/salary\""), "button opens the payslips page");
        assertTrue(html.contains("₹25,000"));
        assertTrue(html.contains("Hello Ravi Kumar,"));
        assertFalse(html.contains(">Note<"), "empty rows are left out");

        // Saved for a look in a browser: target/notice-email-preview.html
        Files.writeString(Path.of("target", "notice-email-preview.html"), html, StandardCharsets.UTF_8);
    }

    @Test
    void textFromStaffIsEscaped() {
        String html = mail("https://hrms.example.invalid/").buildNoticeHtml(
                "<b>x</b>", "s", "h", "Reason: <script>alert(1)</script>",
                List.<String[]>of(new String[]{"Note", "\"quoted\" & <tag>"}), "Open", "/employee/leaves");
        assertFalse(html.contains("<script>"));
        assertTrue(html.contains("&lt;script&gt;"));
        assertTrue(html.contains("&quot;quoted&quot; &amp; &lt;tag&gt;"));
        assertTrue(html.contains("href=\"https://hrms.example.invalid/employee/leaves\""));
    }
}
