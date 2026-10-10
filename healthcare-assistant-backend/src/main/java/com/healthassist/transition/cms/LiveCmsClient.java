package com.healthassist.transition.cms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.healthassist.transition.engine.MarketplaceSnapshot.CoverageRow;
import com.healthassist.transition.engine.MarketplaceSnapshot.PlanData;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriBuilder;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;
import java.util.logging.Logger;

/**
 * Live CMS Marketplace API client.
 *
 * PRIVACY: request URLs contain the API key and user search terms, so they are
 * never logged; only the endpoint name and status code are.
 * Household-specific calls (plan search, benchmark) are never cached. Cached:
 * counties by ZIP, drug/provider autocomplete, and per-plan coverage rows.
 *
 * Rate limits: 429/503 are retried with backoff (honoring Retry-After, capped),
 * then the client pauses all calls for {@code rateLimitCooldown} and callers
 * degrade to "plan data unavailable".
 */
public class LiveCmsClient implements MarketplaceClient {

    private static final Logger logger = Logger.getLogger(LiveCmsClient.class.getName());
    private static final Duration MAX_RETRY_WAIT = Duration.ofSeconds(5);

    private final WebClient webClient;
    private final CmsProperties props;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final AtomicReference<Instant> coolDownUntil = new AtomicReference<>(Instant.EPOCH);

    private final TtlCache<String, List<County>> countyCache;
    private final TtlCache<String, List<DrugSuggestion>> drugCache;
    private final TtlCache<String, List<ProviderSuggestion>> providerCache;
    private final TtlCache<String, List<CoverageRow>> coverageCache;

