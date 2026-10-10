package com.healthassist.transition;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.healthassist.transition.cms.FixtureCmsClient;
import com.healthassist.transition.cms.MarketplaceClient;
import com.healthassist.transition.cms.UnavailableCmsClient;
import com.healthassist.transition.engine.InvalidTransitionInputException;
import com.healthassist.transition.engine.TransitionAnalyzer;
import com.healthassist.transition.model.TransitionInput.CareInput;
import com.healthassist.transition.model.TransitionInput.CoverageDates;
import com.healthassist.transition.model.TransitionInput.DrugRef;
import com.healthassist.transition.model.TransitionInput.IncomeInput;
import com.healthassist.transition.model.TransitionInput.Member;
import com.healthassist.transition.model.TransitionInput.Relationship;
import com.healthassist.transition.model.TransitionInput.SpousePlanInput;
import com.healthassist.transition.model.TransitionInput.UsageLevel;
import com.healthassist.transition.model.TransitionResult;
import com.healthassist.transition.model.TransitionResult.Availability;
import com.healthassist.transition.model.TransitionResult.CoverageOption;
import com.healthassist.transition.model.TransitionResult.OptionType;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;
import com.healthassist.transition.model.TransitionResult.PlanQuote;
import com.healthassist.transition.model.TransitionResult.WatchOut;
import com.healthassist.transition.regdata.RegulatoryData;
import com.healthassist.transition.regdata.RegulatoryDataLoader;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** End-to-end through the service + rules engine with fixture plan data and a fixed "today" (Oct 10, 2026). */
class TransitionServiceTest {

    private static final RegulatoryData DATA = RegulatoryDataLoader.load();
    private static final Clock TODAY = Clock.fixed(LocalDate.of(2026, 10, 10).atStartOfDay(ZoneId.of("UTC")).toInstant(),
            ZoneId.of("UTC"));

    private static TransitionService service(MarketplaceClient client) {
        return new TransitionService(DATA, new TransitionAnalyzer(DATA), client, TODAY);
    }

    private static final TransitionService FIXTURE = service(new FixtureCmsClient(new ObjectMapper()));

    private static CoverageOption option(TransitionResult r, OptionType t) {
        return r.options().stream().filter(o -> o.type() == t).findFirst().orElse(null);
    }

    private static List<String> watchKeys(TransitionResult r) {
        return r.watchOuts().stream().map(WatchOut::key).toList();
    }

    @Test
    void singleAdultInHealthcareGovStateWithFixturePlans() {
        TestInputs in = TestInputs.single();
        in.care = new CareInput(UsageLevel.MODERATE, List.of(new DrugRef("1373463", "insulin glargine")), List.of());
        TransitionResult r = FIXTURE.analyze(in.build());

        assertThat(r.meta().planYear()).isEqualTo(2026);
        assertThat(r.meta().planDataSource()).isEqualTo(PlanDataSource.FIXTURE);
        assertThat(r.location().state()).isEqualTo("NC");
        assertThat(r.location().countyName()).isEqualTo("Davidson County");
        assertThat(r.household().monthsInPeriod()).isEqualTo(3);
        assertThat(r.household().annualFplPercent()).isEqualByComparingTo("255.59");
        assertThat(r.options()).extracting(CoverageOption::type)
                .containsExactly(OptionType.COBRA, OptionType.MARKETPLACE, OptionType.MEDICAID_CHIP);

        CoverageOption cobra = option(r, OptionType.COBRA);
        assertThat(cobra.monthlyPremium()).isEqualByComparingTo("650");
        assertThat(cobra.deductibleCarriesOver()).isTrue();
        assertThat(cobra.deductibleRemaining()).isEqualByComparingTo("500");

        CoverageOption mkt = option(r, OptionType.MARKETPLACE);
        assertThat(mkt.subsidy().eligible()).isTrue();
        assertThat(mkt.subsidy().benchmarkMonthlyPremium()).isEqualByComparingTo("512.33");
        assertThat(mkt.subsidy().estimatedMonthlyCredit()).isPositive();
        assertThat(mkt.plans()).isNotEmpty()
                .noneMatch(p -> "Catastrophic".equals(p.metalLevel())) // 40-year-old
                .extracting(PlanQuote::periodCost).isSorted();
        PlanQuote bronze = mkt.plans().stream().filter(p -> p.metalLevel().equals("Bronze")).findFirst().orElseThrow();
        assertThat(bronze.drugCoverage()).singleElement().satisfies(c -> assertThat(c.status()).isEqualTo("NotCovered"));
        assertThat(bronze.monthlyPremiumAfterCredit()).isLessThan(bronze.monthlyPremium());
        assertThat(mkt.periodCost()).isEqualByComparingTo(mkt.plans().get(0).periodCost());

        // No income this month after the job ended, so Medicaid looks likely now.
        assertThat(option(r, OptionType.MEDICAID_CHIP).availability()).isEqualTo(Availability.LIKELY);
        assertThat(watchKeys(r)).contains("MEDICAID_MONTHLY_INCOME", "SUBSIDY_REPAYMENT", "SHORT_PERIOD",
                "DEDUCTIBLE_PROGRESS", "SAMPLE_PLAN_DATA", "COBRA_DROP_NO_SEP");
        assertThat(r.nextSteps().get(0).key()).isEqualTo("APPLY_MEDICAID");
        assertThat(r.meta().pendingReviewValues()).isNotEmpty();
    }

