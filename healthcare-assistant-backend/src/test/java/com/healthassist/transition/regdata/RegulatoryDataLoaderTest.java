package com.healthassist.transition.regdata;

import com.healthassist.transition.regdata.RegulatoryTypes.ExchangeType;
import com.healthassist.transition.regdata.RegulatoryTypes.StateInfo;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RegulatoryDataLoaderTest {

    private final RegulatoryData data = RegulatoryDataLoader.load();

    @Test
    void loadsBothPlanYearsAndVersion() {
        assertThat(data.planYears()).contains(2026, 2027);
        assertThat(data.dataVersion()).isNotBlank();
    }

    @Test
    void hasAllFiftyStatesPlusDc() {
        assertThat(data.common().states()).hasSize(51);
    }

    @Test
    void everyStateValueHasSourceUrlAndEffectiveDate() {
        for (Map.Entry<String, StateInfo> e : data.common().states().entrySet()) {
            StateInfo s = e.getValue();
            for (Sourced<?> v : new Sourced<?>[]{s.exchange(), s.medicaidAdults(), s.chip(), s.medicaidUrl()}) {
                assertThat(v.sourceUrl()).as(e.getKey()).startsWith("https://");
                assertThat(v.effectiveDate()).as(e.getKey()).isNotNull();
            }
        }
    }

    @Test
    void anchorsMergeAndOverrideCorrectly() {
        StateInfo ca = data.state("CA").orElseThrow();
        assertThat(ca.exchange().value().type()).isEqualTo(ExchangeType.STATE);
        assertThat(ca.exchange().value().name()).isEqualTo("Covered California");
        assertThat(data.state("TX").orElseThrow().medicaidAdults().value().expanded()).isFalse();
        assertThat(data.state("NC").orElseThrow().medicaidAdults().value().adultLimitPctFpl())
                .isEqualByComparingTo("138");
        // explicit "todo: null" overrides the anchor's todo
        assertThat(data.common().rules().childMaxAge().todo()).isNull();
    }

    @Test
    void fplTableUsesSeparateAlaskaAndHawaiiLines() {
        assertThat(data.guideline(2025, "NC").value().firstPerson()).isEqualByComparingTo("15650");
        assertThat(data.guideline(2025, "AK").value().firstPerson()).isEqualByComparingTo("19550");
        assertThat(data.guideline(2025, "HI").value().firstPerson()).isEqualByComparingTo("17990");
    }

    @Test
    void guidelineYearFallsBackToClosestEarlier() {
        assertThat(data.guidelineYearFor(2026)).isEqualTo(2026);
        assertThat(data.guidelineYearFor(2030)).isEqualTo(2026);
        assertThat(data.guidelineYearFor(2020)).isEqualTo(2025);
    }

    @Test
    void placeholdersAreFlaggedForReview() {
        assertThat(data.reviewItems()).isNotEmpty();
        assertThat(data.planYearOrNearest(2027).applicablePercentages().standard().todo()).contains("PLACEHOLDER");
        assertThat(data.reviewItems()).anyMatch(k -> k.startsWith("planYear2027"));
    }

    @Test
    void nextOpenEnrollmentUsesStateOverrideWhenPresent() {
        var ca = data.nextOpenEnrollment("CA", LocalDate.of(2026, 1, 20)).orElseThrow();
        assertThat(ca.planYear()).isEqualTo(2026);
        assertThat(ca.stateSpecific()).isTrue();
        assertThat(ca.window().value().end()).isEqualTo(LocalDate.of(2026, 1, 31));

        var nc = data.nextOpenEnrollment("NC", LocalDate.of(2026, 1, 20)).orElseThrow();
        assertThat(nc.planYear()).isEqualTo(2027);
        assertThat(nc.window().value().start()).isEqualTo(LocalDate.of(2026, 11, 1));
    }

    @Test
    void nextOpenEnrollmentEmptyWhenNothingPublished() {
        assertThat(data.nextOpenEnrollment("NC", LocalDate.of(2027, 6, 1))).isEmpty();
    }

    @Test
    void applicableBandsAreContiguous() {
        for (int year : data.planYears()) {
            var bands = data.planYearOrNearest(year).applicablePercentages().standard().value();
            for (int i = 1; i < bands.size(); i++) {
                assertThat(bands.get(i).fromPctFpl()).isEqualByComparingTo(bands.get(i - 1).toPctFpl());
            }
            assertThat(bands.get(bands.size() - 1).toPctFpl()).isEqualByComparingTo(BigDecimal.valueOf(400));
        }
    }
}
