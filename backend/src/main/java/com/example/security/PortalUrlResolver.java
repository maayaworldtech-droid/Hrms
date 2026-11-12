package com.example.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Arrays;
import java.util.List;

/**
 * Resolves the portal base URL used in outbound email links (onboarding, password reset).
 *
 * The browser's Origin/Referer header is only honoured when it matches the configured CORS allow-list.
 * Anything else falls back to the configured portal URL, so a forged header cannot redirect
 * credential or reset-code links to an attacker-controlled host.
 */
@Component
public class PortalUrlResolver {

    @Value("${hrms.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOriginsConfig;

    /**
     * Returns the trusted origin (scheme://host[:port]) of the request, or null when the request
     * carries no allow-listed origin. Callers pass null through so the mail service uses its
     * configured default portal URL.
     */
    public String resolveTrustedOrigin(HttpServletRequest request) {
        if (request == null) return null;

        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && !"null".equalsIgnoreCase(origin.trim())) {
            String clean = stripTrailingSlash(origin.trim());
            return isAllowed(clean) ? clean : null;
        }

        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            try {
                URI uri = URI.create(referer.trim());
                if (uri.getScheme() != null && uri.getRawAuthority() != null) {
                    String candidate = uri.getScheme() + "://" + uri.getRawAuthority();
                    return isAllowed(candidate) ? candidate : null;
                }
            } catch (IllegalArgumentException ignored) {
                // malformed referer, fall through to default
            }
        }
        return null;
    }

    private boolean isAllowed(String origin) {
        List<String> allowed = Arrays.stream(allowedOriginsConfig.split(","))
                .map(String::trim)
                .map(this::stripTrailingSlash)
                .filter(s -> !s.isEmpty() && !"*".equals(s))
                .toList();
        return allowed.stream().anyMatch(a -> a.equalsIgnoreCase(origin));
    }

    private String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
