package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionResult.Availability;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;
import com.healthassist.transition.model.TransitionResult.Severity;
import com.healthassist.transition.model.TransitionResult.WatchOut;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static com.healthassist.transition.engine.DeadlineCalculator.FMT;

/** Plain-language warnings triggered by facts the engine already computed. */
public final class WatchOutRules {

    private WatchOutRules() {
    }

    public record Facts(String exchangeName,
                        boolean stateExchange,
                        int planYear,
                        int incomeYear,
                        boolean coverageStartsNextYear,
                        boolean usedCurrentYearIncomeForNextYear,
                        int periodMonths,
                        BigDecimal annualPctFpl,
                        BigDecimal povertyLine,
                        boolean subsidyEligible,
                        boolean enhancedRules,
                        BigDecimal subsidyCutoffIncome,
                        boolean repaymentUncapped,
                        Availability medicaidBest,
                        boolean medicaidOnMonthlyIncomeOnly,
                        boolean childrenOnlyMedicaid,
                        boolean coverageGap,
                        BigDecimal deductibleMet,
                        boolean cobraKeepsDeductible,
                        boolean spouseAvailable,
                        Boolean spouseAffordable,
                        BigDecimal spouseMonthlyPremium,
                        BigDecimal affordabilityPercent,
                        boolean anyoneMedicareAge,
                        LocalDate cobraNoticeDueBy,
                        boolean cobraNoticeReceived,
                        LocalDate sepEnd,
                        LocalDate cobraElectionDeadline,
                        boolean cobraElectionEstimated,
                        LocalDate nextOpenEnrollmentStart,
                        PlanDataSource planDataSource,
                        boolean lossDateEstimated,
                        boolean incomeHasSeveranceOrUnemployment,
                        LocalDate today) {
    }

