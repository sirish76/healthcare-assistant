package com.healthassist.transition.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthassist.transition.TransitionConfig;
import com.healthassist.transition.TransitionService;
import com.healthassist.transition.cms.FixtureCmsClient;
import com.healthassist.transition.cms.MarketplaceClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * PRIVACY: sensitive values sent to /api/transition must never show up in
 * logs or error responses, and responses must not be cacheable.
 */
@WebMvcTest(TransitionController.class)
@Import({TransitionConfig.class, TransitionService.class, TransitionControllerPrivacyTest.Fixtures.class})
@ExtendWith(OutputCaptureExtension.class)
class TransitionControllerPrivacyTest {

    @TestConfiguration
    static class Fixtures {
        @Bean
        MarketplaceClient marketplaceClient(ObjectMapper mapper) {
            return new FixtureCmsClient(mapper);
        }
    }

    // Distinctive values we can search the logs for.
    private static final String INCOME = "987654.32";
    private static final String DRUG = "Zzyzxamab";
    private static final String RXCUI = "8675309";

    private static final String VALID = """
            {"zip":"27360","members":[{"age":47,"usesTobacco":false,"wasCovered":true,"relationship":"SELF"}],
             "dates":{"jobEndDate":"2026-09-15","lastDayOfCoverage":"2026-09-30","cobraNoticeReceived":false},
             "cobra":{"monthlyPremium":712.5},
             "income":{"annualOverride":%s},
             "care":{"usage":"HIGH","drugs":[{"rxcui":"%s","name":"%s"}],"providers":[]}}
            """.formatted(INCOME, RXCUI, DRUG);

    @Autowired
    MockMvc mvc;

    @Test
    void analyzeWorksAndLogsNothingSensitive(CapturedOutput output) throws Exception {
        MvcResult r = mvc.perform(post("/api/transition/analyze").contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.options[0].type").value("COBRA"))
                .andExpect(jsonPath("$.chatSummary").isString())
                .andReturn();
        String summary = new ObjectMapper().readTree(r.getResponse().getContentAsString()).path("chatSummary").asText();
        assertThat(summary).doesNotContain(DRUG, RXCUI, "987654", "27360");
        assertThat(output.getAll()).doesNotContain(INCOME, "987654", DRUG, RXCUI, "712.5");
    }

    @Test
    void validationErrorsNameFieldsButNeverEchoValues(CapturedOutput output) throws Exception {
        String bad = VALID.replace("\"annualOverride\":" + INCOME, "\"annualOverride\":-" + INCOME)
                .replace("\"age\":47", "\"age\":-47");
        MvcResult r = mvc.perform(post("/api/transition/analyze").contentType(MediaType.APPLICATION_JSON).content(bad))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("invalid_input"))
                .andReturn();
        String body = r.getResponse().getContentAsString();
        assertThat(body).contains("income.annualOverride", "members[0].age").doesNotContain("987654", "-47");
        assertThat(output.getAll()).doesNotContain("987654", DRUG, "-47");
    }

    @Test
    void malformedJsonDoesNotLeakSnippet(CapturedOutput output) throws Exception {
        String broken = "{\"zip\":\"27360\",\"care\":{\"drugs\":[{\"name\":\"" + DRUG + "\"}]},\"income\":{\"annualOverride\":\"lots" + INCOME;
        MvcResult r = mvc.perform(post("/api/transition/analyze").contentType(MediaType.APPLICATION_JSON).content(broken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("unreadable_request"))
                .andReturn();
        assertThat(r.getResponse().getContentAsString()).doesNotContain(DRUG, "987654");
        assertThat(output.getAll()).doesNotContain(DRUG, "987654");
    }

    @Test
    void searchEndpointsArePostAndNoStore(CapturedOutput output) throws Exception {
        mvc.perform(post("/api/transition/drugs/search").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"metf\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.results[0].rxcui").value("861007"));
        mvc.perform(post("/api/transition/location").contentType(MediaType.APPLICATION_JSON).content("{\"zip\":\"94103\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("CA"))
                .andExpect(jsonPath("$.exchangeType").value("STATE"));
        mvc.perform(get("/api/transition/meta")).andExpect(status().isOk())
                .andExpect(jsonPath("$.planDataSource").value("FIXTURE"));
        assertThat(output.getAll()).doesNotContain("metf", "94103");
    }
}
