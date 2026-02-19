package com.healthassist.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.healthassist.entity.UserEntity;
import com.healthassist.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.logging.Level;
import java.util.logging.Logger;

@Service
public class GoogleAuthService {

    private static final Logger logger = Logger.getLogger(GoogleAuthService.class.getName());

    private final UserRepository userRepository;
    private final GoogleIdTokenVerifier verifier;

    public GoogleAuthService(UserRepository userRepository,
                             @Value("${google.client.id}") String googleClientId) {
        this.userRepository = userRepository;
        this.verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    /**
     * Verify a Google ID token and return/create the user.
     */
    public UserEntity verifyAndGetUser(String idTokenString) {
        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new RuntimeException("Invalid Google ID token");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String googleId = payload.getSubject();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            // Find existing user or create new one
            UserEntity user = userRepository.findByGoogleId(googleId)
                    .orElseGet(() -> {
                        UserEntity newUser = new UserEntity();
                        newUser.setGoogleId(googleId);
                        newUser.setEmail(email);
                        newUser.setName(name);
                        newUser.setPictureUrl(pictureUrl);
                        return newUser;
                    });

            // Update user info on every login
            user.setName(name);
            user.setEmail(email);
            user.setPictureUrl(pictureUrl);
            user.setLastLoginAt(LocalDateTime.now());

            return userRepository.save(user);

        } catch (Exception e) {
            logger.log(Level.SEVERE, "Google token verification failed: " + e.getMessage());
            throw new RuntimeException("Authentication failed: " + e.getMessage());
        }
    }
}
