package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionInput.CoverageDates;
import com.healthassist.transition.model.TransitionResult.TimelineItem;
import com.healthassist.transition.model.TransitionResult.TimelineStatus;
import com.healthassist.transition.regdata.RegulatoryData.OpenEnrollmentWindow;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Date math for every enrollment deadline. All windows are computed from the
 * last day of old coverage ("loss date"). When the person doesn't know it, we
 * assume coverage runs to the end of the month the job ended (common, but
 * flagged as an estimate).
 */
public final class DeadlineCalculator {

    static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("MMM d, yyyy");

    private DeadlineCalculator() {
    }

    public record Rules(int cobraElectionDays,
                        int cobraFirstPaymentDays,
                        int cobraNoticeMaxDays,
                        int cobraMaxMonths,
                        int sepDaysBefore,
                        int sepDaysAfter,
                        int spousePlanDays,
                        int medicarePartBSepMonths) {
    }

    public record Context(CoverageDates dates,
                          LocalDate today,
                          boolean spousePlanAvailable,
                          boolean anyoneMedicareAge,
                          Optional<OpenEnrollmentWindow> nextOpenEnrollment) {
    }

    public static void requireDates(CoverageDates d) {
        if (d == null || (d.lastDayOfCoverage() == null && d.jobEndDate() == null)) {
            throw new InvalidTransitionInputException("Enter your last day of coverage or your job end date.",
                    List.of("dates.lastDayOfCoverage", "dates.jobEndDate"));
        }
    }

    public static LocalDate lossDate(CoverageDates d) {
        requireDates(d);
        return d.lastDayOfCoverage() != null
                ? d.lastDayOfCoverage()
                : d.jobEndDate().with(TemporalAdjusters.lastDayOfMonth());
    }

    public static boolean lossDateEstimated(CoverageDates d) {
        return d.lastDayOfCoverage() == null;
    }

    /** First day of new coverage with no gap: the 1st of the month after the loss date. */
    public static LocalDate gaplessStart(LocalDate lossDate) {
        return lossDate.with(TemporalAdjusters.firstDayOfNextMonth());
    }

    static LocalDate qualifyingEvent(CoverageDates d) {
        return d.jobEndDate() != null ? d.jobEndDate() : lossDate(d);
    }

    /** Latest date the COBRA election notice should arrive (employer 30 + administrator 14 days). */
    public static LocalDate cobraNoticeDueBy(CoverageDates d, Rules r) {
        LocalDate loss = lossDate(d);
        LocalDate qe = qualifyingEvent(d);
        LocalDate base = qe.isAfter(loss) ? qe : loss;
        return base.plusDays(r.cobraNoticeMaxDays());
    }

    public record DateEstimate(LocalDate date, boolean estimated) {
    }

    /** 60 days from the later of (loss of coverage, date of notice). */
    public static DateEstimate cobraElectionDeadline(CoverageDates d, Rules r) {
        LocalDate loss = lossDate(d);
        if (d.cobraNoticeReceived() && d.cobraNoticeDate() != null) {
            LocalDate later = d.cobraNoticeDate().isAfter(loss) ? d.cobraNoticeDate() : loss;
            return new DateEstimate(later.plusDays(r.cobraElectionDays()), lossDateEstimated(d));
        }
        if (d.cobraNoticeReceived()) {
            // Notice date unknown: the earliest possible deadline is 60 days after the loss.
            return new DateEstimate(loss.plusDays(r.cobraElectionDays()), true);
        }
        return new DateEstimate(cobraNoticeDueBy(d, r).plusDays(r.cobraElectionDays()), true);
    }

    public static LocalDate cobraFirstPaymentLatest(LocalDate electionDeadline, Rules r) {
        return electionDeadline.plusDays(r.cobraFirstPaymentDays());
    }

    public static LocalDate sepStart(LocalDate loss, Rules r) {
        return loss.minusDays(r.sepDaysBefore());
    }

    public static LocalDate sepEnd(LocalDate loss, Rules r) {
        return loss.plusDays(r.sepDaysAfter());
    }

    public static LocalDate spousePlanDeadline(LocalDate loss, Rules r) {
        return loss.plusDays(r.spousePlanDays());
    }

    /** Medicare Part B special enrollment: the 8 months after the month employment ends. */
    public static LocalDate medicarePartBSepEnd(LocalDate employmentEnd, Rules r) {
        return employmentEnd.plusMonths(r.medicarePartBSepMonths()).with(TemporalAdjusters.lastDayOfMonth());
    }

    /** Earliest Marketplace start if a plan is picked today. */
    public static LocalDate marketplaceStartIfPickedToday(LocalDate loss, LocalDate today) {
        return today.isAfter(loss) ? today.with(TemporalAdjusters.firstDayOfNextMonth()) : gaplessStart(loss);
    }

    public static TimelineStatus status(LocalDate windowStart, LocalDate end, LocalDate today) {
        if (end == null) {
            return TimelineStatus.ONGOING;
        }
        if (end.isBefore(today)) {
            return TimelineStatus.PASSED;
        }
        if (windowStart != null && !today.isBefore(windowStart)) {
            return TimelineStatus.OPEN;
        }
        return TimelineStatus.UPCOMING;
    }

