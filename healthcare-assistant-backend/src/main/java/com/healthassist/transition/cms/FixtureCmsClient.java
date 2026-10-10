package com.healthassist.transition.cms;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.healthassist.transition.engine.MarketplaceSnapshot.CoverageRow;
import com.healthassist.transition.engine.MarketplaceSnapshot.PlanData;
import com.healthassist.transition.location.ZipStateLookup;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Serves bundled sample responses (in the real CMS JSON shape) from
 * {@code resources/transition/cms-fixtures}. For local development and tests
 * only. The results are labeled as sample data in the UI.
 */
public class FixtureCmsClient implements MarketplaceClient {

    private static final String DIR = "transition/cms-fixtures/";

    // Rough federal default age curve, used only to make sample premiums vary by age.
    private static final int[] AGES = {0, 20, 21, 30, 40, 50, 60, 64};
    private static final double[] FACTORS = {0.765, 0.765, 1.0, 1.135, 1.278, 1.786, 2.714, 3.0};

    private final ObjectMapper mapper;
    private final JsonNode counties;
    private final JsonNode plans;
    private final JsonNode drugs;
    private final JsonNode drugCoverage;
    private final JsonNode providers;
    private final JsonNode providerCoverage;

    public FixtureCmsClient(ObjectMapper mapper) {
        this.mapper = mapper;
        this.counties = read("counties-by-zip.json");
        this.plans = read("plans-search.json");
        this.drugs = read("drugs-autocomplete.json");
        this.drugCoverage = read("drugs-covered.json");
        this.providers = read("providers-search.json");
        this.providerCoverage = read("providers-covered.json");
    }

    private JsonNode read(String file) {
        try (InputStream in = new ClassPathResource(DIR + file).getInputStream()) {
            return mapper.readTree(in);
        } catch (IOException e) {
            throw new UncheckedIOException("Missing CMS fixture " + file, e);
        }
    }

    @Override
    public PlanDataSource source() {
        return PlanDataSource.FIXTURE;
    }

    @Override
    public List<County> countiesByZip(String zip) {
        if (counties.has(zip)) {
            return CmsResponseParser.counties(counties.get(zip));
        }
        String state = ZipStateLookup.stateFor(zip).orElse("NC");
        ObjectNode root = mapper.createObjectNode();
        root.putArray("counties").addObject()
                .put("fips", "99999").put("name", "Sample County").put("state", state).put("zipcode", zip);
        return CmsResponseParser.counties(root);
    }

    /** Premiums in the fixture are for one 40-year-old; scale by the household's ages. */
    @Override
    public List<PlanData> searchPlans(PlanQuery q) {
        ObjectNode copy = plans.deepCopy();
        double factor = q.people().stream().mapToDouble(p -> ageFactor(p.age()) / ageFactor(40) * (p.usesTobacco() ? 1.2 : 1.0)).sum();
        for (JsonNode p : copy.path("plans")) {
            BigDecimal base = p.path("premium").decimalValue();
            ((ObjectNode) p).put("premium", base.multiply(BigDecimal.valueOf(factor)).setScale(2, RoundingMode.HALF_UP));
        }
        return CmsResponseParser.plans(copy);
    }

    @Override
    public Optional<BigDecimal> benchmarkPremium(PlanQuery q) {
        return Optional.empty(); // engine falls back to the 2nd-lowest silver plan in the search results
    }

    @Override
    public List<DrugSuggestion> drugAutocomplete(String query) {
        String q = query.trim().toLowerCase();
        ArrayNode filtered = mapper.createArrayNode();
        for (JsonNode d : drugs) {
            if (d.path("name").asText().toLowerCase().contains(q) || d.path("full_name").asText().toLowerCase().contains(q)) {
                filtered.add(d);
            }
        }
        return CmsResponseParser.drugs(filtered);
    }

    @Override
    public List<CoverageRow> drugCoverage(int year, List<String> rxcuis, List<String> planIds) {
        return filterCoverage(CmsResponseParser.drugCoverage(drugCoverage), rxcuis, planIds);
    }

    @Override
    public List<ProviderSuggestion> providerSearch(String query, String zip) {
        String q = query.trim().toLowerCase();
        return CmsResponseParser.providers(providers).stream().filter(p -> p.name().toLowerCase().contains(q)).toList();
    }

    @Override
    public List<CoverageRow> providerCoverage(int year, List<String> npis, List<String> planIds) {
        return filterCoverage(CmsResponseParser.providerCoverage(providerCoverage), npis, planIds);
    }

    /** Rows listed in the fixture, plus "DataNotProvided" for anything the fixture doesn't mention. */
    private static List<CoverageRow> filterCoverage(List<CoverageRow> all, List<String> items, List<String> planIds) {
        List<CoverageRow> out = new ArrayList<>();
        for (String plan : planIds) {
            for (String item : items) {
                out.add(all.stream().filter(r -> r.planId().equals(plan) && r.itemId().equals(item)).findFirst()
                        .orElse(new CoverageRow(plan, item, "DataNotProvided")));
            }
        }
        return out;
    }

    static double ageFactor(int age) {
        if (age >= AGES[AGES.length - 1]) {
            return FACTORS[FACTORS.length - 1];
        }
        for (int i = 1; i < AGES.length; i++) {
            if (age <= AGES[i]) {
                double t = (double) (age - AGES[i - 1]) / (AGES[i] - AGES[i - 1]);
                return FACTORS[i - 1] + t * (FACTORS[i] - FACTORS[i - 1]);
            }
        }
        return 1.0;
    }
}
