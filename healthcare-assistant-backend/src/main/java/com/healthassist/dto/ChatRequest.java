package com.healthassist.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class ChatRequest {

    @NotBlank(message = "Message cannot be empty")
    private String message;

    private List<MessageHistory> conversationHistory;
    private String sessionId;

    public ChatRequest() {
    }

    public ChatRequest(String message, List<MessageHistory> conversationHistory, String sessionId) {
        this.message = message;
        this.conversationHistory = conversationHistory;
        this.sessionId = sessionId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<MessageHistory> getConversationHistory() {
        return conversationHistory;
    }

    public void setConversationHistory(List<MessageHistory> conversationHistory) {
        this.conversationHistory = conversationHistory;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public static class MessageHistory {
        private String role;
        private String content;

        public MessageHistory() {
        }

        public MessageHistory(String role, String content) {
            this.role = role;
            this.content = content;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
