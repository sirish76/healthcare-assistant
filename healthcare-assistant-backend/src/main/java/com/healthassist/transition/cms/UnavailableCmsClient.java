package com.healthassist.transition.cms;

import com.healthassist.transition.engine.MarketplaceSnapshot.CoverageRow;
import com.healthassist.transition.engine.MarketplaceSnapshot.PlanData;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/** Used when CMS_MARKETPLACE_API_KEY is not set (mode=auto) or mode=off. */
public class UnavailableCmsClient implements MarketplaceClient {

    private final String reason;

    public UnavailableCmsClient(String reason) {
        this.reason = reason;
    }

    @Override
    public PlanDataSource source() {
        return PlanDataSource.UNAVAILABLE;
    }

    private CmsUnavailableException unavailable() {
        return new CmsUnavailableException(reason, false);
    }

    @Override
    public List<County> countiesByZip(String zip) {
        throw unavailable();
    }

    @Override
    public List<PlanData> searchPlans(PlanQuery query) {
        throw unavailable();
    }

    @Override
    public Optional<BigDecimal> benchmarkPremium(PlanQuery query) {
        throw unavailable();
    }

    @Override
    public List<DrugSuggestion> drugAutocomplete(String query) {
        throw unavailable();
    }

    @Override
    public List<CoverageRow> drugCoverage(int year, List<String> rxcuis, List<String> planIds) {
        throw unavailable();
    }

    @Override
    public List<ProviderSuggestion> providerSearch(String query, String zip) {
        throw unavailable();
    }

    @Override
    public List<CoverageRow> providerCoverage(int year, List<String> npis, List<String> planIds) {
        throw unavailable();
    }
}
