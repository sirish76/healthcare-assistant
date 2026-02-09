package com.healthassist.controller;

import com.healthassist.dto.ChatRequest;
import com.healthassist.dto.ChatResponse;
import com.healthassist.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.logging.Logger;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private static final Logger logger = Logger.getLogger(ChatController.class.getName());

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public Mono<ResponseEntity<ChatResponse>> chat(@Valid @RequestBody ChatRequest request) {
        logger.info("Received chat message: " + request.getMessage());
        return chatService.processMessage(request)
                .map(ResponseEntity::ok);
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("HealthAssist AI is running");
    }
}
