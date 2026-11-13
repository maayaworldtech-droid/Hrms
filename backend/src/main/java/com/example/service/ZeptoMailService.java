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

    @Value("${zeptomail.token:}")
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
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(30))
            .build();

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

        String subject = "Welcome to Maaya World: your sign-in details";
        String htmlBody = buildHtmlEmailBody(recipientName, recipientEmail, employeeCode, defaultPassword, dynamicUrl);
        return dispatchZeptoEmail(recipientEmail, recipientName, subject, htmlBody);
    }

    public boolean sendPasswordResetEmail(String recipientEmail, String recipientName, String resetCode, String customPortalUrl) {
        String basePortalUrl = (customPortalUrl != null && !customPortalUrl.trim().isEmpty()) ? customPortalUrl.trim() : this.portalUrl;
        String cleanBase = basePortalUrl.endsWith("/") ? basePortalUrl.substring(0, basePortalUrl.length() - 1) : basePortalUrl;
        String dynamicUrl = cleanBase.endsWith("/login")
                ? cleanBase.substring(0, cleanBase.length() - "/login".length()) + "/forgot-password"
                : cleanBase + "/forgot-password";
        if (recipientEmail != null && !recipientEmail.trim().isEmpty()) {
            try {
                String encodedEmail = URLEncoder.encode(recipientEmail.trim(), StandardCharsets.UTF_8);
                dynamicUrl += (dynamicUrl.contains("?") ? "&" : "?") + "email=" + encodedEmail + "&token=" + resetCode;
            } catch (Exception ignored) {}
        }

        String subject = "Maaya World HRMS | Password Recovery Verification Code";
        String htmlBody = buildPasswordResetHtml(recipientName, recipientEmail, resetCode, dynamicUrl);
        return dispatchZeptoEmail(recipientEmail, recipientName, subject, htmlBody);
    }

    /** True when a ZeptoMail token is set, so emails can actually be sent. */
    public boolean isConfigured() {
        return zeptoToken != null && !zeptoToken.trim().isEmpty();
    }

    /**
     * A short notice email (leave decided, salary paid, ...) in the same look as the welcome email:
     * a heading, one paragraph, a small table of details and a button that opens the right page.
     *
     * @param path page in the portal to open, for example /employee/leaves (may be null)
     */
    public boolean sendNoticeEmail(String recipientEmail, String recipientName, String subject, String heading,
                                   String intro, java.util.List<String[]> rows, String buttonLabel, String path) {
        return dispatchZeptoEmail(recipientEmail, recipientName, subject,
                buildNoticeHtml(recipientName, subject, heading, intro, rows, buttonLabel, path));
    }

    /** The HTML of a notice email (kept separate so it can be checked in tests). */
    String buildNoticeHtml(String recipientName, String subject, String heading,
                           String intro, java.util.List<String[]> rows, String buttonLabel, String path) {
        String base = this.portalUrl == null ? "" : this.portalUrl.trim();
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        if (base.endsWith("/login")) base = base.substring(0, base.length() - "/login".length());
        String target = path != null && path.startsWith("/") ? base + path : base + "/login";

        StringBuilder table = new StringBuilder();
        if (rows != null && !rows.isEmpty()) {
            table.append("<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 0 0 24px 0; font-size: 14px;\">");
            for (String[] row : rows) {
                if (row == null || row.length < 2 || row[1] == null || row[1].isBlank()) continue;
                table.append("<tr><td style=\"padding: 10px 16px; color: #475467; width: 45%; border-bottom: 1px solid #EEF2F6;\" valign=\"top\">")
                        .append(escapeHtml(row[0]))
                        .append("</td><td style=\"padding: 10px 16px; color: #0F172A; font-weight: 600; border-bottom: 1px solid #EEF2F6;\" valign=\"top\">")
                        .append(escapeHtml(row[1]))
                        .append("</td></tr>");
            }
            table.append("</table>");
        }

        String name = escapeHtml(recipientName != null && !recipientName.isBlank() ? recipientName.trim() : "there");
        String html = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>" + escapeHtml(subject) + "</title></head>"
                + "<body style=\"margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"background-color: #F8FAFC; padding: 32px 16px;\"><tr><td align=\"center\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 560px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden;\">"
                + "<tr><td style=\"padding: 24px 32px 18px 32px; border-bottom: 1px solid #F1F5F9;\"><img src=\"" + logoUrl + "\" alt=\"Maaya World\" height=\"36\" style=\"display: block; height: 36px; width: auto; max-width: 150px; border: 0;\" /></td></tr>"
                + "<tr><td style=\"padding: 28px 32px 8px 32px;\">"
                + "<h1 style=\"margin: 0 0 14px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;\">" + escapeHtml(heading) + "</h1>"
                + "<p style=\"margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #334155;\">Hello " + name + ",</p>"
                + "<p style=\"margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;\">" + escapeHtml(intro) + "</p>"
                + table
                + (buttonLabel != null && !buttonLabel.isBlank()
                    ? "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin: 0 0 24px 0;\"><tr><td style=\"border-radius: 6px; background-color: #0F172A;\">"
                      + "<a href=\"" + escapeHtml(target) + "\" target=\"_blank\" style=\"display: inline-block; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 24px;\">" + escapeHtml(buttonLabel) + "</a></td></tr></table>"
                    : "")
                + "</td></tr>"
                + "<tr><td style=\"padding: 18px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-size: 12px; line-height: 1.6; color: #475467;\">"
                + "<strong style=\"color: #334155;\">Maaya World</strong><br>This email was sent automatically. For questions, speak to your center manager."
                + "</td></tr></table></td></tr></table></body></html>";
        return html;
    }

    private boolean dispatchZeptoEmail(String recipientEmail, String recipientName, String subject, String htmlBody) {
        if (zeptoToken == null || zeptoToken.trim().isEmpty()) {
            System.err.println("ZeptoMail skipped: ZEPTOMAIL_TOKEN environment variable is not configured.");
            return false;
        }
        int maxRetries = 2;
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
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
                        .version(HttpClient.Version.HTTP_1_1)
                        .timeout(Duration.ofSeconds(30))
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
                System.err.println("Error dispatching ZeptoMail (attempt " + attempt + "/" + maxRetries + "): " + e.getMessage());
                if (attempt < maxRetries) {
                    try { Thread.sleep(1000); } catch (InterruptedException ignored) {}
                }
            }
        }
        return false;
    }

    private String buildPasswordResetHtml(String recipientName, String recipientEmail, String resetCode, String resetUrl) {
        String cleanName = escapeHtml((recipientName != null && !recipientName.trim().isEmpty()) ? recipientName.trim() : "Team Member");
        String cleanEmail = escapeHtml((recipientEmail != null) ? recipientEmail.trim() : "");
        String cleanCode = escapeHtml(resetCode);
        String cleanResetUrl = escapeHtml(resetUrl);

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
                + "<div style=\"font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0F172A;\">" + cleanCode + "</div>"
                + "<div style=\"font-size: 12px; color: #B45309; margin-top: 8px;\">This code expires in 15 minutes. For security, never share it with anyone.</div>"
                + "</div>"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"margin-bottom: 24px;\">"
                + "<tr><td align=\"center\">"
                + "<a href=\"" + cleanResetUrl + "\" target=\"_blank\" style=\"display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); text-align: center;\">Reset Password Online &rarr;</a>"
                + "</td></tr>"
                + "</table>"
                + "<p style=\"margin: 0; font-size: 13px; line-height: 1.6; color: #64748B;\">If you did not initiate this request, you can safely ignore this email; your existing password will remain secure.</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">"
                + "<tr><td style=\"font-size: 12px; color: #64748B; line-height: 1.6;\"><strong style=\"color: #334155;\">Maaya World</strong><br>Immersive light experience centers</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</body></html>";
    }

    private String buildHtmlEmailBody(String recipientName, String recipientEmail, String employeeCode, String defaultPassword, String targetPortalUrl) {
        String cleanName = escapeHtml((recipientName != null && !recipientName.trim().isEmpty()) ? recipientName.trim() : "Team Member");
        String cleanCode = escapeHtml((employeeCode != null && !employeeCode.trim().isEmpty()) ? employeeCode.trim() : "MW-PENDING");
        String cleanEmail = escapeHtml((recipientEmail != null) ? recipientEmail.trim() : "");
        String cleanPassword = escapeHtml((defaultPassword != null) ? defaultPassword : "");
        String cleanPortalUrl = escapeHtml((targetPortalUrl != null && !targetPortalUrl.trim().isEmpty()) ? targetPortalUrl.trim() : this.portalUrl);

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
                + "<span style=\"display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: #475467; background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 9999px;\">Staff portal</span>"
                + "</td>"
                + "</tr>"
                + "</table>"
                + "</td></tr>"
                + "<tr><td style=\"padding: 32px 32px 24px 32px;\">"
                + "<h1 style=\"margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 1.3;\">Welcome to Maaya World</h1>"
                + "<p style=\"margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;\">Hello <strong>" + cleanName + "</strong>,</p>"
                + "<p style=\"margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475467;\">Your Maaya World staff account is ready. Use it to check in each day, apply for leave and On Duty, and see your payslips.</p>"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 24px;\">"
                + "<tr><td style=\"padding: 20px;\">"
                + "<div style=\"font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748B; margin-bottom: 14px;\">Your sign-in details</div>"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"font-size: 13px;\">"
                + "<tr><td style=\"padding: 6px 0; color: #64748B; width: 140px;\" valign=\"top\">Employee ID</td><td style=\"padding: 6px 0; color: #0F172A; font-weight: 600; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;\" valign=\"top\">" + cleanCode + "</td></tr>"
                + "<tr><td style=\"padding: 6px 0; color: #64748B;\" valign=\"top\">Sign-in email</td><td style=\"padding: 6px 0; color: #0F172A; font-weight: 600;\" valign=\"top\">" + cleanEmail + "</td></tr>"
                + "<tr><td style=\"padding: 8px 0; color: #64748B;\" valign=\"middle\">Temporary password</td><td style=\"padding: 8px 0;\" valign=\"middle\"><code style=\"background-color: #EEF2F6; color: #1E293B; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; padding: 4px 8px; border-radius: 4px; font-size: 13px; font-weight: 700; border: 1px solid #CBD5E1; letter-spacing: 0.5px;\">" + cleanPassword + "</code></td></tr>"
                + "</table>"
                + "<div style=\"margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 12px; line-height: 1.5; color: #B45309;\">You will be asked to choose your own password the first time you sign in.</div>"
                + "</td></tr>"
                + "</table>"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"margin-bottom: 28px;\">"
                + "<tr><td align=\"center\">"
                + "<a href=\"" + cleanPortalUrl + "\" target=\"_blank\" style=\"display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); text-align: center;\">Sign in to Maaya World &rarr;</a>"
                + "</td></tr>"
                + "</table>"
                + "<div style=\"background-color: #FFFFFF; border: 1px solid #F1F5F9; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;\">"
                + "<div style=\"font-size: 12px; font-weight: 700; color: #0F172A; margin-bottom: 10px;\">How to sign in</div>"
                + "<ol style=\"margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #475467;\">"
                + "<li style=\"margin-bottom: 4px;\">Tap the <strong>Sign in</strong> button above.</li>"
                + "<li style=\"margin-bottom: 4px;\">Enter your email and the temporary password shown above.</li>"
                + "<li>Choose a new password that only you know.</li>"
                + "</ol>"
                + "</div>"
                + "<p style=\"margin: 0; font-size: 13px; line-height: 1.6; color: #64748B;\">If you cannot sign in, speak to your center manager.</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0;\">"
                + "<table role=\"presentation\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">"
                + "<tr><td style=\"font-size: 12px; color: #64748B; line-height: 1.6;\"><strong style=\"color: #334155;\">Maaya World</strong><br>Immersive light experience centers<br><a href=\"https://themaayaworld.com\" target=\"_blank\" style=\"color: #2563EB; text-decoration: none;\">themaayaworld.com</a></td></tr>"
                + "<tr><td style=\"padding-top: 12px; font-size: 11px; color: #94A3B8; line-height: 1.5; border-top: 1px solid #EDF2F7; margin-top: 12px;\">This email has your sign-in details, so do not share it. If it reached you by mistake, tell hr@themaayaworld.com and delete it.</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</body></html>";
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#39;");
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