    public static List<WatchOut> evaluate(Facts f) {
        List<WatchOut> out = new ArrayList<>();
        LocalDate today = f.today();

        if (f.sepEnd().isBefore(today)) {
            out.add(new WatchOut("SEP_PASSED", Severity.URGENT, "Your Marketplace enrollment window has closed",
                    "The window to enroll after losing coverage ended " + FMT.format(f.sepEnd()) + ". You can still apply "
                            + "for Medicaid or CHIP any time, and enroll in a Marketplace plan during open enrollment"
                            + (f.nextOpenEnrollmentStart() != null ? " (starts " + FMT.format(f.nextOpenEnrollmentStart()) + ")" : "")
                            + ". Other events, like marriage, a birth, or a move, can open a new window."));
        } else {
            out.add(new WatchOut("COBRA_DROP_NO_SEP", Severity.WARNING, "Dropping COBRA later won't open a Marketplace window",
                    "If you choose COBRA and later cancel it or stop paying, you can't switch to a Marketplace plan until "
                            + "open enrollment. Running out of COBRA's full term does open a new window. If a Marketplace "
                            + "plan might be better, decide before your window closes on " + FMT.format(f.sepEnd()) + "."));
        }

        if (!f.cobraElectionEstimated() && f.cobraElectionDeadline().isBefore(today)) {
            out.add(new WatchOut("COBRA_ELECTION_PASSED", Severity.URGENT, "The COBRA election deadline has passed",
                    "Your deadline to elect COBRA was " + FMT.format(f.cobraElectionDeadline()) + "."));
        }

        if (!f.cobraNoticeReceived() && f.cobraNoticeDueBy().isBefore(today)) {
            out.add(new WatchOut("COBRA_NOTICE_LATE", Severity.WARNING, "Your COBRA notice may be late",
                    "It should have arrived by " + FMT.format(f.cobraNoticeDueBy()) + ". Contact your former employer's HR "
                            + "or the plan administrator. The U.S. Department of Labor (EBSA) can help: 1-866-444-3272."));
        }

        if (f.anyoneMedicareAge()) {
            out.add(new WatchOut("MEDICARE_AGE", Severity.URGENT, "Someone in your household is 65 or older",
                    "COBRA doesn't count as job-based coverage for Medicare. People 65+ should sign up for Medicare Part B "
                            + "within 8 months after the job ends, or they may pay a late penalty for life. Medicare, "
                            + "not a Marketplace plan, is usually the main option at 65+."));
        }

        if (f.coverageGap()) {
            out.add(new WatchOut("COVERAGE_GAP", Severity.URGENT, "You may fall into the coverage gap",
                    "Your state hasn't expanded Medicaid, and income below 100% of the poverty level ("
                            + Money.usd(f.povertyLine()) + " a year for your household) doesn't "
                            + "qualify for Marketplace subsidies. Severance, unemployment and a spouse's pay all count "
                            + "toward the year, so check your estimate carefully. Community health centers offer "
                            + "sliding-scale care."));
        }

        if (f.medicaidOnMonthlyIncomeOnly()) {
            out.add(new WatchOut("MEDICAID_MONTHLY_INCOME", Severity.WARNING, "You might qualify for Medicaid right now",
                    "Medicaid looks at your current monthly income, not the whole year. With your job ended, someone in "
                            + "your household may qualify now, even though your yearly income is higher. In months "
                            + "you're eligible for Medicaid, you can't get Marketplace subsidies."));
        } else if (f.medicaidBest() == Availability.LIKELY) {
            out.add(new WatchOut("MEDICAID_LIKELY", Severity.INFO, "Medicaid or CHIP looks likely for someone in your household",
                    "It's free or very low cost and you can apply any time. Only your state can make the final decision."));
        }

        if (f.childrenOnlyMedicaid()) {
            out.add(new WatchOut("CHIP_CHILDREN", Severity.INFO, "Your children may qualify even if you don't",
                    "Children often qualify for Medicaid or CHIP at higher incomes than adults. Families sometimes put "
                            + "children on CHIP and adults on another plan, which can lower total cost."));
        }

        if (f.subsidyEligible()) {
            boolean nearCliff = !f.enhancedRules() && f.annualPctFpl().compareTo(BigDecimal.valueOf(360)) >= 0;
            out.add(new WatchOut("SUBSIDY_REPAYMENT", nearCliff ? Severity.URGENT : Severity.WARNING,
                    "Underestimating your income can mean repaying subsidies",
                    "Marketplace subsidies are based on your estimate of " + f.incomeYear() + " income. If you earn more "
                            + "(a new job, more severance, unemployment), you pay back the difference at tax time."
                            + (f.repaymentUncapped() ? " For this year there's no limit on how much you may have to repay." : "")
                            + " Report income changes to the Marketplace as soon as they happen."
                            + (nearCliff && f.subsidyCutoffIncome() != null
                                ? " You're close to the cutoff: above " + Money.usd(f.subsidyCutoffIncome())
                                  + " for the year, the subsidy drops to zero."
                                : "")));
        } else if (!f.enhancedRules() && f.annualPctFpl().compareTo(BigDecimal.valueOf(400)) > 0) {
            out.add(new WatchOut("ABOVE_SUBSIDY_CUTOFF", Severity.INFO, "Your income is above the subsidy cutoff",
                    "Under the rules for " + f.planYear() + ", households above 400% of the poverty level don't get "
                            + "Marketplace subsidies, so compare full-price premiums with COBRA."));
        }

        if (f.cobraKeepsDeductible() && f.deductibleMet() != null && f.deductibleMet().signum() > 0) {
            out.add(new WatchOut("DEDUCTIBLE_PROGRESS", Severity.INFO, "COBRA keeps what you've already paid toward your deductible",
                    "You've met " + Money.usd(f.deductibleMet()) + " of your deductible this year. "
                            + "COBRA keeps that progress. A Marketplace or spouse's plan starts over at zero."));
        }

        if (f.coverageStartsNextYear()) {
            out.add(new WatchOut("NEXT_PLAN_YEAR", Severity.WARNING, "Your new coverage would start in " + f.planYear(),
                    "Marketplace prices and subsidies will use " + f.planYear() + " plans and your " + f.planYear() + " income."
                            + (f.usedCurrentYearIncomeForNextYear()
                                ? " You didn't enter next year's income, so we used this year's. Go back to update it if it will be different."
                                : "")));
        } else if (f.periodMonths() <= 3) {
            out.add(new WatchOut("SHORT_PERIOD", Severity.INFO, "Only " + f.periodMonths() + " months left in the plan year",
                    "Deductibles on every plan reset January 1, so the advantage of keeping COBRA's deductible progress "
                            + "is short-lived. Plan for open enrollment too."));
        }

        if (f.spouseAvailable()) {
            if (Boolean.TRUE.equals(f.spouseAffordable())) {
                out.add(new WatchOut("SPOUSE_PLAN_AFFORDABLE", Severity.WARNING,
                        "The spouse or partner plan blocks Marketplace subsidies",
                        "Family coverage costs " + Money.usd(f.spouseMonthlyPremium()) + " a month. "
                                + "That's at or below " + f.affordabilityPercent().stripTrailingZeros().toPlainString()
                                + "% of household income, which counts as \"affordable.\" Family members who are offered "
                                + "that plan can't get Marketplace subsidies."));
            } else if (f.spouseAffordable() == null) {
                out.add(new WatchOut("SPOUSE_PLAN_COST_UNKNOWN", Severity.INFO, "Ask what the spouse or partner plan costs",
                        "If family coverage on that plan costs less than about "
                                + f.affordabilityPercent().stripTrailingZeros().toPlainString() + "% of household income, "
                                + "family members can't get Marketplace subsidies. The exact monthly cost lets us check."));
            }
            out.add(new WatchOut("SPOUSE_PLAN_WINDOW", Severity.WARNING, "The window to join a spouse's or partner's plan is short",
                    "It's usually only 30 days after your coverage ends. Ask their HR right away."));
        }

        if (f.stateExchange()) {
            out.add(new WatchOut("STATE_EXCHANGE", Severity.INFO, "Your state runs its own exchange",
                    "Live plan prices are on " + f.exchangeName() + ". The subsidy estimate below still applies."));
        } else if (f.planDataSource() == PlanDataSource.UNAVAILABLE) {
            out.add(new WatchOut("PLAN_DATA_UNAVAILABLE", Severity.INFO, "Live plan prices aren't available here right now",
                    "We can still estimate your subsidy. Compare exact plans and prices on HealthCare.gov."));
        } else if (f.planDataSource() == PlanDataSource.FIXTURE) {
            out.add(new WatchOut("SAMPLE_PLAN_DATA", Severity.WARNING, "Sample plan data",
                    "The Marketplace plans shown are sample data for testing, not real prices."));
        }

        if (f.lossDateEstimated()) {
            out.add(new WatchOut("LOSS_DATE_ESTIMATED", Severity.INFO, "We estimated when your coverage ends",
                    "We assumed your coverage ends on the last day of the month your job ended. Every deadline here "
                            + "depends on that date, so confirm it with HR."));
        }

        if (f.incomeHasSeveranceOrUnemployment()) {
            out.add(new WatchOut("INCOME_COUNTS", Severity.INFO, "Severance and unemployment count as income",
                    "Both count when the Marketplace and Medicaid look at your income."));
        }

        out.add(new WatchOut("SMALL_EMPLOYER_COBRA", Severity.INFO, "COBRA depends on employer size",
                "Federal COBRA covers employers with 20 or more employees. If yours was smaller, your state's "
                        + "\"mini-COBRA\" law may apply instead. Check your notice."));

        out.sort(Comparator.comparing(WatchOut::severity, Comparator.comparingInt(s -> switch (s) {
            case URGENT -> 0;
            case WARNING -> 1;
            case INFO -> 2;
        })));
        return out;
    }
}
