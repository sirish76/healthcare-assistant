package com.healthassist.transition.cms;

import com.healthassist.transition.engine.MarketplaceSnapshot.CoverageRow;
import com.healthassist.transition.engine.MarketplaceSnapshot.PlanData;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * CMS Marketplace API (https://developer.cms.gov/marketplace-api/).
 * Implementations: {@link LiveCmsClient}, {@link FixtureCmsClient}, {@link UnavailableCmsClient}.
 * Every method throws {@link CmsUnavailableException} when data can't be fetched.
 */
public interface MarketplaceClient {

    PlanDataSource source();

    List<County> countiesByZip(String zip);

    List<PlanData> searchPlans(PlanQuery query);

    /** Second-lowest-cost silver plan premium (monthly) for the household, if the API provides it. */
    Optional<BigDecimal> benchmarkPremium(PlanQuery query);

    List<DrugSuggestion> drugAutocomplete(String query);

    List<CoverageRow> drugCoverage(int year, List<String> rxcuis, List<String> planIds);

    List<ProviderSuggestion> providerSearch(String query, String zip);

    List<CoverageRow> providerCoverage(int year, List<String> npis, List<String> planIds);

    record County(String fips, String name, String state, String zip) {
    }

    /** Household-specific query. Deliberately has no income field: credits are computed by our engine. */
    record PlanQuery(int year, String zip, String countyFips, String state, List<Person> people) {
        @Override
        public String toString() {
            return "PlanQuery[redacted]";
        }
    }

    record Person(int age, boolean usesTobacco) {
    }

    record DrugSuggestion(String rxcui, String name, String strength, String route, String fullName) {
    }

    record ProviderSuggestion(String npi, String name, String type, String specialty, String city, String state) {
    }
}
