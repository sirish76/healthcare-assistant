package com.healthassist.service;

import com.healthassist.dto.ChatRequest;
import com.healthassist.dto.ChatResponse;
import com.healthassist.dto.DoctorSearchRequest;
import com.healthassist.model.ChatMessage;
import com.healthassist.model.DoctorSearchResult;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatService {

    private static final Logger logger = Logger.getLogger(ChatService.class.getName());

    private final AnthropicService anthropicService;
    private final ZocDocService zocDocService;

    private static final Pattern DOCTOR_SEARCH_PATTERN = Pattern.compile(
            "\\[DOCTOR_SEARCH:\\s*specialty=\"([^\"]*)\",\\s*location=\"([^\"]*)\",\\s*insurance=\"([^\"]*)\"\\]",
            Pattern.CASE_INSENSITIVE
    );

    public ChatService(AnthropicService anthropicService, ZocDocService zocDocService) {
        this.anthropicService = anthropicService;
        this.zocDocService = zocDocService;
    }

    public Mono<ChatResponse> processMessage(ChatRequest request) {
        String sessionId = request.getSessionId() != null ? request.getSessionId() : UUID.randomUUID().toString();

        return anthropicService.chat(request.getMessage(), request.getConversationHistory())
                .flatMap(aiResponse -> {
                    Matcher matcher = DOCTOR_SEARCH_PATTERN.matcher(aiResponse);

                    if (matcher.find()) {
                        String specialty = matcher.group(1);
                        String location = matcher.group(2);
                        String insurance = matcher.group(3);

                        logger.info("Doctor search detected — specialty: " + specialty +
                                    ", location: " + location + ", insurance: " + insurance);

                        String cleanResponse = aiResponse.substring(0, matcher.start()).trim();
                        if (cleanResponse.isEmpty()) {
                            cleanResponse = String.format(
                                    "I found some %s doctors near %s for you. Here are the available options:",
                                    specialty, location);
                        }

                        DoctorSearchRequest searchRequest = DoctorSearchRequest.builder()
                                .specialty(specialty)
                                .location(location)
                                .insurance(insurance)
                                .pageSize(10)
                                .build();

                        String finalResponse = cleanResponse;
                        return zocDocService.searchDoctors(searchRequest)
                                .map(doctorResults -> ChatResponse.builder()
                                        .message(finalResponse)
                                        .contentType(ChatMessage.ContentType.DOCTOR_RESULTS)
                                        .doctorSearchResult(doctorResults)
                                        .sessionId(sessionId)
                                        .requiresDoctorSearch(false)
                                        .build());
                    }

                    return Mono.just(ChatResponse.builder()
                            .message(aiResponse)
                            .contentType(ChatMessage.ContentType.TEXT)
                            .sessionId(sessionId)
                            .requiresDoctorSearch(false)
                            .build());
                })
                .onErrorResume(error -> {
                    logger.log(Level.SEVERE, "Error processing chat message: " + error.getMessage());
                    return Mono.just(ChatResponse.builder()
                            .message("I'm sorry, I encountered an error. Please try again or contact support.")
                            .contentType(ChatMessage.ContentType.ERROR)
                            .sessionId(sessionId)
                            .build());
                });
    }
}
