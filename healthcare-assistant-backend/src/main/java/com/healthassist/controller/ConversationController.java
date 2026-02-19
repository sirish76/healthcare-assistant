package com.healthassist.controller;

import com.healthassist.entity.ConversationEntity;
import com.healthassist.service.ConversationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    private Long getUserId(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) {
            throw new RuntimeException("X-User-Id header is required");
        }
        return Long.valueOf(headerValue);
    }

    @GetMapping
    public ResponseEntity<?> getUserConversations(@RequestHeader("X-User-Id") String userIdHeader) {
        Long userId = getUserId(userIdHeader);
        List<ConversationEntity> conversations = conversationService.getUserConversations(userId);
        List<Map<String, Object>> result = conversations.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("title", c.getTitle());
            map.put("createdAt", c.getCreatedAt().toString());
            map.put("updatedAt", c.getUpdatedAt().toString());
            map.put("messageCount", c.getMessages().size());
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<?> createConversation(@RequestHeader("X-User-Id") String userIdHeader,
                                                 @RequestBody Map<String, Object> body) {
        Long userId = getUserId(userIdHeader);
        String title = (String) body.getOrDefault("title", "New Conversation");
        ConversationEntity conversation = conversationService.createConversation(userId, title);
        return ResponseEntity.ok(Map.of(
                "id", conversation.getId(),
                "title", conversation.getTitle(),
                "createdAt", conversation.getCreatedAt().toString()
        ));
    }

    @GetMapping("/{conversationId}")
    public ResponseEntity<?> getConversation(@PathVariable Long conversationId,
                                              @RequestHeader("X-User-Id") String userIdHeader) {
        Long userId = getUserId(userIdHeader);
        ConversationEntity conversation = conversationService.getConversation(conversationId, userId);
        List<Map<String, Object>> messages = conversation.getMessages().stream().map(m -> {
            Map<String, Object> msg = new HashMap<>();
            msg.put("id", m.getId());
            msg.put("role", m.getRole());
            msg.put("content", m.getContent());
            msg.put("contentType", m.getContentType());
            msg.put("timestamp", m.getTimestamp().toString());
            if (m.getDoctorSearchResultJson() != null) {
                msg.put("doctorSearchResultJson", m.getDoctorSearchResultJson());
            }
            return msg;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "id", conversation.getId(),
                "title", conversation.getTitle(),
                "messages", messages
        ));
    }

    @PostMapping("/{conversationId}/messages")
    public ResponseEntity<?> addMessage(@PathVariable Long conversationId,
                                         @RequestHeader("X-User-Id") String userIdHeader,
                                         @RequestBody Map<String, Object> body) {
        Long userId = getUserId(userIdHeader);
        String role = (String) body.get("role");
        String content = (String) body.get("content");
        String contentType = (String) body.getOrDefault("contentType", "TEXT");
        Object doctorSearchResult = body.get("doctorSearchResult");

        ConversationEntity conversation = conversationService.addMessage(
                conversationId, userId, role, content, contentType, doctorSearchResult);
        return ResponseEntity.ok(Map.of("id", conversation.getId(), "title", conversation.getTitle()));
    }

    @DeleteMapping("/{conversationId}")
    public ResponseEntity<?> deleteConversation(@PathVariable Long conversationId,
                                                 @RequestHeader("X-User-Id") String userIdHeader) {
        Long userId = getUserId(userIdHeader);
        conversationService.deleteConversation(conversationId, userId);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    @PatchMapping("/{conversationId}")
    public ResponseEntity<?> updateTitle(@PathVariable Long conversationId,
                                          @RequestHeader("X-User-Id") String userIdHeader,
                                          @RequestBody Map<String, String> body) {
        Long userId = getUserId(userIdHeader);
        ConversationEntity conversation = conversationService.updateTitle(conversationId, userId, body.get("title"));
        return ResponseEntity.ok(Map.of("id", conversation.getId(), "title", conversation.getTitle()));
    }
}
