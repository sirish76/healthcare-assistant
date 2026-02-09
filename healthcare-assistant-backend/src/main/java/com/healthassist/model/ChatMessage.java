package com.healthassist.model;

import java.time.LocalDateTime;

public class ChatMessage {

    public enum Role {
        USER, ASSISTANT, SYSTEM
    }

    public enum ContentType {
        TEXT, DOCTOR_RESULTS, APPOINTMENT_CONFIRMATION, ERROR
    }

    private String id;
    private Role role;
    private String content;
    private ContentType contentType;
    private LocalDateTime timestamp;
    private DoctorSearchResult doctorSearchResult;

    public ChatMessage() {
    }

    public ChatMessage(String id, Role role, String content, ContentType contentType,
                       LocalDateTime timestamp, DoctorSearchResult doctorSearchResult) {
        this.id = id;
        this.role = role;
        this.content = content;
        this.contentType = contentType;
        this.timestamp = timestamp;
        this.doctorSearchResult = doctorSearchResult;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public ContentType getContentType() {
        return contentType;
    }

    public void setContentType(ContentType contentType) {
        this.contentType = contentType;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public DoctorSearchResult getDoctorSearchResult() {
        return doctorSearchResult;
    }

    public void setDoctorSearchResult(DoctorSearchResult doctorSearchResult) {
        this.doctorSearchResult = doctorSearchResult;
    }

    public static ChatMessageBuilder builder() {
        return new ChatMessageBuilder();
    }

    public static class ChatMessageBuilder {
        private String id;
        private Role role;
        private String content;
        private ContentType contentType;
        private LocalDateTime timestamp;
        private DoctorSearchResult doctorSearchResult;

        public ChatMessageBuilder id(String id) {
            this.id = id;
            return this;
        }

        public ChatMessageBuilder role(Role role) {
            this.role = role;
            return this;
        }

        public ChatMessageBuilder content(String content) {
            this.content = content;
            return this;
        }

        public ChatMessageBuilder contentType(ContentType contentType) {
            this.contentType = contentType;
            return this;
        }

        public ChatMessageBuilder timestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public ChatMessageBuilder doctorSearchResult(DoctorSearchResult doctorSearchResult) {
            this.doctorSearchResult = doctorSearchResult;
            return this;
        }

        public ChatMessage build() {
            return new ChatMessage(id, role, content, contentType, timestamp, doctorSearchResult);
        }
    }
}
