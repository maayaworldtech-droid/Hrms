package com.example.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public boolean sendOnboardingEmail(String recipientEmail, String recipientName, String employeeCode, String defaultPassword) {
        String subject = "Welcome to Maaya World | Your Employee Account & Credentials";
        String htmlBody = "<div style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E4E7EC; border-radius: 12px; background-color: #ffffff;\">"
                + "<div style=\"margin-bottom: 20px; border-bottom: 1px solid #E4E7EC; padding-bottom: 16px;\">"
                + "<h2 style=\"color: #101828; margin: 0; font-size: 20px;\">Maaya World HRMS</h2>"
                + "<p style=\"color: #667085; font-size: 13px; margin: 4px 0 0 0;\">Enterprise HR & Workforce Suite</p>"
                + "</div>"
                + "<p style=\"font-size: 14px; color: #344054;\">Dear <strong>" + recipientName + "</strong>,</p>"
                + "<p style=\"font-size: 14px; color: #475467; line-height: 1.5;\">Welcome to Maaya World! Your staff profile has been successfully activated. Please use the credentials below to log in to the staff portal:</p>"
                + "<div style=\"background-color: #F8F9FC; border: 1px solid #D0D5DD; border-radius: 8px; padding: 16px; margin: 20px 0;\">"
                + "<div style=\"margin-bottom: 8px; font-size: 13px; color: #475467;\"><strong style=\"color: #101828;\">Staff Code:</strong> " + employeeCode + "</div>"
                + "<div style=\"margin-bottom: 8px; font-size: 13px; color: #475467;\"><strong style=\"color: #101828;\">Work Email:</strong> " + recipientEmail + "</div>"
                + "<div style=\"margin-bottom: 8px; font-size: 13px; color: #475467;\"><strong style=\"color: #101828;\">Default Password:</strong> <code style=\"background-color: #EEF4FF; color: #2A4FE0; padding: 2px 6px; border-radius: 4px; font-size: 14px; font-weight: 600;\">" + defaultPassword + "</code></div>"
                + "<div style=\"font-size: 12px; color: #D92D20; margin-top: 10px;\"><strong>Important:</strong> You will be required to change your password upon your first login.</div>"
                + "</div>"
                + "<div style=\"margin-top: 24px; text-align: center;\">"
                + "<a href=\"http://localhost:5173/login\" style=\"background-color: #2A4FE0; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;\">Sign In to HRMS Portal</a>"
                + "</div>"
                + "<div style=\"margin-top: 32px; border-top: 1px solid #E4E7EC; padding-top: 16px; font-size: 12px; color: #98A2B3; text-align: center;\">"
                + "This is an automated communication from Maaya World Technologies Pvt Ltd. Do not share this email."
                + "</div>"
                + "</div>";

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
            System.err.println("Error dispatching ZeptoMail onboarding email: " + e.getMessage());
            return false;
        }
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
