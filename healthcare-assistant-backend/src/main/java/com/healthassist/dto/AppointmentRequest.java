package com.healthassist.dto;

import jakarta.validation.constraints.NotBlank;

public class AppointmentRequest {

    @NotBlank(message = "Doctor ID is required")
    private String doctorId;

    @NotBlank(message = "Time slot is required")
    private String timeSlot;

    private String patientName;
    private String patientEmail;
    private String patientPhone;
    private String reason;
    private String insurance;

    public AppointmentRequest() {
    }

    public AppointmentRequest(String doctorId, String timeSlot, String patientName,
                               String patientEmail, String patientPhone, String reason, String insurance) {
        this.doctorId = doctorId;
        this.timeSlot = timeSlot;
        this.patientName = patientName;
        this.patientEmail = patientEmail;
        this.patientPhone = patientPhone;
        this.reason = reason;
        this.insurance = insurance;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public String getTimeSlot() {
        return timeSlot;
    }

    public void setTimeSlot(String timeSlot) {
        this.timeSlot = timeSlot;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public String getPatientEmail() {
        return patientEmail;
    }

    public void setPatientEmail(String patientEmail) {
        this.patientEmail = patientEmail;
    }

    public String getPatientPhone() {
        return patientPhone;
    }

    public void setPatientPhone(String patientPhone) {
        this.patientPhone = patientPhone;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getInsurance() {
        return insurance;
    }

    public void setInsurance(String insurance) {
        this.insurance = insurance;
    }
}
