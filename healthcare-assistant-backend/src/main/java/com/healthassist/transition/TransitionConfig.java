package com.healthassist.transition;

import com.healthassist.transition.engine.TransitionAnalyzer;
import com.healthassist.transition.regdata.RegulatoryData;
import com.healthassist.transition.regdata.RegulatoryDataLoader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;
import java.util.logging.Logger;

@Configuration
public class TransitionConfig {

    private static final Logger logger = Logger.getLogger(TransitionConfig.class.getName());

    @Bean
    public RegulatoryData regulatoryData() {
        RegulatoryData data = RegulatoryDataLoader.load();
        logger.info("Coverage-transition regulatory data " + data.dataVersion() + " loaded; plan years "
                + data.planYears() + "; " + data.reviewItems().size() + " values awaiting verification "
                + "(see resources/transition/regulatory, entries with verified:false or a todo).");
        return data;
    }

    @Bean
    public Clock transitionClock(@Value("${scheduling.timezone:America/Los_Angeles}") String zone) {
        return Clock.system(ZoneId.of(zone));
    }

    @Bean
    public TransitionAnalyzer transitionAnalyzer(RegulatoryData data) {
        return new TransitionAnalyzer(data);
    }
}
