package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionResult.Availability;
import com.healthassist.transition.model.TransitionResult.NextStep;
import com.healthassist.transition.model.TransitionResult.TimelineItem;
import com.healthassist.transition.model.TransitionResult.TimelineStatus;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Ordered checklist. Links only to official enrollment sites. */
public final class NextStepsBuilder {

    static final String HEALTHCARE_GOV = "https://www.healthcare.gov/";
    static final String DOL_COBRA = "https://www.dol.gov/general/topic/health-plans/cobra";
    static final String MEDICARE_SIGN_UP = "https://www.ssa.gov/medicare/sign-up";

    private NextStepsBuilder() {
    }

    public record Inputs(boolean stateExchange,
                         String exchangeName,
                         String exchangeUrl,
                         String medicaidUrl,
                         Availability medicaidBest,
                         boolean spouseAvailable,
                         boolean anyoneMedicareAge,
                         Map<String, TimelineItem> timeline) {
    }

    public static List<NextStep> build(Inputs in) {
        List<NextStep> dated = new ArrayList<>();
        List<NextStep> first = new ArrayList<>();
        List<NextStep> last = new ArrayList<>();
        String exchangeUrl = in.stateExchange() ? in.exchangeUrl() : HEALTHCARE_GOV;
        String exchangeName = in.stateExchange() ? in.exchangeName() : "HealthCare.gov";

        if (in.medicaidBest() == Availability.LIKELY || in.medicaidBest() == Availability.POSSIBLE) {
            first.add(new NextStep("APPLY_MEDICAID", "Apply for Medicaid or CHIP",
                    "Apply any time. One application on " + exchangeName + " checks Medicaid, CHIP and subsidies together. "
                            + "You can also apply directly with your state Medicaid office.",
                    exchangeUrl, exchangeName, null));
        }

        TimelineItem spouse = in.timeline().get("SPOUSE_PLAN");
        if (in.spouseAvailable() && spouse != null && spouse.status() != TimelineStatus.PASSED) {
            dated.add(new NextStep("SPOUSE_PLAN", "Ask your spouse's or partner's HR about adding your family",
                    "Losing your coverage lets you join their plan outside open enrollment. Ask for the monthly cost "
                            + "and request enrollment before the deadline.", null, null, spouse.date()));
        }

        TimelineItem sep = in.timeline().get("MARKETPLACE_SEP");
        TimelineItem oe = in.timeline().get("OPEN_ENROLLMENT");
        if (sep != null && sep.status() != TimelineStatus.PASSED) {
            dated.add(new NextStep("MARKETPLACE_ENROLL", "Compare plans and enroll on " + exchangeName,
                    "Choose \"lost job-based coverage\" as your reason. Pick a plan by the day your coverage ends to "
                            + "avoid a gap.", exchangeUrl, exchangeName, sep.date()));
        } else if (oe != null && oe.date() != null) {
            dated.add(new NextStep("MARKETPLACE_OPEN_ENROLLMENT", "Enroll during open enrollment on " + exchangeName,
                    "Your special enrollment window has passed. Open enrollment is your next chance unless another "
                            + "life event happens.", exchangeUrl, exchangeName, oe.date()));
        }

        TimelineItem elect = in.timeline().get("COBRA_ELECT");
        if (elect != null && elect.status() != TimelineStatus.PASSED) {
            dated.add(new NextStep("COBRA_DECIDE", "Decide whether to elect COBRA",
                    "Use the election form in your COBRA notice. Coverage is backdated to when your plan ended, so you "
                            + "can wait to decide, but not past the deadline.", DOL_COBRA, "U.S. Dept. of Labor: COBRA",
                    elect.date()));
            TimelineItem pay = in.timeline().get("COBRA_FIRST_PAYMENT");
            if (pay != null) {
                dated.add(new NextStep("COBRA_PAY", "If you elect COBRA, make the first payment",
                        "Due 45 days after you elect. It covers every month back to when your old coverage ended.",
                        null, null, pay.date()));
            }
        }

        TimelineItem partB = in.timeline().get("MEDICARE_PART_B");
        if (in.anyoneMedicareAge() && partB != null) {
            dated.add(new NextStep("MEDICARE", "Sign up for Medicare Part B (anyone 65 or older)",
                    "Use the special enrollment period for people who lose job-based coverage.",
                    MEDICARE_SIGN_UP, "Social Security: Medicare sign-up", partB.date()));
        }

        last.add(new NextStep("DOCUMENTS", "Keep proof of your coverage loss",
                "Save your termination letter, COBRA notice, or a letter from the plan showing the end date. The "
                        + "Marketplace or a spouse's plan may ask for it.", null, null, null));
        last.add(new NextStep("REPORT_CHANGES", "Report income changes after you enroll",
                "If you get a new job or your income changes, update " + exchangeName + " right away to avoid "
                        + "repaying subsidies.", exchangeUrl, exchangeName, null));

        dated.sort(Comparator.comparing(NextStep::dueBy, Comparator.nullsLast(Comparator.<LocalDate>naturalOrder())));
        List<NextStep> all = new ArrayList<>(first);
        all.addAll(dated);
        all.addAll(last);
        return all;
    }
}
