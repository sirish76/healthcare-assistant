package com.healthassist.controller;

import com.healthassist.service.CalendarService;
import com.healthassist.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scheduling")
public class SchedulingController {

    private final CalendarService calendarService;
    private final EmailService emailService;

    public SchedulingController(CalendarService calendarService, EmailService emailService) {
        this.calendarService = calendarService;
        this.emailService = emailService;
    }

    @GetMapping("/slots")
    public ResponseEntity<?> getAvailableSlots() {
        List<Map<String, String>> slots = calendarService.getAvailableSlots();
        return ResponseEntity.ok(Map.of("slots", slots));
    }

    @PostMapping("/book")
    public ResponseEntity<?> bookSlot(@RequestBody Map<String, String> body) {
        String startTime = body.get("startTime");
        String firstName = body.getOrDefault("firstName", "");
        String lastName = body.getOrDefault("lastName", "");
        String clientName = (firstName + " " + lastName).trim();
        String clientEmail = body.get("email");
        String clientPhone = body.get("phone");
        String service = body.get("service");
        String message = body.get("message");

        if (startTime == null || clientEmail == null || clientName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "startTime, email, and name are required"));
        }

        // Book the slot on Google Calendar
        Map<String, Object> result = calendarService.bookSlot(
                startTime, clientName, clientEmail, clientPhone, service, message);

        if ((boolean) result.get("success")) {
            // Send email confirmation
            String dateTimeDisplay = body.getOrDefault("displayDateTime", startTime);
            emailService.sendBookingConfirmation(clientEmail, clientName, dateTimeDisplay, service);
        }

        return ResponseEntity.ok(result);
    }
}
