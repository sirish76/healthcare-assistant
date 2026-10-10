package com.healthassist.transition.engine;

import com.healthassist.transition.regdata.RegulatoryData;
import com.healthassist.transition.regdata.RegulatoryDataLoader;
import com.healthassist.transition.regdata.RegulatoryTypes.ApplicableBand;
import com.healthassist.transition.regdata.RegulatoryTypes.FplGuideline;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FplAndSubsidyTest {

    private static final RegulatoryData DATA = RegulatoryDataLoader.load();
    private static final FplGuideline G2025 = DATA.guideline(2025, "NC").value();
    private static final List<ApplicableBand> STANDARD_2026 =
            DATA.planYearOrNearest(2026).applicablePercentages().standard().value();
    private static final List<ApplicableBand> ENHANCED_2026 =
            DATA.planYearOrNearest(2026).applicablePercentages().enhanced().value();

    @ParameterizedTest
    @CsvSource({"1, 15650", "2, 21150", "4, 32150", "5, 37650", "8, 54150"})
    void povertyLineByHouseholdSize(int size, String expected) {
        assertThat(FplCalculator.povertyLine(G2025, size)).isEqualByComparingTo(expected);
    }

    @Test
    void percentOfFplForHouseholdOfOneVersusFive() {
        BigDecimal income = new BigDecimal("37650");
        assertThat(FplCalculator.percentOfFpl(income, FplCalculator.povertyLine(G2025, 1))).isEqualByComparingTo("240.57");
        assertThat(FplCalculator.percentOfFpl(income, FplCalculator.povertyLine(G2025, 5))).isEqualByComparingTo("100.00");
    }

    @Test
    void thresholdIsInclusiveAndExact() {
        BigDecimal line = FplCalculator.povertyLine(G2025, 1);
        BigDecimal at138 = new BigDecimal("21597.00"); // 15650 * 1.38
        assertThat(FplCalculator.atOrBelow(at138, line, BigDecimal.valueOf(138))).isTrue();
        assertThat(FplCalculator.atOrBelow(at138.add(new BigDecimal("0.01")), line, BigDecimal.valueOf(138))).isFalse();
        assertThat(FplCalculator.atOrAbove(line, line, BigDecimal.valueOf(100))).isTrue();
        assertThat(FplCalculator.atOrAbove(line.subtract(new BigDecimal("0.01")), line, BigDecimal.valueOf(100))).isFalse();
    }

    @Test
    void exactly400PercentIsEligibleOneDollarOverIsNot() {
        BigDecimal line = FplCalculator.povertyLine(G2025, 1);
        BigDecimal at400 = new BigDecimal("62600");
        assertThat(SubsidyEstimator.applicablePercent(FplCalculator.percentOfFplPrecise(at400, line), STANDARD_2026))
                .hasValueSatisfying(p -> assertThat(p).isEqualByComparingTo("9.96"));
        BigDecimal over = at400.add(BigDecimal.ONE);
        assertThat(SubsidyEstimator.applicablePercent(FplCalculator.percentOfFplPrecise(over, line), STANDARD_2026)).isEmpty();
    }

    @Test
    void household5At400PercentBoundary() {
        BigDecimal line = FplCalculator.povertyLine(G2025, 5); // 37650
        BigDecimal at400 = new BigDecimal("150600");
        assertThat(SubsidyEstimator.applicablePercent(FplCalculator.percentOfFplPrecise(at400, line), STANDARD_2026)).isPresent();
        assertThat(SubsidyEstimator.applicablePercent(
                FplCalculator.percentOfFplPrecise(at400.add(BigDecimal.ONE), line), STANDARD_2026)).isEmpty();
    }

    @Test
    void bandEdgesAreHalfOpen() {
        // At exactly 133% the next band starts (3.14), just below it the flat 2.10 applies.
        assertThat(SubsidyEstimator.applicablePercent(new BigDecimal("133"), STANDARD_2026).orElseThrow())
                .isEqualByComparingTo("3.14");
        assertThat(SubsidyEstimator.applicablePercent(new BigDecimal("132.99"), STANDARD_2026).orElseThrow())
                .isEqualByComparingTo("2.10");
    }

    @Test
    void interpolatesWithinBand() {
        // 175% is halfway through 150–200 (4.19 → 6.60)
        assertThat(SubsidyEstimator.applicablePercent(new BigDecimal("175"), STANDARD_2026).orElseThrow())
                .isEqualByComparingTo("5.395");
    }

    @Test
    void enhancedScheduleHasNoCliff() {
        assertThat(SubsidyEstimator.applicablePercent(new BigDecimal("650"), ENHANCED_2026).orElseThrow())
                .isEqualByComparingTo("8.5");
        assertThat(SubsidyEstimator.applicablePercent(new BigDecimal("120"), ENHANCED_2026).orElseThrow())
                .isEqualByComparingTo("0");
    }

    @Test
    void creditIsBenchmarkMinusContributionFlooredAtZero() {
        BigDecimal required = SubsidyEstimator.requiredAnnualContribution(new BigDecimal("40000"), new BigDecimal("8.44"));
        assertThat(required).isEqualByComparingTo("3376.00");
        assertThat(SubsidyEstimator.monthlyCredit(new BigDecimal("500"), required)).isEqualByComparingTo("218.67");
        assertThat(SubsidyEstimator.monthlyCredit(new BigDecimal("200"), required)).isEqualByComparingTo("0");
    }

    @Test
    void employerAffordabilityBoundaryIsInclusive() {
        // 9.96% of 60,000 = 5,976/yr = 498/month
        BigDecimal income = new BigDecimal("60000");
        BigDecimal pct = new BigDecimal("9.96");
        assertThat(SubsidyEstimator.employerCoverageAffordable(new BigDecimal("498"), income, pct)).isTrue();
        assertThat(SubsidyEstimator.employerCoverageAffordable(new BigDecimal("498.01"), income, pct)).isFalse();
    }

    @Test
    void incomeHelpersAddUp() {
        var in = new com.healthassist.transition.model.TransitionInput.IncomeInput(null, new BigDecimal("30000"),
                new BigDecimal("5000"), new BigDecimal("450"), 20, new BigDecimal("24000"), new BigDecimal("1000"), null, null);
        assertThat(IncomeCalculator.projectedAnnual(in)).isEqualByComparingTo("69000");
        // monthly now: 450 * 52/12 + (24000 + 1000)/12
        assertThat(IncomeCalculator.currentMonthly(in)).isEqualByComparingTo("4033.33");
    }
}
