package com.healthassist.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthassist.entity.ConversationEntity;
import com.healthassist.entity.MessageEntity;
import com.healthassist.entity.UserEntity;
import com.healthassist.repository.ConversationRepository;
import com.healthassist.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class ConversationService {

    private static final Logger logger = Logger.getLogger(ConversationService.class.getName());

    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ConversationService(ConversationRepository conversationRepository,
                               UserRepository userRepository,
                               ObjectMapper objectMapper) {
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public List<ConversationEntity> getUserConversations(Long userId) {
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @Transactional
    public ConversationEntity createConversation(Long userId, String title) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ConversationEntity conversation = new ConversationEntity();
        conversation.setUser(user);
        conversation.setTitle(title != null ? title : "New Conversation");

        return conversationRepository.save(conversation);
    }

    @Transactional
    public ConversationEntity addMessage(Long conversationId, Long userId,
                                          String role, String content,
                                          String contentType, Object doctorSearchResult) {
        ConversationEntity conversation = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        MessageEntity message = new MessageEntity();
        message.setConversation(conversation);
        message.setRole(role);
        message.setContent(content);
        message.setContentType(contentType != null ? contentType : "TEXT");
        message.setTimestamp(LocalDateTime.now());

        if (doctorSearchResult != null) {
            try {
                message.setDoctorSearchResultJson(objectMapper.writeValueAsString(doctorSearchResult));
            } catch (Exception e) {
                logger.log(Level.WARNING, "Failed to serialize doctor search result: " + e.getMessage());
            }
        }

        conversation.getMessages().add(message);

        // Auto-update title from first user message
        if ("New Conversation".equals(conversation.getTitle()) && "user".equals(role)) {
            String newTitle = content.length() > 50 ? content.substring(0, 50) + "..." : content;
            conversation.setTitle(newTitle);
        }

        return conversationRepository.save(conversation);
    }

    public ConversationEntity getConversation(Long conversationId, Long userId) {
        return conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
    }

    @Transactional
    public void deleteConversation(Long conversationId, Long userId) {
        conversationRepository.deleteByIdAndUserId(conversationId, userId);
    }

    @Transactional
    public ConversationEntity updateTitle(Long conversationId, Long userId, String title) {
        ConversationEntity conversation = conversationRepository.findByIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        conversation.setTitle(title);
        return conversationRepository.save(conversation);
    }
}
