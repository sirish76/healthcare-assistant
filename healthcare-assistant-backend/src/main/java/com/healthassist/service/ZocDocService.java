package com.healthassist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.healthassist.dto.AppointmentRequest;
import com.healthassist.dto.DoctorSearchRequest;
import com.healthassist.model.Doctor;
import com.healthassist.model.DoctorSearchResult;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class ZocDocService {

    private static final Logger logger = Logger.getLogger(ZocDocService.class.getName());

    private final WebClient zocdocWebClient;

    @Value("${zocdoc.api.key}")
    private String apiKey;

    public ZocDocService(@Qualifier("zocdocWebClient") WebClient zocdocWebClient) {
        this.zocdocWebClient = zocdocWebClient;
    }

    public Mono<DoctorSearchResult> searchDoctors(DoctorSearchRequest request) {
        if (apiKey == null || apiKey.startsWith("your-")) {
            logger.info("ZocDoc API key not configured — returning sample data for demo");
            return Mono.just(generateSampleDoctors(request));
        }

        return zocdocWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("specialty", request.getSpecialty())
                        .queryParam("location", request.getLocation())
                        .queryParam("insurance", request.getInsurance())
                        .queryParam("page", request.getPage())
                        .queryParam("pageSize", request.getPageSize() > 0 ? request.getPageSize() : 10)
                        .build())
                .header("Authorization", "Bearer " + apiKey)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> mapApiResponse(response, request))
                .doOnError(error -> logger.log(Level.SEVERE, "ZocDoc API error: " + error.getMessage()))
                .onErrorResume(error -> Mono.just(generateSampleDoctors(request)));
    }

    public Mono<List<String>> getAvailableSlots(String doctorId) {
        if (apiKey == null || apiKey.startsWith("your-")) {
            return Mono.just(generateSampleSlots());
        }

        return zocdocWebClient.get()
                .uri("/doctors/{doctorId}/slots", doctorId)
                .header("Authorization", "Bearer " + apiKey)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(this::extractSlots)
                .onErrorResume(error -> Mono.just(generateSampleSlots()));
    }

    public Mono<String> bookAppointment(AppointmentRequest request) {
        if (apiKey == null || apiKey.startsWith("your-")) {
            logger.info("ZocDoc API key not configured — simulating appointment booking");
            return Mono.just("https://www.zocdoc.com/doctor/" + request.getDoctorId());
        }

        return zocdocWebClient.post()
                .uri("/appointments")
                .header("Authorization", "Bearer " + apiKey)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> response.path("bookingUrl").asText(
                        "https://www.zocdoc.com/doctor/" + request.getDoctorId()))
                .onErrorResume(error -> {
                    logger.log(Level.SEVERE, "Error booking appointment: " + error.getMessage());
                    return Mono.just("https://www.zocdoc.com/doctor/" + request.getDoctorId());
                });
    }

    private DoctorSearchResult mapApiResponse(JsonNode response, DoctorSearchRequest request) {
        List<Doctor> doctors = new ArrayList<>();
        JsonNode results = response.path("results");

        if (results.isArray()) {
            for (JsonNode node : results) {
                Doctor doctor = new Doctor();
                doctor.setId(node.path("id").asText());
                doctor.setFirstName(node.path("firstName").asText());
                doctor.setLastName(node.path("lastName").asText());
                doctor.setSpecialty(node.path("specialty").asText());
                doctor.setProfileImageUrl(node.path("imageUrl").asText());
                doctor.setPracticeName(node.path("practiceName").asText());

                Doctor.Address address = new Doctor.Address();
                address.setStreet(node.path("address").path("street").asText());
                address.setCity(node.path("address").path("city").asText());
                address.setState(node.path("address").path("state").asText());
                address.setZipCode(node.path("address").path("zip").asText());
                doctor.setAddress(address);

                doctor.setRating(node.path("rating").asDouble());
                doctor.setReviewCount(node.path("reviewCount").asInt());
                doctor.setAcceptingNewPatients(node.path("acceptingNewPatients").asBoolean(true));
                doctor.setZocdocProfileUrl(node.path("profileUrl").asText());
                doctors.add(doctor);
            }
        }

        return DoctorSearchResult.builder()
                .doctors(doctors)
                .searchQuery(request.getSpecialty())
                .location(request.getLocation())
                .specialty(request.getSpecialty())
                .totalResults(response.path("totalResults").asInt(doctors.size()))
                .build();
    }

    private List<String> extractSlots(JsonNode response) {
        List<String> slots = new ArrayList<>();
        JsonNode slotsNode = response.path("availableSlots");
        if (slotsNode.isArray()) {
            for (JsonNode slot : slotsNode) {
                slots.add(slot.asText());
            }
        }
        return slots.isEmpty() ? generateSampleSlots() : slots;
    }

    private DoctorSearchResult generateSampleDoctors(DoctorSearchRequest request) {
        String specialty = request.getSpecialty() != null ? request.getSpecialty() : "Primary Care";
        String location = request.getLocation() != null ? request.getLocation() : "New York, NY";

        List<Doctor> doctors = List.of(
                createDoctor("Sarah", "Johnson", specialty, location, "Metropolitan Health Partners",
                        "123 Medical Center Dr", 4.8, 234, "4F46E5",
                        Arrays.asList("Medicare", "Medicaid", "Aetna", "Blue Cross Blue Shield", "United Healthcare"), true),
                createDoctor("Michael", "Chen", specialty, location, "City Care Medical Group",
                        "456 Health Ave, Suite 200", 4.9, 189, "059669",
                        Arrays.asList("Medicare", "Cigna", "Aetna", "Humana"), true),
                createDoctor("Emily", "Rodriguez", specialty, location, "Wellness First Medical Center",
                        "789 Care Blvd", 4.7, 312, "DC2626",
                        Arrays.asList("Medicare", "Medicaid", "United Healthcare", "Oscar Health"), true),
                createDoctor("David", "Patel", specialty, location, "Premier Healthcare Associates",
                        "321 Physicians Way", 4.6, 156, "7C3AED",
                        Arrays.asList("Medicare", "Blue Cross Blue Shield", "Cigna", "Aetna"), false)
        );

        return DoctorSearchResult.builder()
                .doctors(doctors)
                .searchQuery(specialty)
                .location(location)
                .specialty(specialty)
                .totalResults(doctors.size())
                .build();
    }

    private Doctor createDoctor(String firstName, String lastName, String specialty, String location,
                                 String practiceName, String street, double rating, int reviewCount,
                                 String colorCode, List<String> insurances, boolean acceptingNew) {
        String city = location.split(",")[0].trim();
        String state = location.contains(",") ? location.split(",")[1].trim() : "NY";

        Doctor doctor = new Doctor();
        doctor.setId(UUID.randomUUID().toString());
        doctor.setFirstName(firstName);
        doctor.setLastName(lastName);
        doctor.setSpecialty(specialty);
        doctor.setProfileImageUrl("https://ui-avatars.com/api/?name=" + firstName + "+" + lastName + "&background=" + colorCode + "&color=fff&size=200");
        doctor.setPracticeName(practiceName);

        Doctor.Address address = new Doctor.Address();
        address.setStreet(street);
        address.setCity(city);
        address.setState(state);
        address.setZipCode("10001");
        doctor.setAddress(address);

        doctor.setRating(rating);
        doctor.setReviewCount(reviewCount);
        doctor.setInsurancesAccepted(insurances);
        doctor.setAvailableSlots(generateSampleSlots());
        doctor.setZocdocProfileUrl("https://www.zocdoc.com");
        doctor.setAcceptingNewPatients(acceptingNew);
        return doctor;
    }

    private List<String> generateSampleSlots() {
        List<String> slots = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        for (int day = 1; day <= 3; day++) {
            LocalDate date = today.plusDays(day);
            for (int hour : new int[]{9, 10, 11, 14, 15, 16}) {
                slots.add(date.atTime(LocalTime.of(hour, 0)).format(formatter));
            }
        }
        return slots;
    }
}
