package com.healthassist.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    @Bean(name = "anthropicWebClient")
    public WebClient anthropicWebClient(WebClient.Builder builder,
                                         @org.springframework.beans.factory.annotation.Value("${anthropic.api.url}") String apiUrl) {
        return builder
                .baseUrl(apiUrl)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("anthropic-version", "2023-06-01")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
    }

    @Bean(name = "zocdocWebClient")
    public WebClient zocdocWebClient(WebClient.Builder builder,
                                      @org.springframework.beans.factory.annotation.Value("${zocdoc.api.base-url}") String baseUrl) {
        return builder
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", "application/json")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
    }
}
