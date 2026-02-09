package com.healthassist.controller;

import com.healthassist.dto.AppointmentRequest;
import com.healthassist.dto.DoctorSearchRequest;
import com.healthassist.model.DoctorSearchResult;
import com.healthassist.service.ZocDocService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private static final Logger logger = Logger.getLogger(DoctorController.class.getName());

    private final ZocDocService zocDocService;

    public DoctorController(ZocDocService zocDocService) {
        this.zocDocService = zocDocService;
    }

    @PostMapping("/search")
    public Mono<ResponseEntity<DoctorSearchResult>> searchDoctors(@RequestBody DoctorSearchRequest request) {
        logger.info("Doctor search — specialty: " + request.getSpecialty() + ", location: " + request.getLocation());
        return zocDocService.searchDoctors(request)
                .map(ResponseEntity::ok);
    }

    @GetMapping("/{doctorId}/slots")
    public Mono<ResponseEntity<List<String>>> getAvailableSlots(@PathVariable String doctorId) {
        logger.info("Fetching available slots for doctor: " + doctorId);
        return zocDocService.getAvailableSlots(doctorId)
                .map(ResponseEntity::ok);
    }

    @PostMapping("/book")
    public Mono<ResponseEntity<Map<String, String>>> bookAppointment(@Valid @RequestBody AppointmentRequest request) {
        logger.info("Booking appointment with doctor: " + request.getDoctorId() + " at " + request.getTimeSlot());
        return zocDocService.bookAppointment(request)
                .map(bookingUrl -> ResponseEntity.ok(Map.of(
                        "status", "success",
                        "message", "Appointment request submitted successfully",
                        "bookingUrl", bookingUrl
                )));
    }
}
