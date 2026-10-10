package com.healthassist.transition.cms;

import com.fasterxml.jackson.databind.JsonNode;
import com.healthassist.transition.cms.MarketplaceClient.County;
import com.healthassist.transition.cms.MarketplaceClient.DrugSuggestion;
import com.healthassist.transition.cms.MarketplaceClient.ProviderSuggestion;
import com.healthassist.transition.engine.MarketplaceSnapshot.CoverageRow;
import com.healthassist.transition.engine.MarketplaceSnapshot.PlanData;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Maps CMS Marketplace API JSON to our types. Shared by the live and fixture
 * clients, so fixture tests exercise the same parsing as production.
 * Field names follow the published API docs; verify against real responses
 * once the API key is issued.
 */
public final class CmsResponseParser {

    private CmsResponseParser() {
    }

    public static List<County> counties(JsonNode root) {
        List<County> out = new ArrayList<>();
        for (JsonNode c : root.path("counties")) {
            out.add(new County(c.path("fips").asText(), c.path("name").asText(), c.path("state").asText(),
                    c.path("zipcode").asText()));
        }
        return out;
    }

    public static List<PlanData> plans(JsonNode root) {
        List<PlanData> out = new ArrayList<>();
        for (JsonNode p : root.path("plans")) {
            out.add(new PlanData(
                    p.path("id").asText(),
                    p.path("name").asText(),
                    p.path("issuer").path("name").asText(null),
                    p.path("metal_level").asText(null),
                    p.path("type").asText(null),
                    decimal(p.path("premium")),
                    costShare(p.path("deductibles"), false),
                    costShare(p.path("deductibles"), true),
                    costShare(p.path("moops"), false),
                    costShare(p.path("moops"), true)));
        }
        return out;
    }

    /**
     * Picks the in-network amount for individual or family coverage. Prefers
     * the combined medical+drug figure, else the medical one.
     */
    static BigDecimal costShare(JsonNode list, boolean family) {
        BigDecimal medical = null;
        for (JsonNode d : list) {
            String tier = d.path("network_tier").asText("");
            if (!tier.isEmpty() && !"In-Network".equalsIgnoreCase(tier)) {
                continue;
            }
            String fc = d.path("family_cost").asText("");
            boolean isFamily = "Family".equalsIgnoreCase(fc);
            boolean isIndividual = "Individual".equalsIgnoreCase(fc);
            if (family ? !isFamily : !isIndividual) {
                continue;
            }
            String type = d.path("type").asText("");
            BigDecimal amount = decimal(d.path("amount"));
            if (amount == null) {
                continue;
            }
            if (type.contains("Combined") || type.contains("Total")) {
                return amount;
            }
            if (medical == null && type.contains("Medical")) {
                medical = amount;
            }
        }
        return medical;
    }

    /** SLCSP response shape is not fully specified in the docs we built against; accept the plausible ones. */
    public static Optional<BigDecimal> benchmark(JsonNode root) {
        for (JsonNode candidate : List.of(root.path("premium"), root.path("plan").path("premium"),
                root.path("slcsp").path("premium"))) {
            BigDecimal v = decimal(candidate);
            if (v != null) {
                return Optional.of(v);
            }
        }
        return Optional.empty();
    }

    public static List<DrugSuggestion> drugs(JsonNode root) {
        JsonNode list = root.isArray() ? root : root.path("drugs");
        List<DrugSuggestion> out = new ArrayList<>();
        for (JsonNode d : list) {
            out.add(new DrugSuggestion(d.path("rxcui").asText(), d.path("name").asText(),
                    d.path("strength").asText(null), d.path("route").asText(null), d.path("full_name").asText(null)));
        }
        return out;
    }

    public static List<CoverageRow> drugCoverage(JsonNode root) {
        List<CoverageRow> out = new ArrayList<>();
        for (JsonNode c : root.path("coverage")) {
            out.add(new CoverageRow(c.path("plan_id").asText(), c.path("rxcui").asText(), c.path("coverage").asText()));
        }
        return out;
    }

    public static List<ProviderSuggestion> providers(JsonNode root) {
        List<ProviderSuggestion> out = new ArrayList<>();
        for (JsonNode r : root.path("providers")) {
            JsonNode p = r.has("provider") ? r.path("provider") : r;
            JsonNode addr = r.path("address");
            JsonNode specs = p.path("specialties");
            out.add(new ProviderSuggestion(p.path("npi").asText(), p.path("name").asText(),
                    p.path("provider_type").asText(null),
                    specs.isArray() && !specs.isEmpty() ? specs.get(0).asText() : null,
                    addr.path("city").asText(null), addr.path("state").asText(null)));
        }
        return out;
    }

    public static List<CoverageRow> providerCoverage(JsonNode root) {
        List<CoverageRow> out = new ArrayList<>();
        for (JsonNode c : root.path("coverage")) {
            out.add(new CoverageRow(c.path("plan_id").asText(), c.path("npi").asText(), c.path("coverage").asText()));
        }
        return out;
    }

    private static BigDecimal decimal(JsonNode n) {
        return n != null && n.isNumber() ? n.decimalValue() : null;
    }
}