    @Test
    void stateExchangeHandsOffButStillComputesEverythingElse() {
        TestInputs in = TestInputs.single();
        in.zip = "94103";
        in.income = TestInputs.incomeWithMonthly("52000", "4300");
        TransitionResult r = FIXTURE.analyze(in.build());

        assertThat(r.location().exchangeType()).isEqualTo("STATE");
        assertThat(r.meta().planDataSource()).isEqualTo(PlanDataSource.NOT_APPLICABLE);
        CoverageOption mkt = option(r, OptionType.MARKETPLACE);
        assertThat(mkt.plans()).isEmpty();
        assertThat(mkt.handoff().name()).isEqualTo("Covered California");
        assertThat(mkt.handoff().url()).isEqualTo("https://www.coveredca.com/");
        assertThat(mkt.subsidy().eligible()).isTrue();
        assertThat(mkt.subsidy().maxMonthlyForBenchmark()).isPositive();
        assertThat(option(r, OptionType.COBRA).periodCost()).isPositive();
        assertThat(r.timeline()).isNotEmpty();
        assertThat(watchKeys(r)).contains("STATE_EXCHANGE");
        assertThat(r.nextSteps()).anyMatch(s -> "https://www.coveredca.com/".equals(s.url()));
    }

    @Test
    void degradesGracefullyWithoutApiKey() {
        TransitionResult r = service(new UnavailableCmsClient("Live plan data isn't set up yet.")).analyze(TestInputs.single().build());
        assertThat(r.meta().planDataSource()).isEqualTo(PlanDataSource.UNAVAILABLE);
        assertThat(r.location().state()).isEqualTo("NC"); // from the ZIP prefix table
        CoverageOption mkt = option(r, OptionType.MARKETPLACE);
        assertThat(mkt.plans()).isEmpty();
        assertThat(mkt.handoff().url()).isEqualTo("https://www.healthcare.gov/");
        assertThat(mkt.subsidy().maxMonthlyForBenchmark()).isPositive();
        assertThat(option(r, OptionType.COBRA).periodCost()).isPositive();
        assertThat(watchKeys(r)).contains("PLAN_DATA_UNAVAILABLE");
    }