    private static TimelineItem item(String key, String label, LocalDate start, LocalDate end, boolean estimated,
                                     LocalDate today, String detail) {
        TimelineStatus status = status(start, end, today);
        Long daysLeft = end != null && !end.isBefore(today) ? ChronoUnit.DAYS.between(today, end) : null;
        return new TimelineItem(key, label, start, end, estimated, status, daysLeft, detail);
    }

    public static List<TimelineItem> timeline(Context c, Rules r) {
        CoverageDates d = c.dates();
        LocalDate today = c.today();
        LocalDate loss = lossDate(d);
        boolean lossEst = lossDateEstimated(d);
        List<TimelineItem> items = new ArrayList<>();

        items.add(item("COVERAGE_ENDS", "Your old coverage ends", null, loss, lossEst, today,
                lossEst ? "Estimated: many employer plans end on the last day of the month you leave. Confirm with HR."
                        : "The last day your old plan covers you."));

        if (!d.cobraNoticeReceived()) {
            items.add(item("COBRA_NOTICE", "COBRA election notice should arrive by", null, cobraNoticeDueBy(d, r),
                    true, today, "Your employer has 30 days to tell the plan, and the plan has 14 more to notify you. "
                            + "If it hasn't arrived by then, contact HR or the plan administrator."));
        }

        DateEstimate elect = cobraElectionDeadline(d, r);
        items.add(item("COBRA_ELECT", "Last day to elect COBRA", loss, elect.date(), elect.estimated(), today,
                d.cobraNoticeReceived() && d.cobraNoticeDate() != null
                        ? r.cobraElectionDays() + " days from the later of your notice date or loss of coverage."
                        : r.cobraElectionDays() + " days after the notice arrives (or after coverage ends, if later). "
                          + "This date is an estimate until you have the notice."));

        LocalDate firstPay = cobraFirstPaymentLatest(elect.date(), r);
        items.add(item("COBRA_FIRST_PAYMENT", "Latest first COBRA payment", null, firstPay, true, today,
                "Due " + r.cobraFirstPaymentDays() + " days after the day you elect. This is the latest date, if you "
                        + "elect on the last day. The first payment covers every month back to when coverage ended."));

        items.add(item("COBRA_MAX_END", "COBRA would end (maximum " + r.cobraMaxMonths() + " months)", null,
                loss.plusMonths(r.cobraMaxMonths()), lossEst, today,
                "When COBRA runs out, you get a new window to enroll in a Marketplace plan."));

        items.add(item("MARKETPLACE_SEP", "Marketplace special enrollment window", sepStart(loss, r), sepEnd(loss, r),
                lossEst, today, "You can pick a Marketplace plan from " + r.sepDaysBefore() + " days before to "
                        + r.sepDaysAfter() + " days after your coverage ends."));

        LocalDate start = marketplaceStartIfPickedToday(loss, today);
        items.add(item("MARKETPLACE_START", "Earliest Marketplace coverage start", null, start, lossEst, today,
                today.isAfter(loss)
                        ? "Coverage starts the 1st of the month after you pick a plan."
                        : "Pick a plan by " + FMT.format(loss) + " and coverage starts " + FMT.format(start)
                          + ", with no gap."));

        if (c.spousePlanAvailable()) {
            items.add(item("SPOUSE_PLAN", "Join a spouse's or partner's employer plan", loss,
                    spousePlanDeadline(loss, r), lossEst, today,
                    "Employer plans must give at least " + r.spousePlanDays() + " days after you lose coverage. "
                            + "Ask their HR; some plans allow longer."));
        }

        items.add(new TimelineItem("MEDICAID", "Medicaid / CHIP: apply any time", null, null, false,
                TimelineStatus.ONGOING, null, "There's no enrollment window. Coverage can start right away, and "
                + "sometimes it's backdated up to 3 months."));

        c.nextOpenEnrollment().ifPresentOrElse(oe -> items.add(item("OPEN_ENROLLMENT",
                        "Open enrollment for " + oe.planYear() + " coverage",
                        oe.window().value().start(), oe.window().value().end(), false, today,
                        oe.stateSpecific() ? "Dates for your state's exchange."
                                : "HealthCare.gov dates. If your state runs its own exchange, its dates may differ.")),
                () -> items.add(new TimelineItem("OPEN_ENROLLMENT", "Next open enrollment", null, null, true,
                        TimelineStatus.UNKNOWN, null, "Dates not published yet. Open enrollment usually starts Nov 1.")));

        if (c.anyoneMedicareAge()) {
            LocalDate employmentEnd = qualifyingEvent(d);
            items.add(item("MEDICARE_PART_B", "Medicare Part B special enrollment ends",
                    employmentEnd.plusMonths(1).withDayOfMonth(1), medicarePartBSepEnd(employmentEnd, r), false,
                    today, "COBRA doesn't count as job-based coverage for Medicare. Sign up within "
                            + r.medicarePartBSepMonths() + " months of the job ending, or you may pay a lifelong penalty."));
        }

        items.sort(Comparator.comparing(TimelineItem::date, Comparator.nullsLast(Comparator.naturalOrder())));
        return items;
    }
}
