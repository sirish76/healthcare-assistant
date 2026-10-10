package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionInput.CoverageDates;
import com.healthassist.transition.model.TransitionResult.TimelineItem;
import com.healthassist.transition.model.TransitionResult.TimelineStatus;
import com.healthassist.transition.regdata.RegulatoryData;
import com.healthassist.transition.regdata.RegulatoryDataLoader;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeadlineCalculatorTest {

    private static final RegulatoryData DATA = RegulatoryDataLoader.load();
    private static final DeadlineCalculator.Rules R = new DeadlineCalculator.Rules(60, 45, 44, 18, 60, 60, 30, 8);

    private static CoverageDates lost(LocalDate lastDay) {
        return new CoverageDates(null, lastDay, false, null);
    }

    @Test
    void rulesMatchRegulatoryData() {
        var r = DATA.common().rules();
        assertThat(List.of(r.cobraElectionDays().value(), r.cobraFirstPaymentDays().value(), r.cobraNoticeMaxDays().value(),
                r.cobraMaxMonthsJobLoss().value(), r.marketplaceSepDaysBefore().value(), r.marketplaceSepDaysAfter().value(),
                r.employerPlanSpecialEnrollmentDays().value(), r.medicarePartBSepMonths().value()))
                .containsExactly(60, 45, 44, 18, 60, 60, 30, 8);
    }

    @Test
    void marketplaceWindowCrossesYearEnd() {
        LocalDate loss = LocalDate.of(2026, 12, 15);
        assertThat(DeadlineCalculator.sepStart(loss, R)).isEqualTo(LocalDate.of(2026, 10, 16));
        assertThat(DeadlineCalculator.sepEnd(loss, R)).isEqualTo(LocalDate.of(2027, 2, 13));
        assertThat(DeadlineCalculator.gaplessStart(loss)).isEqualTo(LocalDate.of(2027, 1, 1));
        assertThat(DeadlineCalculator.spousePlanDeadline(loss, R)).isEqualTo(LocalDate.of(2027, 1, 14));
    }

    @Test
    void lastDayOfYearLossStartsNewYear() {
        assertThat(DeadlineCalculator.gaplessStart(LocalDate.of(2026, 12, 31))).isEqualTo(LocalDate.of(2027, 1, 1));
        assertThat(DeadlineCalculator.gaplessStart(LocalDate.of(2026, 9, 30))).isEqualTo(LocalDate.of(2026, 10, 1));
    }

    @Test
    void cobraElectionCountsFromNoticeWhenNoticeIsLater() {
        CoverageDates d = new CoverageDates(LocalDate.of(2026, 12, 15), LocalDate.of(2026, 12, 15), true, LocalDate.of(2027, 1, 5));
        var elect = DeadlineCalculator.cobraElectionDeadline(d, R);
        assertThat(elect.date()).isEqualTo(LocalDate.of(2027, 3, 6));
        assertThat(elect.estimated()).isFalse();
        assertThat(DeadlineCalculator.cobraFirstPaymentLatest(elect.date(), R)).isEqualTo(LocalDate.of(2027, 4, 20));
    }

    @Test
    void cobraElectionCountsFromLossWhenNoticeArrivedEarlier() {
        CoverageDates d = new CoverageDates(null, LocalDate.of(2026, 12, 15), true, LocalDate.of(2026, 12, 1));
        assertThat(DeadlineCalculator.cobraElectionDeadline(d, R).date()).isEqualTo(LocalDate.of(2027, 2, 13));
    }

    @Test
    void cobraElectionEstimatedWhenNoticeNotReceived() {
        CoverageDates d = new CoverageDates(LocalDate.of(2026, 12, 15), LocalDate.of(2026, 12, 31), false, null);
        assertThat(DeadlineCalculator.cobraNoticeDueBy(d, R)).isEqualTo(LocalDate.of(2027, 2, 13));
        var elect = DeadlineCalculator.cobraElectionDeadline(d, R);
        assertThat(elect.date()).isEqualTo(LocalDate.of(2027, 4, 14));
        assertThat(elect.estimated()).isTrue();
    }

    @Test
    void noticeReceivedWithoutDateUsesEarliestPossibleDeadline() {
        CoverageDates d = new CoverageDates(null, LocalDate.of(2026, 9, 30), true, null);
        var elect = DeadlineCalculator.cobraElectionDeadline(d, R);
        assertThat(elect.date()).isEqualTo(LocalDate.of(2026, 11, 29));
        assertThat(elect.estimated()).isTrue();
    }

    @Test
    void jobEndOnlyAssumesEndOfMonthAndFlagsEstimate() {
        CoverageDates d = new CoverageDates(LocalDate.of(2026, 3, 10), null, false, null);
        assertThat(DeadlineCalculator.lossDate(d)).isEqualTo(LocalDate.of(2026, 3, 31));
        assertThat(DeadlineCalculator.lossDateEstimated(d)).isTrue();
    }

    @Test
    void leapYearIsCounted() {
        assertThat(DeadlineCalculator.spousePlanDeadline(LocalDate.of(2028, 2, 15), R)).isEqualTo(LocalDate.of(2028, 3, 16));
        assertThat(DeadlineCalculator.spousePlanDeadline(LocalDate.of(2027, 2, 15), R)).isEqualTo(LocalDate.of(2027, 3, 17));
    }

    @Test
    void medicarePartBWindowIsEightMonthsAfterTheMonthEmploymentEnds() {
        assertThat(DeadlineCalculator.medicarePartBSepEnd(LocalDate.of(2026, 3, 15), R)).isEqualTo(LocalDate.of(2026, 11, 30));
        assertThat(DeadlineCalculator.medicarePartBSepEnd(LocalDate.of(2026, 6, 30), R)).isEqualTo(LocalDate.of(2027, 2, 28));
    }

    @Test
    void marketplaceStartAfterLossIsNextMonthAfterPicking() {
        LocalDate loss = LocalDate.of(2026, 9, 30);
        assertThat(DeadlineCalculator.marketplaceStartIfPickedToday(loss, LocalDate.of(2026, 9, 20))).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(DeadlineCalculator.marketplaceStartIfPickedToday(loss, LocalDate.of(2026, 10, 10))).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(DeadlineCalculator.marketplaceStartIfPickedToday(loss, LocalDate.of(2026, 12, 2))).isEqualTo(LocalDate.of(2027, 1, 1));
    }

    @Test
    void statusRelativeToToday() {
        LocalDate today = LocalDate.of(2026, 10, 10);
        assertThat(DeadlineCalculator.status(null, today.minusDays(1), today)).isEqualTo(TimelineStatus.PASSED);
        assertThat(DeadlineCalculator.status(null, today, today)).isEqualTo(TimelineStatus.UPCOMING);
        assertThat(DeadlineCalculator.status(today.minusDays(5), today.plusDays(5), today)).isEqualTo(TimelineStatus.OPEN);
        assertThat(DeadlineCalculator.status(today.plusDays(1), today.plusDays(5), today)).isEqualTo(TimelineStatus.UPCOMING);
        assertThat(DeadlineCalculator.status(null, null, today)).isEqualTo(TimelineStatus.ONGOING);
    }

    @Test
    void fullTimelineIsSortedAndHasExpectedItems() {
        LocalDate today = LocalDate.of(2026, 10, 10);
        CoverageDates d = new CoverageDates(LocalDate.of(2026, 9, 15), LocalDate.of(2026, 9, 30), false, null);
        List<TimelineItem> items = DeadlineCalculator.timeline(new DeadlineCalculator.Context(d, today, true, true,
                DATA.nextOpenEnrollment("NC", today)), R);
        Map<String, TimelineItem> byKey = items.stream().collect(Collectors.toMap(TimelineItem::key, Function.identity()));

        assertThat(byKey).containsKeys("COVERAGE_ENDS", "COBRA_NOTICE", "COBRA_ELECT", "COBRA_FIRST_PAYMENT",
                "COBRA_MAX_END", "MARKETPLACE_SEP", "MARKETPLACE_START", "SPOUSE_PLAN", "MEDICAID", "OPEN_ENROLLMENT",
                "MEDICARE_PART_B");
        TimelineItem sep = byKey.get("MARKETPLACE_SEP");
        assertThat(sep.windowStart()).isEqualTo(LocalDate.of(2026, 8, 1));
        assertThat(sep.date()).isEqualTo(LocalDate.of(2026, 11, 29));
        assertThat(sep.status()).isEqualTo(TimelineStatus.OPEN);
        assertThat(sep.daysLeft()).isEqualTo(50);
        assertThat(byKey.get("COVERAGE_ENDS").status()).isEqualTo(TimelineStatus.PASSED);
        assertThat(byKey.get("SPOUSE_PLAN").date()).isEqualTo(LocalDate.of(2026, 10, 30));
        assertThat(byKey.get("OPEN_ENROLLMENT").windowStart()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(byKey.get("MEDICAID").date()).isNull();

        List<LocalDate> dates = items.stream().map(TimelineItem::date).filter(java.util.Objects::nonNull).toList();
        assertThat(dates).isSorted();
        assertThat(items.get(items.size() - 1).date()).isNull();
    }

    @Test
    void timelineWithoutPublishedOpenEnrollment() {
        LocalDate today = LocalDate.of(2027, 6, 1);
        List<TimelineItem> items = DeadlineCalculator.timeline(new DeadlineCalculator.Context(
                lost(LocalDate.of(2027, 5, 31)), today, false, false, Optional.empty()), R);
        TimelineItem oe = items.stream().filter(i -> i.key().equals("OPEN_ENROLLMENT")).findFirst().orElseThrow();
        assertThat(oe.status()).isEqualTo(TimelineStatus.UNKNOWN);
        assertThat(items).noneMatch(i -> i.key().equals("SPOUSE_PLAN") || i.key().equals("MEDICARE_PART_B"));
    }

    @Test
    void requiresAtLeastOneDate() {
        assertThatThrownBy(() -> DeadlineCalculator.lossDate(new CoverageDates(null, null, false, null)))
                .isInstanceOf(InvalidTransitionInputException.class);
    }
}
