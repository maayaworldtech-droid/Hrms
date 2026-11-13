package com.example.controller;

import com.example.entity.Notification;
import com.example.security.AuthFilter;
import com.example.service.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The signed-in person's own notifications (the bell). Nobody can read or change anyone else's. */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public Map<String, Object> mine(@RequestParam(defaultValue = "30") int limit, HttpServletRequest request) {
        Long me = me(request);
        List<Map<String, Object>> items = notifications.latest(me, limit).stream().map(NotificationController::view).toList();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("unread", notifications.unreadCount(me));
        return body;
    }

    @GetMapping("/unread-count")
    public Map<String, Object> unreadCount(HttpServletRequest request) {
        return Map.of("unread", notifications.unreadCount(me(request)));
    }

    @PutMapping("/{id}/read")
    public Map<String, Object> markRead(@PathVariable Long id, HttpServletRequest request) {
        Long me = me(request);
        if (!notifications.markRead(me, id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found.");
        }
        return Map.of("unread", notifications.unreadCount(me));
    }

    @PutMapping("/read-all")
    public Map<String, Object> markAllRead(HttpServletRequest request) {
        Long me = me(request);
        notifications.markAllRead(me);
        return Map.of("unread", 0);
    }

    private static Long me(HttpServletRequest request) {
        Long id = (Long) request.getAttribute(AuthFilter.ATTR_EMPLOYEE_ID);
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in again.");
        return id;
    }

    private static Map<String, Object> view(Notification n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", n.getId());
        m.put("type", n.getType());
        m.put("title", n.getTitle());
        m.put("message", n.getMessage());
        m.put("link", n.getLink());
        m.put("read", n.isRead());
        m.put("createdAt", n.getCreatedAt());
        return m;
    }
}