    @Test
    void nonExpansionStateLowIncomeFamilyHitsCoverageGap() {
        TestInputs in = TestInputs.single().family(2, 2);
        in.zip = "75201";
        in.income = TestInputs.incomeWithMonthly("20000", "1000");
        TransitionResult r = FIXTURE.analyze(in.build());

        assertThat(r.location().state()).isEqualTo("TX");
        CoverageOption mkt = option(r, OptionType.MARKETPLACE);
        assertThat(mkt.subsidy().eligible()).isFalse();
        assertThat(mkt.subsidy().reason()).contains("below 100%");
        assertThat(watchKeys(r)).contains("COVERAGE_GAP");
        CoverageOption med = option(r, OptionType.MEDICAID_CHIP);
        assertThat(med.members()).filteredOn(m -> m.group().equals("CHILD"))
                .allMatch(m -> m.availability() == Availability.LIKELY);
        // Adults are only "possible", so no household-wide $0 cost is shown... unless all could qualify.
        assertThat(med.members()).filteredOn(m -> m.group().equals("ADULT"))
                .allMatch(m -> m.availability() == Availability.POSSIBLE);
        assertThat(med.periodCost()).isEqualByComparingTo("0");
    }

    @Test
    void medicaidForOnlySomeMembersShowsNoHouseholdCost() {
        TestInputs in = TestInputs.single().family(2, 1);
        in.income = TestInputs.incomeWithMonthly("90000", "4500"); // ~255% FPL monthly for 3: child possible, adults not
        TransitionResult r = FIXTURE.analyze(in.build());
        CoverageOption med = option(r, OptionType.MEDICAID_CHIP);
        assertThat(med.availability()).isEqualTo(Availability.POSSIBLE);
        assertThat(med.monthlyPremium()).isEqualByComparingTo("0");
        assertThat(med.periodCost()).isNull();
        assertThat(med.notes()).anyMatch(n -> n.contains("only for the children"));
        assertThat(r.chatSummary()).contains("COBRA (keep your old plan): available, $650/month");
    }

    @Test
    void coverageStartingNextYearUsesNextYearIncomeAndRules() {
        TestInputs in = TestInputs.single();
        in.dates = new CoverageDates(LocalDate.of(2026, 12, 15), LocalDate.of(2026, 12, 31), false, null);
        in.income = new IncomeInput(new BigDecimal("80000"), null, null, null, null, null, null, new BigDecimal("30000"),
                new BigDecimal("2500"));
        TransitionResult r = FIXTURE.analyze(in.build());

        assertThat(r.meta().planYear()).isEqualTo(2027);
        assertThat(r.household().incomeYear()).isEqualTo(2027);
        assertThat(r.household().projectedAnnualIncome()).isEqualByComparingTo("30000");
        assertThat(r.household().subsidyGuidelineYear()).isEqualTo(2026);
        assertThat(r.household().monthsInPeriod()).isEqualTo(12);
        assertThat(option(r, OptionType.COBRA).deductibleCarriesOver()).isFalse();
        assertThat(watchKeys(r)).contains("NEXT_PLAN_YEAR");
        assertThat(r.watchOuts()).filteredOn(w -> w.key().equals("NEXT_PLAN_YEAR"))
                .allMatch(w -> !w.body().contains("used this year's"));
    }

    @Test
    void nextYearWithoutNextYearIncomeWarns() {
        TestInputs in = TestInputs.single();
        in.dates = new CoverageDates(null, LocalDate.of(2026, 12, 31), false, null);
        TransitionResult r = FIXTURE.analyze(in.build());
        assertThat(r.household().incomeYear()).isEqualTo(2026);
        assertThat(r.watchOuts()).filteredOn(w -> w.key().equals("NEXT_PLAN_YEAR"))
                .singleElement().satisfies(w -> assertThat(w.body()).contains("used this year's"));
    }

