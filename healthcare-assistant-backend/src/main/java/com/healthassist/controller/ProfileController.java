package com.healthassist.controller;

import com.healthassist.entity.UserEntity;
import com.healthassist.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Get user profile by user ID.
     */
    @GetMapping
    public ResponseEntity<?> getProfile(@RequestHeader("X-User-Id") Long userId) {
        Optional<UserEntity> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }

        UserEntity user = userOpt.get();
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName() != null ? user.getName() : "",
                "firstName", user.getFirstName() != null ? user.getFirstName() : "",
                "lastName", user.getLastName() != null ? user.getLastName() : "",
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "pictureUrl", user.getPictureUrl() != null ? user.getPictureUrl() : "",
                "createdAt", user.getCreatedAt().toString()
        ));
    }

    /**
     * Update user profile.
     */
    @PutMapping
    public ResponseEntity<?> updateProfile(@RequestHeader("X-User-Id") Long userId,
                                            @RequestBody Map<String, String> body) {
        Optional<UserEntity> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }

        UserEntity user = userOpt.get();

        if (body.containsKey("firstName")) {
            user.setFirstName(body.get("firstName"));
        }
        if (body.containsKey("lastName")) {
            user.setLastName(body.get("lastName"));
        }
        if (body.containsKey("phone")) {
            user.setPhone(body.get("phone"));
        }
        if (body.containsKey("email")) {
            user.setEmail(body.get("email"));
        }

        // Update the display name from first + last
        String first = user.getFirstName() != null ? user.getFirstName() : "";
        String last = user.getLastName() != null ? user.getLastName() : "";
        String fullName = (first + " " + last).trim();
        if (!fullName.isEmpty()) {
            user.setName(fullName);
        }

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "name", user.getName() != null ? user.getName() : "",
                "firstName", user.getFirstName() != null ? user.getFirstName() : "",
                "lastName", user.getLastName() != null ? user.getLastName() : "",
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "pictureUrl", user.getPictureUrl() != null ? user.getPictureUrl() : "",
                "createdAt", user.getCreatedAt().toString()
        ));
    }
}
