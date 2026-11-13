package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication(scanBasePackages = "com.example")
@EnableJpaRepositories(basePackages = "com.example.repository")
@EntityScan(basePackages = "com.example.entity")
@EnableScheduling
@EnableAsync
public class EmployeeApplication {

	public static void main(String[] args) {
		// Set JVM default timezone to UTC to prevent PostgreSQL JDBC driver handshake issues
		System.setProperty("user.timezone", "UTC");
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

		// Prefer IPv4 stack to prevent NAT64/dual-stack TLS handshake timeouts on Windows
		System.setProperty("java.net.preferIPv4Stack", "true");
		System.setProperty("java.net.preferIPv4Addresses", "true");

		SpringApplication.run(EmployeeApplication.class, args);
		System.out.println("Maaya World HRMS backend is running.");
	}
}
