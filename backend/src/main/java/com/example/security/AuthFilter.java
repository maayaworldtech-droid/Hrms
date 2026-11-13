package com.example.security;

import com.example.entity.Employee;
import com.example.repository.EmployeeRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Enforces bearer token authentication, active-account status, and role-based access control
 * across all protected /api/** endpoints.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthFilter extends OncePerRequestFilter {

    public static final String ATTR_EMPLOYEE_ID = "authEmployeeId";
    public static final String ATTR_EMAIL = "authEmail";
    public static final String ATTR_ROLE = "authRole";

    @Autowired
    private AuthTokenService tokenService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Value("${hrms.cors.allowed-origins:http://localhost:5173,http://127.0.0.1:5173}")
    private String allowedOriginsConfig;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        applyCorsHeaders(request, response);

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        // Reject ambiguous URIs (matrix params, encoded dots/slashes, double slashes). Spring strips or
        // decodes these when routing, so the raw URI could otherwise slip past the exact-match rules below.
        String rawUri = request.getRequestURI() != null ? request.getRequestURI() : "";
        String lowerRaw = rawUri.toLowerCase();
        if (rawUri.contains(";") || rawUri.contains("//") || rawUri.contains("\\")
                || lowerRaw.contains("%2e") || lowerRaw.contains("%2f") || lowerRaw.contains("%5c")
                || lowerRaw.contains("%3b")) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST, "Malformed request path.");
            return;
        }

        // Use the container-decoded, normalized path for every authorization decision
        String path = normalizePath(request);
        String method = request.getMethod();

        if (!path.startsWith("/api") || isPublicEndpoint(path, method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentication required. Please sign in.");
            return;
        }

        String token = authHeader.substring("Bearer ".length()).trim();
        Optional<AuthTokenService.TokenClaims> claimsOpt = tokenService.parseAndVerify(token);
        if (claimsOpt.isEmpty()) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Session expired or invalid. Please sign in again.");
            return;
        }

        AuthTokenService.TokenClaims claims = claimsOpt.get();
        Optional<Employee> empOpt = employeeRepository.findById(claims.employeeId());
        if (empOpt.isEmpty() || "TERMINATED".equalsIgnoreCase(empOpt.get().getStatus())) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Account is inactive or unavailable.");
            return;
        }

        Employee currentUser = empOpt.get();
        String effectiveRole = currentUser.getRole() != null ? currentUser.getRole().trim().toUpperCase() : "EMPLOYEE";

        if (!isAuthorized(path, method, effectiveRole, currentUser.getId())) {
            sendError(response, HttpServletResponse.SC_FORBIDDEN, "You do not have permission to perform this action.");
            return;
        }

        request.setAttribute(ATTR_EMPLOYEE_ID, currentUser.getId());
        request.setAttribute(ATTR_EMAIL, currentUser.getEmail());
        request.setAttribute(ATTR_ROLE, effectiveRole);

        filterChain.doFilter(request, response);
    }

    private String normalizePath(HttpServletRequest request) {
        String servletPath = request.getServletPath() != null ? request.getServletPath() : "";
        String pathInfo = request.getPathInfo() != null ? request.getPathInfo() : "";
        String path = servletPath + pathInfo;
        if (path.isEmpty()) {
            path = "/";
        }
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }

    private boolean isPublicEndpoint(String path, String method) {
        if (!"POST".equalsIgnoreCase(method)) {
            return false;
        }
        return "/api/auth/login".equals(path)
                || "/api/auth/forgot-password".equals(path)
                || "/api/auth/reset-password".equals(path);
    }

    private boolean isAuthorized(String path, String method, String role, Long currentUserId) {
        boolean isAdmin = "ADMIN".equals(role);
        boolean isManager = "MANAGER".equals(role);
        boolean isPrivileged = isAdmin || isManager;

        // Admin-only routes
        if (path.equals("/api/employees") && "POST".equalsIgnoreCase(method)) return isAdmin;
        if (path.equals("/api/employees/onboard") || path.equals("/api/employees/create")) return isAdmin;
        if (path.startsWith("/api/employees/") && "DELETE".equalsIgnoreCase(method)) return isAdmin;
        if (path.startsWith("/api/employees/") && path.endsWith("/resend-email")) return isAdmin;
        if (path.equals("/api/employees/resend-email")) return isAdmin;
        if (path.equals("/api/settings") && "PUT".equalsIgnoreCase(method)) return isAdmin;
        // Managers work out and adjust payroll for their own center (checked in PayrollController);
        // only the admin marks a month as paid
        if (path.startsWith("/api/payroll/disburse/")) return isAdmin;
        if (path.equals("/api/payroll/process")) return isPrivileged;
        if (path.startsWith("/api/payroll/payslips/") && path.endsWith("/adjust") && "PUT".equalsIgnoreCase(method)) return isPrivileged;

        // Centers: any signed-in user may read (check-in geofence); every change is admin-only
        if (path.equals("/api/centers") || path.startsWith("/api/centers/")) {
            return "GET".equalsIgnoreCase(method) || isAdmin;
        }

        // Manager or Admin routes
        if (path.equals("/api/employees") && "GET".equalsIgnoreCase(method)) return isPrivileged;
        if (path.startsWith("/api/employees/code/")) return isPrivileged;
        if ((path.equals("/api/attendance") || path.equals("/api/attendance/paged")) && "GET".equalsIgnoreCase(method)) return isPrivileged;
        if (path.startsWith("/api/attendance/") && (path.endsWith("/approve-regularization") || path.endsWith("/status"))) return isPrivileged;
        if (path.equals("/api/leaves") && "GET".equalsIgnoreCase(method)) return isPrivileged;
        if (path.startsWith("/api/leaves/") && path.endsWith("/status")) return isPrivileged;
        if (path.equals("/api/on-duty") && "GET".equalsIgnoreCase(method)) return isPrivileged;
        if (path.startsWith("/api/on-duty/") && (path.endsWith("/status") || path.endsWith("/reimburse"))) return isPrivileged;
        if (path.equals("/api/payroll/runs") || path.startsWith("/api/payroll/payslips/run/")) return isPrivileged;
        if (path.equals("/api/audit-logs")) return isPrivileged;

        // Employee-scoped routes (Employee can access only their own id; Manager/Admin can access any)
        if (!isPrivileged) {
            Long pathEmployeeId = extractScopedEmployeeId(path);
            if (pathEmployeeId != null && !pathEmployeeId.equals(currentUserId)) {
                return false;
            }
        }

        return true;
    }

    private Long extractScopedEmployeeId(String path) {
        String[] prefixes = {
                "/api/employees/",
                "/api/attendance/employee/",
                "/api/leaves/employee/",
                "/api/leaves/balances/",
                "/api/on-duty/employee/",
                "/api/payroll/payslips/"
        };
        for (String prefix : prefixes) {
            if (path.startsWith(prefix)) {
                String remainder = path.substring(prefix.length());
                String firstSegment = remainder.split("/")[0];
                try {
                    return Long.parseLong(firstSegment);
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private void applyCorsHeaders(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            List<String> allowed = Arrays.stream(allowedOriginsConfig.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
            if (allowed.contains("*") || allowed.contains(origin)) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Vary", "Origin");
            }
        }
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
        response.setHeader("Access-Control-Allow-Credentials", "true");
    }

    private void sendError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        String safeMsg = message.replace("\\", "\\\\").replace("\"", "\\\"");
        response.getWriter().write("{\"success\":false,\"message\":\"" + safeMsg + "\"}");
    }
}

