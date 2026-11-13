package com.example.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Quick check that the backend is up (open http://localhost:8083/ in a browser). */
@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, Object> home() {
        return Map.of("status", "UP", "message", "Maaya World HRMS backend is running");
    }
}
