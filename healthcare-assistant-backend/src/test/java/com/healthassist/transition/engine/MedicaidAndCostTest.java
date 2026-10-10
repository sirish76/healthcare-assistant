package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionInput.CobraInput;
import com.healthassist.transition.model.TransitionInput.Member;
import com.healthassist.transition.model.TransitionInput.PayFrequency;
import com.healthassist.transition.model.TransitionInput.Relationship;
import com.healthassist.transition.model.TransitionResult.Availability;
import com.healthassist.transition.model.TransitionResult.MemberEligibility;
import com.healthassist.transition.regdata.RegulatoryTypes.ChipFallback;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MedicaidAndCostTest {

    private static final ChipFallback FALLBACK = new ChipFallback(BigDecimal.valueOf(175), BigDecimal.valueOf(300));
    private static final MedicaidChipEligibility.Params EXPANDED = new MedicaidChipEligibility.Params(
            true, BigDecimal.valueOf(138), null, FALLBACK, 18, 65, BigDecimal.valueOf(100));
    private static final MedicaidChipEligibility.Params NOT_EXPANDED = new MedicaidChipEligibility.Params(
            false, null, null, FALLBACK, 18, 65, BigDecimal.valueOf(100));
    private static final BigDecimal LINE_1 = new BigDecimal("15650");
    private static final BigDecimal LINE_5 = new BigDecimal("37650");

    private static Member adult() {
        return new Member(40, false, true, Relationship.SELF);
    }

    private static List<MemberEligibility> assess(MedicaidChipEligibility.Params p, List<Member> m, BigDecimal line,
                                                  String monthly, String annual) {
        return MedicaidChipEligibility.assess(p, m, line, new BigDecimal(monthly), new BigDecimal(annual));
    }

    @Test
    void adultAtExactly138PercentMonthlyIsLikely() {
        // 15650 * 1.38 / 12 = 1799.75
        assertThat(assess(EXPANDED, List.of(adult()), LINE_1, "1799.75", "60000").get(0).availability())
                .isEqualTo(Availability.LIKELY);
        assertThat(assess(EXPANDED, List.of(adult()), LINE_1, "1799.76", "60000").get(0).availability())
                .isEqualTo(Availability.UNLIKELY);
    }

    @Test
    void householdOfFiveHasHigherLimit() {
        List<Member> five = List.of(adult(), new Member(38, false, true, Relationship.SPOUSE_PARTNER),
                new Member(10, false, true, Relationship.CHILD), new Member(8, false, true, Relationship.CHILD),
                new Member(3, false, true, Relationship.CHILD));
        // 37650 * 1.38 / 12 = 4329.75: likely for five, but far above the limit for one
        assertThat(assess(EXPANDED, five, LINE_5, "4329.75", "90000").get(0).availability()).isEqualTo(Availability.LIKELY);
        assertThat(assess(EXPANDED, List.of(adult()), LINE_1, "4329.75", "90000").get(0).availability())
                .isEqualTo(Availability.UNLIKELY);
    }

    @Test
    void annualUnderLimitButMonthlyOverIsPossible() {
        assertThat(assess(EXPANDED, List.of(adult()), LINE_1, "3000", "20000").get(0).availability())
                .isEqualTo(Availability.POSSIBLE);
    }

    @Test
    void nonExpansionStateAdultsWithoutChildrenAreUnlikely() {
        assertThat(assess(NOT_EXPANDED, List.of(adult()), LINE_1, "0", "0").get(0).availability())
                .isEqualTo(Availability.UNLIKELY);
    }

    @Test
    void nonExpansionParentsWithVeryLowIncomeArePossible() {
        List<Member> fam = List.of(adult(), new Member(6, false, true, Relationship.CHILD));
        BigDecimal line2 = new BigDecimal("21150");
        var res = assess(NOT_EXPANDED, fam, line2, "1000", "12000");
        assertThat(res.get(0).availability()).isEqualTo(Availability.POSSIBLE);
        assertThat(res.get(1).availability()).isEqualTo(Availability.LIKELY);
    }

    @Test
    void childrenUseFallbackBandsUntilStateLimitsAreLoaded() {
        List<Member> kid = List.of(new Member(7, false, true, Relationship.CHILD));
        // 175% of 15650 = 27387.50/yr = 2282.29/mo (rounded down to stay at/below)
        assertThat(assess(EXPANDED, kid, LINE_1, "2282.29", "0").get(0).availability()).isEqualTo(Availability.LIKELY);
        assertThat(assess(EXPANDED, kid, LINE_1, "3000", "0").get(0).availability()).isEqualTo(Availability.POSSIBLE);
        assertThat(assess(EXPANDED, kid, LINE_1, "4000", "0").get(0).availability()).isEqualTo(Availability.UNLIKELY);
    }

    @Test
    void stateChipLimitWinsOverFallback() {
        var p = new MedicaidChipEligibility.Params(true, BigDecimal.valueOf(138), BigDecimal.valueOf(300), FALLBACK, 18, 65,
                BigDecimal.valueOf(100));
        assertThat(assess(p, List.of(new Member(7, false, true, Relationship.CHILD)), LINE_1, "3900", "0").get(0).availability())
                .isEqualTo(Availability.LIKELY);
    }

    @Test
    void medicareAgeIsUnknown() {
        assertThat(assess(EXPANDED, List.of(new Member(66, false, true, Relationship.SELF)), LINE_1, "0", "0")
                .get(0).availability()).isEqualTo(Availability.UNKNOWN);
    }

    @Test
    void outOfPocketIsDeductiblePlusCoinsuranceCappedAtMax() {
        assertThat(CostModel.expectedOutOfPocket(new BigDecimal("6000"), new BigDecimal("2000"), new BigDecimal("6000"),
                new BigDecimal("0.2"))).isEqualByComparingTo("2800");
        assertThat(CostModel.expectedOutOfPocket(new BigDecimal("50000"), new BigDecimal("2000"), new BigDecimal("6000"),
                new BigDecimal("0.2"))).isEqualByComparingTo("6000");
        assertThat(CostModel.expectedOutOfPocket(new BigDecimal("500"), new BigDecimal("2000"), new BigDecimal("6000"),
                new BigDecimal("0.2"))).isEqualByComparingTo("500");
    }

    @Test
    void metDeductibleCarriesOverIntoEstimate() {
        var terms = new CostModel.PlanTerms(new BigDecimal("650"), new BigDecimal("2000"), new BigDecimal("6000"), new BigDecimal("0.2"));
        var withProgress = CostModel.estimate(terms, 3, new BigDecimal("6000"), new BigDecimal("1500"), new BigDecimal("1800"));
        assertThat(withProgress.premiums()).isEqualByComparingTo("1950");
        assertThat(withProgress.outOfPocket()).isEqualByComparingTo("700");
        assertThat(withProgress.total()).isEqualByComparingTo("2650");
        var fresh = CostModel.estimate(terms, 3, new BigDecimal("6000"), BigDecimal.ZERO, BigDecimal.ZERO);
        assertThat(fresh.outOfPocket()).isEqualByComparingTo("1500");
    }

    @Test
    void cobraFromNoticeOrPaycheck() {
        var fromNotice = CobraEstimator.monthlyPremium(new CobraInput(new BigDecimal("700"), null, null),
                new BigDecimal("0.84"), BigDecimal.valueOf(102)).orElseThrow();
        assertThat(fromNotice.monthly()).isEqualByComparingTo("700");
        assertThat(fromNotice.basis()).isEqualTo(CobraEstimator.Basis.NOTICE);

        var fromPay = CobraEstimator.monthlyPremium(new CobraInput(null, new BigDecimal("150"), PayFrequency.BIWEEKLY),
                new BigDecimal("0.84"), BigDecimal.valueOf(102)).orElseThrow();
        assertThat(fromPay.monthly()).isEqualByComparingTo("2071.88");
        assertThat(fromPay.basis()).isEqualTo(CobraEstimator.Basis.ESTIMATED_FROM_PAYCHECK);

        assertThat(CobraEstimator.monthlyPremium(new CobraInput(null, null, null), new BigDecimal("0.84"),
                BigDecimal.valueOf(102))).isEmpty();
    }
}
