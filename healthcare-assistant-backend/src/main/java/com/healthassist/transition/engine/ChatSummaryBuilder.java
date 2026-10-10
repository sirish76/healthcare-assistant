package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionResult.CoverageOption;
import com.healthassist.transition.model.TransitionResult.HouseholdSummary;
import com.healthassist.transition.model.TransitionResult.LocationSummary;
import com.healthassist.transition.model.TransitionResult.TimelineItem;
import com.healthassist.transition.model.TransitionResult.WatchOut;

import java.math.BigDecimal;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.healthassist.transition.engine.DeadlineCalculator.FMT;

/**
 * Builds the context message for "Ask about my results". It contains only
 * computed figures: no names, ZIP, exact ages, dollar income, or prescriptions.
 */
public final class ChatSummaryBuilder {

    private ChatSummaryBuilder() {
    }

    public static String build(LocationSummary loc, HouseholdSummary hh, int adults, int children, int seniors,
                               List<CoverageOption> options, Map<String, TimelineItem> timeline, List<WatchOut> watchOuts) {
        StringBuilder sb = new StringBuilder();
        sb.append("Here are my results from the Zumanely \"Lost your job? Compare your coverage options\" tool. ")
          .append("The numbers come from a rules engine, so please explain them rather than recalculating them.\n\n");
        sb.append("- State: ").append(loc.stateName()).append(" (enrollment through ").append(loc.exchangeName()).append(")\n");
        sb.append("- People needing coverage: ").append(hh.peopleNeedingCoverage())
          .append(" (").append(adults).append(" adult").append(adults == 1 ? "" : "s")
          .append(", ").append(children).append(" child").append(children == 1 ? "" : "ren");
        if (seniors > 0) {
            sb.append(", ").append(seniors).append(" aged 65+");
        }
        sb.append("); household size ").append(hh.householdSize()).append("\n");
        sb.append("- Projected ").append(hh.incomeYear()).append(" household income: about ")
          .append(pct(hh.annualFplPercent())).append(" of the federal poverty level; current monthly income about ")
          .append(pct(hh.currentMonthlyFplPercent())).append("\n");
        sb.append("- Old coverage ends ").append(FMT.format(hh.coverageEnds()))
          .append("; new coverage could start ").append(FMT.format(hh.newCoverageStart())).append("\n\n");

        String period = hh.newCoverageStart().getMonth().getDisplayName(TextStyle.SHORT, Locale.US)
                + "–Dec " + hh.newCoverageStart().getYear();
        sb.append("Options (estimated total cost for ").append(period).append("):\n");
        for (CoverageOption o : options) {
            sb.append("- ").append(o.label()).append(": ").append(o.availability().name().toLowerCase().replace('_', ' '));
            if (o.monthlyPremium() != null) {
                sb.append(", ").append(Money.usd(o.monthlyPremium())).append("/month");
            }
            if (o.periodCost() != null) {
                sb.append(", about ").append(Money.usd(o.periodCost())).append(" total");
            }
            if (Boolean.TRUE.equals(o.deductibleCarriesOver())) {
                sb.append(", keeps deductible progress");
            }
            if (o.subsidy() != null) {
                if (o.subsidy().eligible()) {
                    sb.append(", subsidy-eligible (expected to pay at most ")
                      .append(Money.usd(o.subsidy().maxMonthlyForBenchmark()))
                      .append("/month for the benchmark silver plan)");
                } else {
                    sb.append(", no subsidy (").append(o.subsidy().reason()).append(")");
                }
            }
            sb.append("\n");
        }

        sb.append("\nKey deadlines:\n");
        for (String key : List.of("COBRA_ELECT", "MARKETPLACE_SEP", "SPOUSE_PLAN", "MEDICARE_PART_B", "OPEN_ENROLLMENT")) {
            TimelineItem t = timeline.get(key);
            if (t != null && t.date() != null) {
                sb.append("- ").append(t.label()).append(": ").append(FMT.format(t.date()))
                  .append(t.estimated() ? " (estimated)" : "").append(" [").append(t.status().name().toLowerCase()).append("]\n");
            }
        }

        List<String> important = watchOuts.stream()
                .filter(w -> w.severity() != com.healthassist.transition.model.TransitionResult.Severity.INFO)
                .map(WatchOut::title).toList();
        if (!important.isEmpty()) {
            sb.append("\nWatch-outs: ").append(String.join("; ", important)).append("\n");
        }
        sb.append("\nCan you explain these results in plain language and help me decide what to do first?");
        return sb.toString();
    }

    private static String pct(BigDecimal v) {
        return v == null ? "unknown" : Money.dollars(v).toPlainString() + "%";
    }
}
