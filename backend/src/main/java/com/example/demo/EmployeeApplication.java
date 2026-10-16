package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.util.TimeZone;

@SpringBootApplication(scanBasePackages = "com.example")
@EnableJpaRepositories(basePackages = "com.example.repository")
@EntityScan(basePackages = "com.example.entity")
public class EmployeeApplication {

	public static void main(String[] args) {
		// Set JVM default timezone to UTC to prevent PostgreSQL JDBC driver handshake issues
		System.setProperty("user.timezone", "UTC");
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

		SpringApplication.run(EmployeeApplication.class, args);
		System.out.println("Maaya World HRMS Enterprise Backend running successfully on port 8083.");
	}
}
