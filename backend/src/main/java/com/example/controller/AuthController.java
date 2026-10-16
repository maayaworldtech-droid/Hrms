package com.example.controller;

import com.example.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        Map<String, Object> result = authService.authenticate(email, password);

        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String oldPassword = payload.get("oldPassword");
        String newPassword = payload.get("newPassword");
        Map<String, Object> result = authService.changePassword(email, oldPassword, newPassword);

        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("email");
        String portalUrl = extractPortalUrl(request);
        Map<String, Object> result = authService.forgotPassword(email, portalUrl);

        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String token = payload.get("token") != null ? payload.get("token") : payload.get("code");
        String password = payload.get("password") != null ? payload.get("password") : payload.get("newPassword");

        Map<String, Object> result = authService.resetPassword(email, token, password);

        if (Boolean.TRUE.equals(result.get("success"))) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.badRequest().body(result);
        }
    }

    private String extractPortalUrl(HttpServletRequest request) {
        if (request == null) return null;
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.trim().isEmpty()) {
            return origin.trim();
        }
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.trim().isEmpty()) {
            try {
                URI uri = URI.create(referer.trim());
                return uri.getScheme() + "://" + uri.getAuthority();
            } catch (Exception ignored) {}
        }
        return null;
    }
}
