package com.healthassist.transition.api;

import com.healthassist.transition.TransitionService;
import com.healthassist.transition.model.TransitionInput;
import com.healthassist.transition.model.TransitionResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Lost your job? Compare your coverage options."
 *
 * PRIVACY: every endpoint that takes user data is POST, so ZIP codes, drug
 * names and household data never appear in URLs or access logs. Nothing is
 * logged or persisted, and responses are marked no-store.
 */
@RestController
@RequestMapping("/api/transition")
public class TransitionController {

    private final TransitionService service;

    public TransitionController(TransitionService service) {
        this.service = service;
    }

    public record LocationRequest(@NotBlank @Pattern(regexp = "\\d{5}") String zip) {
        @Override
        public String toString() {
            return "LocationRequest[redacted]";
        }
    }

    public record SearchRequest(@NotBlank @Size(min = 2, max = 80) String query,
                                @Pattern(regexp = "\\d{5}") String zip) {
        @Override
        public String toString() {
            return "SearchRequest[redacted]";
        }
    }

    @GetMapping("/meta")
    public ResponseEntity<TransitionService.MetaResponse> meta() {
        return ResponseEntity.ok(service.meta());
    }

    @PostMapping("/location")
    public ResponseEntity<TransitionService.LocationResponse> location(@Valid @RequestBody LocationRequest req) {
        return noStore(service.location(req.zip()));
    }

    @PostMapping("/drugs/search")
    public ResponseEntity<?> drugs(@Valid @RequestBody SearchRequest req) {
        return noStore(service.drugs(req.query()));
    }

    @PostMapping("/providers/search")
    public ResponseEntity<?> providers(@Valid @RequestBody SearchRequest req) {
        return noStore(service.providers(req.query(), req.zip()));
    }

    @PostMapping("/analyze")
    public ResponseEntity<TransitionResult> analyze(@Valid @RequestBody TransitionInput input) {
        return noStore(service.analyze(input));
    }

    private static <T> ResponseEntity<T> noStore(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }
}