    @Test
    void affordableSpousePlanBlocksSubsidy() {
        TestInputs in = TestInputs.single().family(2, 1);
        in.income = TestInputs.incomeWithMonthly("60000", "5000");
        in.spousePlan = new SpousePlanInput(true, new BigDecimal("400"), null, null);
        TransitionResult r = FIXTURE.analyze(in.build());

        assertThat(option(r, OptionType.MARKETPLACE).subsidy().eligible()).isFalse();
        assertThat(option(r, OptionType.MARKETPLACE).subsidy().reason()).contains("spouse");
        CoverageOption spouse = option(r, OptionType.SPOUSE_PLAN);
        assertThat(spouse.availability()).isEqualTo(Availability.AVAILABLE);
        assertThat(spouse.periodCost()).isPositive();
        assertThat(watchKeys(r)).contains("SPOUSE_PLAN_AFFORDABLE", "SPOUSE_PLAN_WINDOW");
        assertThat(r.timeline()).anyMatch(t -> t.key().equals("SPOUSE_PLAN"));
    }

    @Test
    void medicareAgeMemberGetsPartBDeadline() {
        TestInputs in = TestInputs.single().members(new Member(66, false, true, Relationship.SELF));
        TransitionResult r = FIXTURE.analyze(in.build());
        assertThat(r.timeline()).anyMatch(t -> t.key().equals("MEDICARE_PART_B"));
        assertThat(r.watchOuts().get(0).key()).isEqualTo("MEDICARE_AGE");
        assertThat(r.nextSteps()).anyMatch(s -> s.key().equals("MEDICARE"));
    }

    @Test
    void expiredWindowsAreReported() {
        TestInputs in = TestInputs.single();
        in.dates = new CoverageDates(null, LocalDate.of(2026, 6, 30), true, LocalDate.of(2026, 7, 1));
        TransitionResult r = FIXTURE.analyze(in.build());
        assertThat(option(r, OptionType.MARKETPLACE).availability()).isEqualTo(Availability.NOT_AVAILABLE);
        assertThat(option(r, OptionType.COBRA).availability()).isEqualTo(Availability.NOT_AVAILABLE);
        assertThat(watchKeys(r)).contains("SEP_PASSED", "COBRA_ELECTION_PASSED").doesNotContain("COBRA_DROP_NO_SEP");
        assertThat(r.nextSteps()).anyMatch(s -> s.key().equals("MARKETPLACE_OPEN_ENROLLMENT"));
    }

    @Test
    void chatSummaryContainsOnlyComputedFigures() {
        TestInputs in = TestInputs.single();
        in.income = TestInputs.incomeWithMonthly("43210.99", "1234.56");
        in.care = new CareInput(UsageLevel.HIGH, List.of(new DrugRef("861007", "metformin")), List.of());
        String summary = FIXTURE.analyze(in.build()).chatSummary();

        assertThat(summary).contains("North Carolina", "% of the federal poverty level", "COBRA");
        assertThat(summary).doesNotContain("27360", "metformin", "861007", "43210", "43,210", "1234", "Davidson", "age 40");
    }

    @Test
    void missingDatesIsAnInputError() {
        TestInputs in = TestInputs.single();
        in.dates = new CoverageDates(null, null, false, null);
        assertThatThrownBy(() -> FIXTURE.analyze(in.build())).isInstanceOf(InvalidTransitionInputException.class);
    }

    @Test
    void unknownZipWithoutStateIsAnInputError() {
        TestInputs in = TestInputs.single();
        in.zip = "00601"; // Puerto Rico: not supported
        assertThatThrownBy(() -> service(new UnavailableCmsClient("x")).analyze(in.build()))
                .isInstanceOf(InvalidTransitionInputException.class);
    }

    @Test
    void multiCountyZipNeedsCountyForPlans() {
        TestInputs in = TestInputs.single();
        in.zip = "27013";
        TransitionResult r = FIXTURE.analyze(in.build());
        assertThat(r.meta().planDataSource()).isEqualTo(PlanDataSource.UNAVAILABLE);
        in.countyFips = "37097";
        TransitionResult withCounty = FIXTURE.analyze(in.build());
        assertThat(withCounty.location().countyName()).isEqualTo("Iredell County");
        assertThat(option(withCounty, OptionType.MARKETPLACE).plans()).isNotEmpty();
    }
}