    public LiveCmsClient(WebClient.Builder builder, CmsProperties props, ObjectMapper mapper, Clock clock) {
        if (!props.hasApiKey()) {
            throw new IllegalStateException("CMS_MARKETPLACE_API_KEY is required for live mode");
        }
        this.webClient = builder.clone().baseUrl(props.baseUrl())
                .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024)).build();
        this.props = props;
        this.mapper = mapper;
        this.clock = clock;
        this.countyCache = new TtlCache<>(props.countiesTtl(), props.cacheMaxEntries(), clock);
        this.drugCache = new TtlCache<>(props.referenceTtl(), props.cacheMaxEntries(), clock);
        this.providerCache = new TtlCache<>(props.referenceTtl(), props.cacheMaxEntries(), clock);
        this.coverageCache = new TtlCache<>(props.referenceTtl(), props.cacheMaxEntries(), clock);
    }

    @Override
    public PlanDataSource source() {
        return PlanDataSource.LIVE;
    }

    @Override
    public List<County> countiesByZip(String zip) {
        return countyCache.get(zip, () -> CmsResponseParser.counties(
                call("counties", HttpMethod.GET, b -> b.path("/counties/by/zip/{zip}").build(zip), null)));
    }

    @Override
    public List<PlanData> searchPlans(PlanQuery q) {
        ObjectNode body = householdBody(q);
        body.put("limit", 50);
        body.put("offset", 0);
        body.put("sort", "premium");
        body.put("order", "asc");
        return CmsResponseParser.plans(call("plans/search", HttpMethod.POST, b -> b.path("/plans/search").build(), body));
    }

    @Override
    public Optional<BigDecimal> benchmarkPremium(PlanQuery q) {
        return CmsResponseParser.benchmark(
                call("households/slcsp", HttpMethod.POST, b -> b.path("/households/slcsp").build(), householdBody(q)));
    }

    @Override
    public List<DrugSuggestion> drugAutocomplete(String query) {
        String key = query.trim().toLowerCase();
        return drugCache.get(key, () -> CmsResponseParser.drugs(
                call("drugs/autocomplete", HttpMethod.GET, b -> b.path("/drugs/autocomplete").queryParam("q", key).build(), null)));
    }

    @Override
    public List<CoverageRow> drugCoverage(int year, List<String> rxcuis, List<String> planIds) {
        return coverage("drugs/covered", "/drugs/covered", "drugs", year, rxcuis, planIds, CmsResponseParser::drugCoverage);
    }

    @Override
    public List<ProviderSuggestion> providerSearch(String query, String zip) {
        String key = query.trim().toLowerCase() + "|" + zip;
        return providerCache.get(key, () -> CmsResponseParser.providers(call("providers/search", HttpMethod.GET,
                b -> b.path("/providers/search").queryParam("q", query.trim()).queryParam("zipcode", zip).build(), null)));
    }

    @Override
    public List<CoverageRow> providerCoverage(int year, List<String> npis, List<String> planIds) {
        return coverage("providers/covered", "/providers/covered", "providerids", year, npis, planIds,
                CmsResponseParser::providerCoverage);
    }

    /** Coverage rows are reference data per (year, item, plan), so they're cached per combination. */
    private List<CoverageRow> coverage(String name, String path, String itemParam, int year, List<String> items,
                                       List<String> planIds, Function<JsonNode, List<CoverageRow>> parser) {
        if (items.isEmpty() || planIds.isEmpty()) {
            return List.of();
        }
        String key = year + "|" + String.join(",", items.stream().sorted().toList()) + "|"
                + String.join(",", planIds.stream().sorted().toList());
        return coverageCache.get(key, () -> parser.apply(call(name, HttpMethod.GET, b -> b.path(path)
                .queryParam("year", year)
                .queryParam(itemParam, String.join(",", items))
                .queryParam("planids", String.join(",", planIds))
                .build(), null)));
    }

    private ObjectNode householdBody(PlanQuery q) {
        ObjectNode body = mapper.createObjectNode();
        ObjectNode household = body.putObject("household");
        ArrayNode people = household.putArray("people");
        for (Person p : q.people()) {
            ObjectNode n = people.addObject();
            n.put("age", p.age());
            n.put("uses_tobacco", p.usesTobacco());
            n.put("aptc_eligible", true);
        }
        ObjectNode place = body.putObject("place");
        place.put("countyfips", q.countyFips());
        place.put("state", q.state());
        place.put("zipcode", q.zip());
        body.put("market", "Individual");
        body.put("year", q.year());
        return body;
    }

    private record Resp(int status, JsonNode body, Duration retryAfter) {
    }

    private JsonNode call(String endpoint, HttpMethod method, Function<UriBuilder, URI> uri, Object body) {
        if (clock.instant().isBefore(coolDownUntil.get())) {
            throw new CmsUnavailableException("Plan data is temporarily unavailable (rate limited).", true);
        }
        for (int attempt = 0; ; attempt++) {
            Resp resp;
            try {
                resp = exchange(method, uri, body).block(props.timeout());
            } catch (RuntimeException e) {
                logger.warning("CMS " + endpoint + " request failed: " + e.getClass().getSimpleName());
                throw new CmsUnavailableException("Plan data is temporarily unavailable.", false);
            }
            if (resp == null) {
                throw new CmsUnavailableException("Plan data is temporarily unavailable.", false);
            }
            if (resp.status() >= 200 && resp.status() < 300) {
                return resp.body();
            }
            boolean retryable = resp.status() == 429 || resp.status() == 502 || resp.status() == 503 || resp.status() == 504;
            logger.warning("CMS " + endpoint + " returned HTTP " + resp.status() + " (attempt " + (attempt + 1) + ")");
            if (!retryable) {
                throw new CmsUnavailableException("Plan data is unavailable for this search.", false);
            }
            if (attempt >= props.maxRetries()) {
                if (resp.status() == 429) {
                    coolDownUntil.set(clock.instant().plus(props.rateLimitCooldown()));
                }
                throw new CmsUnavailableException("Plan data is temporarily unavailable (rate limited).", resp.status() == 429);
            }
            sleep(resp.retryAfter() != null ? resp.retryAfter() : Duration.ofMillis(500L << attempt));
        }
    }

    private Mono<Resp> exchange(HttpMethod method, Function<UriBuilder, URI> uri, Object body) {
        WebClient.RequestBodySpec spec = webClient.method(method)
                .uri(b -> uri.apply(b.queryParam("apikey", props.apiKey())))
                .accept(MediaType.APPLICATION_JSON);
        WebClient.RequestHeadersSpec<?> ready = body != null ? spec.contentType(MediaType.APPLICATION_JSON).bodyValue(body) : spec;
        return ready.exchangeToMono(r -> {
            HttpStatusCode status = r.statusCode();
            if (status.is2xxSuccessful()) {
                return r.bodyToMono(JsonNode.class)
                        .defaultIfEmpty(mapper.createObjectNode())
                        .map(b -> new Resp(status.value(), b, null));
            }
            Duration retryAfter = parseRetryAfter(r.headers().asHttpHeaders().getFirst("Retry-After"));
            return r.releaseBody().thenReturn(new Resp(status.value(), null, retryAfter));
        });
    }

    static Duration parseRetryAfter(String header) {
        if (header == null) {
            return null;
        }
        try {
            Duration d = Duration.ofSeconds(Long.parseLong(header.trim()));
            return d.compareTo(MAX_RETRY_WAIT) > 0 ? MAX_RETRY_WAIT : d;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static void sleep(Duration d) {
        try {
            Thread.sleep(d.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new CmsUnavailableException("Plan data request was interrupted.", false);
        }
    }

    /** Visible for tests. */
    List<String> cacheSizes() {
        List<String> out = new ArrayList<>();
        out.add("counties=" + countyCache.size());
        out.add("coverage=" + coverageCache.size());
        return out;
    }
}
