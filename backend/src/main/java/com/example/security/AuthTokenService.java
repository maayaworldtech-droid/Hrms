package com.example.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * Stateless HMAC-SHA256 bearer token issuer and verifier.
 */
@Service
public class AuthTokenService {

    public record TokenClaims(Long employeeId, String email, String role, long expiresAt) {}

    private static final long TOKEN_TTL_MS = 24L * 60 * 60 * 1000; // 24 hours

    @Value("${hrms.auth.secret:}")
    private String configuredSecret;

    private byte[] signingKey;

    @PostConstruct
    public void init() {
        if (configuredSecret != null && !configuredSecret.trim().isEmpty()) {
            signingKey = configuredSecret.trim().getBytes(StandardCharsets.UTF_8);
        } else {
            byte[] randomKey = new byte[32];
            new SecureRandom().nextBytes(randomKey);
            signingKey = randomKey;
        }
    }

    public String issueToken(Long employeeId, String email, String role) {
        long expiresAt = System.currentTimeMillis() + TOKEN_TTL_MS;
        String cleanRole = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : "EMPLOYEE";
        String cleanEmail = email != null ? email.trim().toLowerCase() : "";
        String payload = employeeId + "|" + cleanEmail + "|" + cleanRole + "|" + expiresAt;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String signature = sign(encodedPayload);
        return encodedPayload + "." + signature;
    }

    public Optional<TokenClaims> parseAndVerify(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String[] parts = token.trim().split("\\.");
        if (parts.length != 2) {
            return Optional.empty();
        }
        String expectedSig = sign(parts[0]);
        if (!MessageDigest.isEqual(
                expectedSig.getBytes(StandardCharsets.UTF_8),
                parts[1].getBytes(StandardCharsets.UTF_8)
        )) {
            return Optional.empty();
        }
        try {
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String[] fields = payload.split("\\|", -1);
            if (fields.length != 4) {
                return Optional.empty();
            }
            Long empId = Long.parseLong(fields[0]);
            String email = fields[1];
            String role = fields[2];
            long expiresAt = Long.parseLong(fields[3]);
            if (System.currentTimeMillis() > expiresAt) {
                return Optional.empty();
            }
            return Optional.of(new TokenClaims(empId, email, role, expiresAt));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
            byte[] rawSig = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawSig);
        } catch (Exception e) {
            throw new IllegalStateException("Token signing error", e);
        }
    }
}

