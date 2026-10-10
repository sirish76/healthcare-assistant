package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionInput.Member;
import com.healthassist.transition.model.TransitionInput.Relationship;
import com.healthassist.transition.model.TransitionResult.Availability;
import com.healthassist.transition.model.TransitionResult.MemberEligibility;
import com.healthassist.transition.regdata.RegulatoryTypes.ChipFallback;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Screens each household member for Medicaid/CHIP. Medicaid and CHIP look at
 * CURRENT MONTHLY income (annualized), which after a job loss is often far
 * below the projected annual income used for Marketplace subsidies.
 * Results are screening estimates, never determinations.
 */
public final class MedicaidChipEligibility {

    private MedicaidChipEligibility() {
    }

    public record Params(boolean expanded,
                         BigDecimal adultLimitPctFpl,
                         BigDecimal chipLimitPctFpl,
                         ChipFallback chipFallback,
                         int childMaxAge,
                         int medicareAge,
                         BigDecimal nonExpansionParentScreenPctFpl) {
    }

    public static List<MemberEligibility> assess(Params p, List<Member> members, BigDecimal povertyLine,
                                                 BigDecimal currentMonthlyIncome, BigDecimal projectedAnnualIncome) {
        BigDecimal monthlyAnnualized = currentMonthlyIncome.multiply(Money.TWELVE);
        boolean hasChild = members.stream().anyMatch(m -> m.age() <= p.childMaxAge());
        List<MemberEligibility> out = new ArrayList<>();
        for (int i = 0; i < members.size(); i++) {
            Member m = members.get(i);
            if (m.age() <= p.childMaxAge()) {
                out.add(child(i, m, p, povertyLine, monthlyAnnualized));
            } else if (m.age() >= p.medicareAge()) {
                out.add(new MemberEligibility(i, m.age(), "MEDICARE_AGE", Availability.UNKNOWN,
                        "Medicare age. Medicaid for people 65+ uses different rules, often including an asset test."));
            } else {
                out.add(adult(i, m, p, hasChild, povertyLine, monthlyAnnualized, projectedAnnualIncome));
            }
        }
        return out;
    }

    private static MemberEligibility child(int i, Member m, Params p, BigDecimal line, BigDecimal monthlyAnnualized) {
        if (p.chipLimitPctFpl() != null) {
            boolean ok = FplCalculator.atOrBelow(monthlyAnnualized, line, p.chipLimitPctFpl());
            return new MemberEligibility(i, m.age(), "CHILD", ok ? Availability.LIKELY : Availability.UNLIKELY,
                    ok ? "Household income is within your state's limit for children's Medicaid/CHIP."
                       : "Household income is above your state's limit for children's Medicaid/CHIP.");
        }
        ChipFallback f = p.chipFallback();
        if (FplCalculator.atOrBelow(monthlyAnnualized, line, f.likelyBelowPctFpl())) {
            return new MemberEligibility(i, m.age(), "CHILD", Availability.LIKELY,
                    "Household income is low enough that children qualify for Medicaid or CHIP in every state.");
        }
        if (FplCalculator.atOrBelow(monthlyAnnualized, line, f.possibleBelowPctFpl())) {
            return new MemberEligibility(i, m.age(), "CHILD", Availability.POSSIBLE,
                    "Children often qualify for CHIP at this income, depending on your state's limit.");
        }
        return new MemberEligibility(i, m.age(), "CHILD", Availability.UNLIKELY,
                "Household income is above the CHIP limit in most states.");
    }

    private static MemberEligibility adult(int i, Member m, Params p, boolean hasChild, BigDecimal line,
                                           BigDecimal monthlyAnnualized, BigDecimal projectedAnnual) {
        if (p.adultLimitPctFpl() != null) {
            BigDecimal limit = p.adultLimitPctFpl();
            if (FplCalculator.atOrBelow(monthlyAnnualized, line, limit)) {
                return new MemberEligibility(i, m.age(), "ADULT", Availability.LIKELY,
                        "Current monthly income is at or below " + limit.stripTrailingZeros().toPlainString()
                                + "% of the poverty level, your state's limit for adults.");
            }
            if (FplCalculator.atOrBelow(projectedAnnual, line, limit)) {
                return new MemberEligibility(i, m.age(), "ADULT", Availability.POSSIBLE,
                        "Your yearly income is under the adult limit. You may qualify in months when your income is low.");
            }
            return new MemberEligibility(i, m.age(), "ADULT", Availability.UNLIKELY,
                    "Income is above your state's Medicaid limit for adults.");
        }
        boolean parent = hasChild && (m.relationship() == Relationship.SELF || m.relationship() == Relationship.SPOUSE_PARTNER);
        if (parent && FplCalculator.atOrBelow(monthlyAnnualized, line, p.nonExpansionParentScreenPctFpl())) {
            return new MemberEligibility(i, m.age(), "ADULT", Availability.POSSIBLE,
                    "Your state has not expanded Medicaid, but parents with very low income can sometimes qualify. Check with your state.");
        }
        return new MemberEligibility(i, m.age(), "ADULT", Availability.UNLIKELY,
                "Your state has not expanded Medicaid, so most adults don't qualify on income alone.");
    }

    /** Best outcome across the given members (LIKELY > POSSIBLE > UNKNOWN > UNLIKELY). */
    public static Availability best(List<MemberEligibility> members) {
        Availability best = Availability.UNLIKELY;
        for (MemberEligibility m : members) {
            if (rank(m.availability()) > rank(best)) {
                best = m.availability();
            }
        }
        return best;
    }

    private static int rank(Availability a) {
        return switch (a) {
            case LIKELY, AVAILABLE -> 3;
            case POSSIBLE -> 2;
            case UNKNOWN -> 1;
            default -> 0;
        };
    }
}
