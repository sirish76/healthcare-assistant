package com.healthassist.transition.cms;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * transition.cms.* settings.
 * mode: auto    = live if CMS_MARKETPLACE_API_KEY is set, otherwise unavailable (default)
 *       live    = always live (fails to start without a key)
 *       fixture = bundled sample responses (local development / demos)
 *       off     = never call CMS
 */
@ConfigurationProperties(prefix = "transition.cms")
public record CmsProperties(String mode,
                            String apiKey,
                            String baseUrl,
                            Duration timeout,
                            int maxRetries,
                            Duration rateLimitCooldown,
                            Duration countiesTtl,
                            Duration referenceTtl,
                            int cacheMaxEntries) {

    public CmsProperties {
        mode = mode == null || mode.isBlank() ? "auto" : mode.trim().toLowerCase();
        baseUrl = baseUrl == null || baseUrl.isBlank() ? "https://marketplace.api.healthcare.gov/api/v1" : baseUrl;
        timeout = timeout == null ? Duration.ofSeconds(8) : timeout;
        maxRetries = maxRetries <= 0 ? 2 : maxRetries;
        rateLimitCooldown = rateLimitCooldown == null ? Duration.ofSeconds(60) : rateLimitCooldown;
        countiesTtl = countiesTtl == null ? Duration.ofDays(30) : countiesTtl;
        referenceTtl = referenceTtl == null ? Duration.ofHours(24) : referenceTtl;
        cacheMaxEntries = cacheMaxEntries <= 0 ? 5000 : cacheMaxEntries;
    }

    public boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String toString() {
        return "CmsProperties[mode=" + mode + ", baseUrl=" + baseUrl + ", apiKey=" + (hasApiKey() ? "set" : "unset") + "]";
    }
}
