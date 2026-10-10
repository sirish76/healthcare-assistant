package com.healthassist.transition.cms;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthassist.transition.cms.MarketplaceClient.Person;
import com.healthassist.transition.cms.MarketplaceClient.PlanQuery;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Exercises the live client against a local stub server that replays fixture JSON. */
class LiveCmsClientTest {

    private record Reply(int status, String body, String retryAfter) {
    }

    private HttpServer server;
    private final Deque<Reply> replies = new ArrayDeque<>();
    private final List<String> requests = new CopyOnWriteArrayList<>();
    private final List<String> bodies = new CopyOnWriteArrayList<>();
    private LiveCmsClient client;

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            requests.add(ex.getRequestMethod() + " " + ex.getRequestURI());
            bodies.add(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            Reply r = replies.isEmpty() ? new Reply(500, "{}", null) : replies.poll();
            byte[] out = r.body().getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            if (r.retryAfter() != null) {
                ex.getResponseHeaders().add("Retry-After", r.retryAfter());
            }
            ex.sendResponseHeaders(r.status(), out.length);
            try (OutputStream os = ex.getResponseBody()) {
                os.write(out);
            }
        });
        server.start();
        CmsProperties props = new CmsProperties("live", "test-key-123",
                "http://127.0.0.1:" + server.getAddress().getPort(), Duration.ofSeconds(5), 2,
                Duration.ofSeconds(60), Duration.ofDays(30), Duration.ofHours(24), 100);
        client = new LiveCmsClient(WebClient.builder(), props, new ObjectMapper(), Clock.systemUTC());
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private static String fixture(String name) throws IOException {
        return new ClassPathResource("transition/cms-fixtures/" + name).getContentAsString(StandardCharsets.UTF_8);
    }

    private static PlanQuery query() {
        return new PlanQuery(2026, "27360", "37057", "NC", List.of(new Person(40, false)));
    }

    @Test
    void parsesPlansAndSendsHouseholdWithoutIncome() throws IOException {
        replies.add(new Reply(200, fixture("plans-search.json"), null));
        var plans = client.searchPlans(query());

        assertThat(plans).hasSize(9);
        var silver = plans.stream().filter(p -> p.id().equals("11512NC0100005")).findFirst().orElseThrow();
        assertThat(silver.metalLevel()).isEqualTo("Silver");
        assertThat(silver.deductibleIndividual()).isEqualByComparingTo("4500");
        assertThat(silver.deductibleFamily()).isEqualByComparingTo("9000");
        assertThat(silver.moopIndividual()).isEqualByComparingTo("9200");

        assertThat(requests.get(0)).startsWith("POST /plans/search?apikey=test-key-123");
        assertThat(bodies.get(0)).contains("\"countyfips\":\"37057\"", "\"age\":40").doesNotContain("income");
    }

    @Test
    void countiesAreCachedAndHouseholdQueriesAreNot() throws IOException {
        replies.add(new Reply(200, "{\"counties\":[{\"fips\":\"37057\",\"name\":\"Davidson County\",\"state\":\"NC\",\"zipcode\":\"27360\"}]}", null));
        assertThat(client.countiesByZip("27360")).singleElement().satisfies(c -> assertThat(c.state()).isEqualTo("NC"));
        assertThat(client.countiesByZip("27360")).hasSize(1);
        assertThat(requests).hasSize(1);

        replies.add(new Reply(200, fixture("plans-search.json"), null));
        replies.add(new Reply(200, fixture("plans-search.json"), null));
        client.searchPlans(query());
        client.searchPlans(query());
        assertThat(requests).hasSize(3);
    }

    @Test
    void retriesAfterRateLimitThenSucceeds() throws IOException {
        replies.add(new Reply(429, "{}", "0"));
        replies.add(new Reply(503, "{}", "0"));
        replies.add(new Reply(200, fixture("drugs-autocomplete.json"), null));
        assertThat(client.drugAutocomplete("metf")).isNotEmpty();
        assertThat(requests).hasSize(3);
    }

    @Test
    void persistentRateLimitDegradesAndCoolsDown() {
        for (int i = 0; i < 3; i++) {
            replies.add(new Reply(429, "{}", "0"));
        }
        assertThatThrownBy(() -> client.searchPlans(query()))
                .isInstanceOf(CmsUnavailableException.class)
                .satisfies(e -> assertThat(((CmsUnavailableException) e).rateLimited()).isTrue());
        int calls = requests.size();
        assertThatThrownBy(() -> client.countiesByZip("27360")).isInstanceOf(CmsUnavailableException.class);
        assertThat(requests).hasSize(calls); // cooldown: no further calls
    }

    @Test
    void nonRetryableErrorFailsFastWithoutUrlInMessage() {
        replies.add(new Reply(400, "{\"error\":\"bad\"}", null));
        assertThatThrownBy(() -> client.drugAutocomplete("zzz"))
                .isInstanceOf(CmsUnavailableException.class)
                .hasMessageNotContaining("apikey").hasMessageNotContaining("zzz");
        assertThat(requests).hasSize(1);
    }

    @Test
    void parsesSlcspShapesAndCoverage() throws IOException {
        replies.add(new Reply(200, "{\"plan\":{\"id\":\"x\",\"premium\":512.33}}", null));
        assertThat(client.benchmarkPremium(query())).hasValueSatisfying(v -> assertThat(v).isEqualByComparingTo("512.33"));

        replies.add(new Reply(200, fixture("drugs-covered.json"), null));
        var rows = client.drugCoverage(2026, List.of("1373463"), List.of("11512NC0100002"));
        assertThat(rows).anyMatch(r -> r.planId().equals("11512NC0100002") && r.status().equals("NotCovered"));
        assertThat(requests.get(1)).contains("/drugs/covered").contains("drugs=1373463").contains("planids=11512NC0100002");
    }

    @Test
    void retryAfterIsCapped() {
        assertThat(LiveCmsClient.parseRetryAfter("120")).isEqualTo(Duration.ofSeconds(5));
        assertThat(LiveCmsClient.parseRetryAfter("2")).isEqualTo(Duration.ofSeconds(2));
        assertThat(LiveCmsClient.parseRetryAfter("Wed, 21 Oct 2026 07:28:00 GMT")).isNull();
    }

    @Test
    void liveModeRequiresKey() {
        CmsProperties noKey = new CmsProperties("live", "", null, null, 0, null, null, null, 0);
        assertThatThrownBy(() -> new LiveCmsClient(WebClient.builder(), noKey, new ObjectMapper(), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
        assertThat(noKey.toString()).doesNotContain("test-key");
    }
}
