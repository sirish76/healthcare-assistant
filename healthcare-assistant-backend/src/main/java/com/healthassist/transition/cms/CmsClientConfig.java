package com.healthassist.transition.cms;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Clock;
import java.util.logging.Logger;

/**
 * Picks the Marketplace data source. Switching to live calls once the key
 * arrives: add CMS_MARKETPLACE_API_KEY to .env and restart the backend
 * (mode "auto" picks it up). No code change needed.
 */
@Configuration
@EnableConfigurationProperties(CmsProperties.class)
public class CmsClientConfig {

    private static final Logger logger = Logger.getLogger(CmsClientConfig.class.getName());

    @Bean
    public MarketplaceClient marketplaceClient(CmsProperties props, WebClient.Builder builder, ObjectMapper mapper,
                                               Clock transitionClock) {
        MarketplaceClient client = switch (props.mode()) {
            case "live" -> new LiveCmsClient(builder, props, mapper, transitionClock);
            case "fixture" -> new FixtureCmsClient(mapper);
            case "off" -> new UnavailableCmsClient("Live plan data is turned off.");
            default -> props.hasApiKey()
                    ? new LiveCmsClient(builder, props, mapper, transitionClock)
                    : new UnavailableCmsClient("Live plan data isn't set up yet.");
        };
        logger.info("Coverage-transition plan data source: " + client.source() + " (mode=" + props.mode() + ")");
        return client;
    }
}
