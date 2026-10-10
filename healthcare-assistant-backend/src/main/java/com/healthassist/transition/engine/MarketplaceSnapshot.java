package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionResult.PlanDataSource;

import java.math.BigDecimal;
import java.util.List;

/** Marketplace plan data fetched for one request (live, fixture, or none). Never cached with income. */
public record MarketplaceSnapshot(PlanDataSource source,
                                  String note,
                                  List<PlanData> plans,
                                  BigDecimal benchmarkMonthly,
                                  List<CoverageRow> drugCoverage,
                                  List<CoverageRow> providerCoverage) {

    public record PlanData(String id, String name, String issuer, String metalLevel, String planType,
                           BigDecimal monthlyPremium,
                           BigDecimal deductibleIndividual, BigDecimal deductibleFamily,
                           BigDecimal moopIndividual, BigDecimal moopFamily) {
    }

    /** {@code itemId} is an RxCUI or an NPI. {@code status} is the CMS value, e.g. "Covered". */
    public record CoverageRow(String planId, String itemId, String status) {
    }

    public static MarketplaceSnapshot none(PlanDataSource source, String note) {
        return new MarketplaceSnapshot(source, note, List.of(), null, List.of(), List.of());
    }

    public boolean hasPlans() {
        return plans != null && !plans.isEmpty();
    }
}
