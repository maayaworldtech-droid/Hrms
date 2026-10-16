package com.example.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, Object> home() {
        return Map.of(
            "status", "UP",
            "message", "HRMS Backend API is running",
            "availableEndpoints", List.of(
                "GET    /api/employees",
                "GET    /api/employees/{id}",
                "POST   /api/employees/create (or /api/employees)",
                "PUT    /api/employees/{id}",
                "DELETE /api/employees/{id}"
            )
        );
    }
}
