package com.example.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Service
public class ZeptoMailService {

    @Value("${zeptomail.url:https://api.zeptomail.in/v1.1/email}")
    private String zeptoUrl;

    @Value("${zeptomail.token:Zoho-enczapikey PHtE6r0NFL2/jTQp+xED4f+7EsOmYY1//bk0LAQS4Y1ACaRRSk1Vq9x4lz7lrRx5BvEXQKSdmo1v5bPOs7+BcG7lZDlKXmqyqK3sx/VYSPOZsbq6x00Ztl8cf03ZUYfsdN5q1S3fu9fcNA==}")
    private String zeptoToken;

    @Value("${zeptomail.from.name:Maaya World}")
    private String fromName;

    @Value("${zeptomail.from.email:noreply@themaayaworld.com}")
    private String fromEmail;

    @Value("${hrms.portal.url:http://localhost:5173/login}")
    private String portalUrl;

    @Value("${hrms.logo.url:https://raw.githubusercontent.com/maayaworldtech-droid/Hrms/main/src/assets/logo-new.png}")
    private String logoUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public boolean sendOnboardingEmail(String recipientEmail, String recipientName, String employeeCode, String defaultPassword) {
        return sendOnboardingEmail(recipientEmail, recipientName, employeeCode, defaultPassword, null);
    }

    public boolean sendOnboardingEmail(String recipientEmail, String recipientName, String employeeCode, String defaultPassword, String customPortalUrl) {
        String basePortalUrl = (customPortalUrl != null && !customPortalUrl.trim().isEmpty()) ? customPortalUrl.trim() : this.portalUrl;
        
        // Ensure dynamic email query parameter is appended for seamless login experience
        String dynamicUrl = basePortalUrl;
        if (recipientEmail != null && !recipientEmail.trim().isEmpty()) {
            try {
                String encodedEmail = URLEncoder.encode(recipientEmail.trim(), StandardCharsets.UTF_8);
                if (dynamicUrl.contains("?")) {
                    dynamicUrl += "&email=" + encodedEmail;
                } else {
                    dynamicUrl += "?email=" + encodedEmail;
                }
            } catch (Exception ignored) {}
        }

        String subject = "Welcome to Maaya World | Your Employee Account & Credentials";
        String htmlBody = buildHtmlEmailBody(recipientName, recipientEmail, employeeCode, defaultPassword, dynamicUrl);
        return dispatchZeptoEmail(recipientEmail, recipientName, subject, htmlBody);
    }

    public boolean sendPasswordResetEmail(String recipientEmail, String recipientName, String resetCode, String customPortalUrl) {
        String basePortalUrl = (customPortalUrl != null && !customPortalUrl.trim().isEmpty()) ? customPortalUrl.trim() : this.portalUrl;
        String dynamicUrl = basePortalUrl.replace("/login", "/forgot-password");
        if (recipientEmail != null && !recipientEmail.trim().isEmpty()) {
            try {
                String encodedEmail = URLEncoder.encode(recipientEmail.trim(), StandardCharsets.UTF_8);
                dynamicUrl += (dynamicUrl.contains("?") ? "&" : "?") + "email=" + encodedEmail + "&token=" + resetCode;
            } catch (Exception ignored) {}
        }

        String subject = "Maaya World HRMS | Password Recovery Verification Code: " + resetCode;
        String htmlBody = buildPasswordResetHtml(recipientName, recipientEmail, resetCode, dynamicUrl);
        return dispatchZeptoEmail(recipientEmail, recipientName, subject, htmlBody);
    }

