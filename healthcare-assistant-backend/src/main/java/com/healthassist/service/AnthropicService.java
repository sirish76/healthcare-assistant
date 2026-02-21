package com.healthassist.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.healthassist.dto.ChatRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class AnthropicService {

    private static final Logger logger = Logger.getLogger(AnthropicService.class.getName());

    private final WebClient anthropicWebClient;
    private final WebClient knowledgeWebClient;
    private final ObjectMapper objectMapper;

    @Value("${anthropic.api.key}")
    private String apiKey;

    @Value("${anthropic.api.model}")
    private String model;

    @Value("${anthropic.api.max-tokens}")
    private int maxTokens;

    @Value("${knowledge.service.url:http://knowledge:8081}")
    private String knowledgeServiceUrl;

    private static final String SYSTEM_PROMPT_TEMPLATE = """
            You are HealthAssist AI (also known as "Zume"), a knowledgeable and empathetic healthcare insurance assistant.
            Your role is to help users understand healthcare and medical insurance topics including:

            - Medicare (Parts A, B, C, D), enrollment periods, eligibility, and coverage details
            - Medicaid eligibility, coverage, and state-specific programs
            - Private health insurance (HMO, PPO, EPO, POS plans)
            - ACA/Marketplace insurance plans and subsidies
            - Insurance terminology (deductibles, copays, coinsurance, out-of-pocket maximums)
            - Claims processes and appeals
            - Prescription drug coverage
            - Preventive care benefits
            - Special enrollment periods and qualifying life events
            - Specific insurance plan details (e.g., Kaiser Permanente Bronze 60, Blue Shield Silver 70, etc.)

            INSURANCE PLAN EXPERTISE:
            When a user mentions their specific insurance plan (e.g., "Kaiser Permanente Bronze 60 HMO"
            or "Blue Shield Silver 70 PPO"), use your knowledge of publicly available plan information
            to provide helpful details about:
            - Monthly premiums (typical ranges)
            - Annual deductible amounts
            - Copay amounts for office visits, specialists, urgent care, ER
            - Coinsurance percentages
            - Out-of-pocket maximum
            - What the plan covers (preventive care, prescriptions, mental health, etc.)
            - Network type (HMO vs PPO vs EPO) and what that means
            - Referral requirements

            If the user's message begins with "[User's insurance plan: ...]", that indicates their saved
            plan. Use this context to personalize your responses throughout the conversation. When answering
            ANY health insurance question, relate it back to their specific plan when possible.

            Always clarify that plan details can vary by state and year, and that users should verify
            specific numbers with their carrier or the Summary of Benefits and Coverage (SBC) document.

            IMPORTANT GUIDELINES:
            1. Always provide accurate, helpful information but remind users to verify with their specific insurance provider.
            2. Never provide specific medical advice — direct users to healthcare providers for medical decisions.
            3. When users ask about finding doctors in their area, extract the specialty and location,
               then respond with: [DOCTOR_SEARCH: specialty="<specialty>", location="<location>", insurance="<insurance_if_mentioned>"]
               This tag will trigger a ZocDoc doctor search.
            4. Be conversational and supportive — insurance topics can be confusing and stressful.
            5. Use simple, clear language and avoid excessive jargon.
            6. If you're unsure about something, say so rather than guessing.
            7. When using knowledge base context, naturally incorporate the information. Cite the source
               when it adds credibility (e.g., "According to Medicare.gov...").

            You are NOT a substitute for professional insurance or medical advice. Always encourage users
            to contact their insurance provider, healthcare.gov, or their state Medicaid office for
            definitive answers about their specific situation.

            %s
            """;

    public AnthropicService(@Qualifier("anthropicWebClient") WebClient anthropicWebClient,
                            ObjectMapper objectMapper) {
        this.anthropicWebClient = anthropicWebClient;
        this.knowledgeWebClient = WebClient.builder().build();
        this.objectMapper = objectMapper;
    }

    public Mono<String> chat(String userMessage, List<ChatRequest.MessageHistory> conversationHistory) {
        return fetchKnowledgeContext(userMessage)
                .flatMap(context -> {
                    ObjectNode requestBody = buildRequestBody(userMessage, conversationHistory, context);
                    return callAnthropic(requestBody);
                });
    }

    private Mono<String> fetchKnowledgeContext(String query) {
        String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8);
        String url = knowledgeServiceUrl + "/api/knowledge/search?q=" + encodedQuery + "&top_k=5";

        return knowledgeWebClient.get()
                .uri(url)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(response -> {
                    StringBuilder context = new StringBuilder();
                    JsonNode results = response.path("results");
                    if (results.isArray() && !results.isEmpty()) {
                        context.append("\nRELEVANT KNOWLEDGE BASE CONTEXT:\n");
                        context.append("Use the following information to provide accurate answers.\n\n");
                        for (JsonNode result : results) {
                            String text = result.path("text").asText("");
                            String source = result.path("metadata").path("source").asText("");
                            String title = result.path("metadata").path("title").asText("");
                            if (!text.isEmpty()) {
                                context.append("--- Source: ").append(title);
                                if (!source.isEmpty()) {
                                    context.append(" (").append(source).append(")");
                                }
                                context.append(" ---\n");
                                context.append(text).append("\n\n");
                            }
                        }
                    }
                    return context.toString();
                })
                .doOnError(error -> logger.log(Level.WARNING,
                        "Knowledge service unavailable: " + error.getMessage()))
                .onErrorResume(error -> Mono.just(""));
    }

    private Mono<String> callAnthropic(ObjectNode requestBody) {
        return anthropicWebClient.post()
                .header("x-api-key", apiKey)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(this::extractResponseText)
                .doOnError(error -> logger.log(Level.SEVERE, "Anthropic API error: " + error.getMessage()))
                .onErrorResume(error -> Mono.just(
                        "I'm sorry, I'm having trouble connecting right now. Please try again in a moment. " +
                        "If you need immediate help, please call Medicare at 1-800-MEDICARE (1-800-633-4227) " +
                        "or visit healthcare.gov."));
    }

    private ObjectNode buildRequestBody(String userMessage, List<ChatRequest.MessageHistory> history, String knowledgeContext) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", model);
        body.put("max_tokens", maxTokens);

        String systemPrompt = String.format(SYSTEM_PROMPT_TEMPLATE, knowledgeContext);
        body.put("system", systemPrompt);

        ArrayNode messages = objectMapper.createArrayNode();

        if (history != null) {
            for (ChatRequest.MessageHistory msg : history) {
                ObjectNode messageNode = objectMapper.createObjectNode();
                messageNode.put("role", msg.getRole().toLowerCase());
                messageNode.put("content", msg.getContent());
                messages.add(messageNode);
            }
        }

        ObjectNode currentMessage = objectMapper.createObjectNode();
        currentMessage.put("role", "user");
        currentMessage.put("content", userMessage);
        messages.add(currentMessage);

        body.set("messages", messages);
        return body;
    }

    private String extractResponseText(JsonNode response) {
        try {
            JsonNode content = response.path("content");
            if (content.isArray() && !content.isEmpty()) {
                return content.get(0).path("text").asText();
            }
            return "I couldn't generate a response. Please try rephrasing your question.";
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Error parsing Anthropic response: " + e.getMessage());
            return "I encountered an error processing your request. Please try again.";
        }
    }
}
