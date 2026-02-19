package com.healthassist.dto;

import com.healthassist.model.ChatMessage;
import com.healthassist.model.DoctorSearchResult;

public class ChatResponse {

    private String message;
    private ChatMessage.ContentType contentType;
    private DoctorSearchResult doctorSearchResult;
    private String sessionId;
    private boolean requiresDoctorSearch;
    private DoctorSearchParams doctorSearchParams;

    public ChatResponse() {
    }

    public ChatResponse(String message, ChatMessage.ContentType contentType,
                        DoctorSearchResult doctorSearchResult, String sessionId,
                        boolean requiresDoctorSearch, DoctorSearchParams doctorSearchParams) {
        this.message = message;
        this.contentType = contentType;
        this.doctorSearchResult = doctorSearchResult;
        this.sessionId = sessionId;
        this.requiresDoctorSearch = requiresDoctorSearch;
        this.doctorSearchParams = doctorSearchParams;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public ChatMessage.ContentType getContentType() {
        return contentType;
    }

    public void setContentType(ChatMessage.ContentType contentType) {
        this.contentType = contentType;
    }

    public DoctorSearchResult getDoctorSearchResult() {
        return doctorSearchResult;
    }

    public void setDoctorSearchResult(DoctorSearchResult doctorSearchResult) {
        this.doctorSearchResult = doctorSearchResult;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public boolean isRequiresDoctorSearch() {
        return requiresDoctorSearch;
    }

    public void setRequiresDoctorSearch(boolean requiresDoctorSearch) {
        this.requiresDoctorSearch = requiresDoctorSearch;
    }

    public DoctorSearchParams getDoctorSearchParams() {
        return doctorSearchParams;
    }

    public void setDoctorSearchParams(DoctorSearchParams doctorSearchParams) {
        this.doctorSearchParams = doctorSearchParams;
    }

    public static ChatResponseBuilder builder() {
        return new ChatResponseBuilder();
    }

    public static class ChatResponseBuilder {
        private String message;
        private ChatMessage.ContentType contentType;
        private DoctorSearchResult doctorSearchResult;
        private String sessionId;
        private boolean requiresDoctorSearch;
        private DoctorSearchParams doctorSearchParams;

        public ChatResponseBuilder message(String message) {
            this.message = message;
            return this;
        }

        public ChatResponseBuilder contentType(ChatMessage.ContentType contentType) {
            this.contentType = contentType;
            return this;
        }

        public ChatResponseBuilder doctorSearchResult(DoctorSearchResult doctorSearchResult) {
            this.doctorSearchResult = doctorSearchResult;
            return this;
        }

        public ChatResponseBuilder sessionId(String sessionId) {
            this.sessionId = sessionId;
            return this;
        }

        public ChatResponseBuilder requiresDoctorSearch(boolean requiresDoctorSearch) {
            this.requiresDoctorSearch = requiresDoctorSearch;
            return this;
        }

        public ChatResponseBuilder doctorSearchParams(DoctorSearchParams doctorSearchParams) {
            this.doctorSearchParams = doctorSearchParams;
            return this;
        }

        public ChatResponse build() {
            return new ChatResponse(message, contentType, doctorSearchResult, sessionId, requiresDoctorSearch, doctorSearchParams);
        }
    }

    public static class DoctorSearchParams {
        private String specialty;
        private String location;
        private String insurance;

        public DoctorSearchParams() {
        }

        public DoctorSearchParams(String specialty, String location, String insurance) {
            this.specialty = specialty;
            this.location = location;
            this.insurance = insurance;
        }

        public String getSpecialty() {
            return specialty;
        }

        public void setSpecialty(String specialty) {
            this.specialty = specialty;
        }

        public String getLocation() {
            return location;
        }

        public void setLocation(String location) {
            this.location = location;
        }

        public String getInsurance() {
            return insurance;
        }

        public void setInsurance(String insurance) {
            this.insurance = insurance;
        }
    }
}
