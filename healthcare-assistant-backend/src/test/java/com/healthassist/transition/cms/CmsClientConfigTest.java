package com.healthassist.transition.cms;

import com.healthassist.config.WebClientConfig;
import com.healthassist.transition.TransitionConfig;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/** "Switch to live" must be configuration-only: set the key, restart. */
class CmsClientConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .withUserConfiguration(WebClientConfig.class, TransitionConfig.class, CmsClientConfig.class)
            .withPropertyValues("anthropic.api.url=http://localhost", "zocdoc.api.base-url=http://localhost");

    @Test
    void autoWithoutKeyDegrades() {
        runner.withPropertyValues("transition.cms.mode=auto", "transition.cms.api-key=")
                .run(ctx -> assertThat(ctx.getBean(MarketplaceClient.class).source()).isEqualTo(PlanDataSource.UNAVAILABLE));
    }

    @Test
    void autoWithKeyGoesLive() {
        runner.withPropertyValues("transition.cms.mode=auto", "transition.cms.api-key=abc")
                .run(ctx -> assertThat(ctx.getBean(MarketplaceClient.class)).isInstanceOf(LiveCmsClient.class));
    }

    @Test
    void fixtureModeForLocalDevelopment() {
        runner.withPropertyValues("transition.cms.mode=fixture")
                .run(ctx -> assertThat(ctx.getBean(MarketplaceClient.class).source()).isEqualTo(PlanDataSource.FIXTURE));
    }

    @Test
    void liveModeWithoutKeyFailsFast() {
        runner.withPropertyValues("transition.cms.mode=live", "transition.cms.api-key=")
                .run(ctx -> assertThat(ctx).hasFailed());
    }
}