    private boolean dispatchZeptoEmail(String recipientEmail, String recipientName, String subject, String htmlBody) {
        try {
            StringBuilder sb = new StringBuilder("{");
            sb.append("\"from\":{\"address\":\"").append(escapeJson(fromEmail))
              .append("\",\"name\":\"").append(escapeJson(fromName)).append("\"},");
            sb.append("\"to\":[{\"email_address\":{\"address\":\"").append(escapeJson(recipientEmail))
              .append("\",\"name\":\"").append(escapeJson(recipientName)).append("\"}}],");
            sb.append("\"subject\":\"").append(escapeJson(subject)).append("\",");
            sb.append("\"htmlbody\":\"").append(escapeJson(htmlBody)).append("\"}");

            String jsonPayload = sb.toString();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(zeptoUrl))
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .header("Authorization", zeptoToken)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                System.out.println("ZeptoMail SUCCESS [HTTP " + response.statusCode() + "] to " + recipientEmail);
                return true;
            } else {
                System.err.println("ZeptoMail FAILED [HTTP " + response.statusCode() + "]: " + response.body());
                return false;
            }
        } catch (Exception e) {
            System.err.println("Error dispatching ZeptoMail: " + e.getMessage());
            return false;
        }
    }

    private String buildPasswordResetHtml(String recipientName, String recipientEmail, String resetCode, String resetUrl) {
        String cleanName = (recipientName != null && !recipientName.trim().isEmpty()) ? recipientName.trim() : "Team Member";
        String cleanEmail = (recipientEmail != null) ? recipientEmail.trim() : "";

        return "<!DOCTYPE html>"
                + "<html lang=\"en\">"
                + "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Password Recovery</title></head>"
                + "<body style=\"margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"background-color: #F8FAFC; padding: 32px 16px;\">"
                + "<tr><td align=\"center\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 580px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);\">"
                + "<tr><td style=\"height: 4px; background: linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%);\"></td></tr>"
                + "<tr><td style=\"padding: 28px 32px 20px 32px; border-bottom: 1px solid #F1F5F9;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">"
                + "<tr>"
                + "<td align=\"left\" valign=\"middle\">"
                + "<img src=\"" + logoUrl + "\" alt=\"Maaya World\" height=\"38\" style=\"display: block; height: 38px; width: auto; max-width: 150px; border: 0;\" />"
                + "</td>"
                + "<td align=\"right\" valign=\"middle\">"
                + "<span style=\"display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #475467; background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 9999px;\">Account Security</span>"
                + "</td>"
                + "</tr>"
                + "</table>"
                + "</td></tr>"
                + "<tr><td style=\"padding: 32px 32px 24px 32px;\">"
                + "<h1 style=\"margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;\">Password Reset Verification</h1>"
                + "<p style=\"margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;\">Hello <strong>" + cleanName + "</strong>,</p>"
                + "<p style=\"margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475467;\">We received a password reset request for your account associated with <strong>" + cleanEmail + "</strong>. Use the verification code below to authorize this password change:</p>"
                + "<div style=\"background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;\">"
                + "<div style=\"font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748B; margin-bottom: 8px;\">Verification Code</div>"
                + "<div style=\"font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0F172A;\">" + resetCode + "</div>"
                + "<div style=\"font-size: 12px; color: #B45309; margin-top: 8px;\">This code expires in 15 minutes. For security, never share it with anyone.</div>"
                + "</div>"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"margin-bottom: 24px;\">"
                + "<tr><td align=\"center\">"
                + "<a href=\"" + resetUrl + "\" target=\"_blank\" style=\"display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); text-align: center;\">Reset Password Online &rarr;</a>"
                + "</td></tr>"
                + "</table>"
                + "<p style=\"margin: 0; font-size: 13px; line-height: 1.6; color: #64748B;\">If you did not initiate this request, you can safely ignore this email; your existing password will remain secure.</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">"
                + "<tr><td style=\"font-size: 12px; color: #64748B; line-height: 1.6;\"><strong style=\"color: #334155;\">Maaya World Technologies Private Limited</strong><br>Corporate Operations Center &bull; Hyderabad, India</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</body></html>";
    }

    private String buildHtmlEmailBody(String recipientName, String recipientEmail, String employeeCode, String defaultPassword, String targetPortalUrl) {
        String cleanName = (recipientName != null && !recipientName.trim().isEmpty()) ? recipientName.trim() : "Team Member";
        String cleanCode = (employeeCode != null && !employeeCode.trim().isEmpty()) ? employeeCode.trim() : "MW-PENDING";
        String cleanEmail = (recipientEmail != null) ? recipientEmail.trim() : "";
        String cleanPassword = (defaultPassword != null) ? defaultPassword : "";
        String cleanPortalUrl = (targetPortalUrl != null && !targetPortalUrl.trim().isEmpty()) ? targetPortalUrl.trim() : this.portalUrl;

        return "<!DOCTYPE html>"
                + "<html lang=\"en\">"
                + "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>Welcome to Maaya World</title></head>"
                + "<body style=\"margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1E293B;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"background-color: #F8FAFC; padding: 32px 16px;\">"
                + "<tr><td align=\"center\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 580px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);\">"
                + "<tr><td style=\"height: 4px; background: linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%);\"></td></tr>"
                + "<tr><td style=\"padding: 28px 32px 20px 32px; border-bottom: 1px solid #F1F5F9;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">"
                + "<tr>"
                + "<td align=\"left\" valign=\"middle\">"
                + "<img src=\"" + logoUrl + "\" alt=\"Maaya World\" height=\"38\" style=\"display: block; height: 38px; width: auto; max-width: 150px; border: 0;\" />"
                + "</td>"
                + "<td align=\"right\" valign=\"middle\">"
                + "<span style=\"display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #475467; background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 9999px;\">Enterprise HRMS</span>"
                + "</td>"
                + "</tr>"
                + "</table>"
                + "</td></tr>"
                + "<tr><td style=\"padding: 32px 32px 24px 32px;\">"
                + "<h1 style=\"margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;\">Welcome to Maaya World</h1>"
                + "<p style=\"margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;\">Hello <strong>" + cleanName + "</strong>,</p>"
                + "<p style=\"margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475467;\">Your employee profile has been configured and activated in the Maaya World HRMS system. You now have access to attendance marking, leave applications, payroll summaries, and personal profile records.</p>"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 24px;\">"
                + "<tr><td style=\"padding: 20px;\">"
                + "<div style=\"font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748B; margin-bottom: 14px;\">Your Access Credentials</div>"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"font-size: 13px;\">"
                + "<tr><td style=\"padding: 6px 0; color: #64748B; width: 140px;\" valign=\"top\">Staff Code</td><td style=\"padding: 6px 0; color: #0F172A; font-weight: 600; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;\" valign=\"top\">" + cleanCode + "</td></tr>"
                + "<tr><td style=\"padding: 6px 0; color: #64748B;\" valign=\"top\">Corporate Email</td><td style=\"padding: 6px 0; color: #0F172A; font-weight: 600;\" valign=\"top\">" + cleanEmail + "</td></tr>"
                + "<tr><td style=\"padding: 8px 0; color: #64748B;\" valign=\"middle\">Temporary Password</td><td style=\"padding: 8px 0;\" valign=\"middle\"><code style=\"background-color: #EEF2F6; color: #1E293B; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; padding: 4px 8px; border-radius: 4px; font-size: 13px; font-weight: 700; border: 1px solid #CBD5E1; letter-spacing: 0.5px;\">" + cleanPassword + "</code></td></tr>"
                + "</table>"
                + "<div style=\"margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 12px; line-height: 1.5; color: #B45309;\"><strong>Security Policy:</strong> You will be required to change this temporary password upon your first login.</div>"
                + "</td></tr>"
                + "</table>"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"margin-bottom: 28px;\">"
                + "<tr><td align=\"center\">"
                + "<a href=\"" + cleanPortalUrl + "\" target=\"_blank\" style=\"display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); text-align: center;\">Sign In to Employee Portal &rarr;</a>"
                + "</td></tr>"
                + "</table>"
                + "<div style=\"background-color: #FFFFFF; border: 1px solid #F1F5F9; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;\">"
                + "<div style=\"font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 10px;\">Quick Setup Steps</div>"
                + "<ol style=\"margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #475467;\">"
                + "<li style=\"margin-bottom: 4px;\">Click the <strong>Sign In</strong> button above or navigate to the portal.</li>"
                + "<li style=\"margin-bottom: 4px;\">Enter your corporate email and temporary password.</li>"
                + "<li>Set a new, strong confidential password to complete activation.</li>"
                + "</ol>"
                + "</div>"
                + "<p style=\"margin: 0; font-size: 13px; line-height: 1.6; color: #64748B;\">If you encounter any issues logging in, please contact HR Operations or your system administrator.</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">"
                + "<tr><td style=\"font-size: 12px; color: #64748B; line-height: 1.6;\"><strong style=\"color: #334155;\">Maaya World Technologies Private Limited</strong><br>Corporate Operations Center &bull; Hyderabad, India<br><a href=\"https://themaayaworld.com\" target=\"_blank\" style=\"color: #2563EB; text-decoration: none;\">themaayaworld.com</a></td></tr>"
                + "<tr><td style=\"padding-top: 12px; font-size: 11px; color: #94A3B8; line-height: 1.5; border-top: 1px solid #EDF2F7; margin-top: 12px;\">This is an automated system notification containing confidential account access credentials. If you are not the intended recipient, please notify hr@themaayaworld.com and delete this message.</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</body></html>";
    }

    private String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\b", "\\b")
                    .replace("\f", "\\f")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
    }
}
