package com.healthassist.transition.engine;

import com.healthassist.transition.regdata.RegulatoryTypes.ApplicableBand;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

/**
 * Premium tax credit estimate:
 * credit = max(0, benchmark silver premium - applicable% x household income).
 */
public final class SubsidyEstimator {

    private SubsidyEstimator() {
    }

    /**
     * Applicable percentage for an income given as exact % of FPL. Bands are
     * half-open [from, to) except the last band, whose upper bound is
     * inclusive (the law says "does not exceed 400 percent").
     * Empty if income is above the top band.
     */
    public static Optional<BigDecimal> applicablePercent(BigDecimal pctFpl, List<ApplicableBand> bands) {
        for (int i = 0; i < bands.size(); i++) {
            ApplicableBand b = bands.get(i);
            boolean last = i == bands.size() - 1;
            boolean aboveFrom = pctFpl.compareTo(b.fromPctFpl()) >= 0;
            boolean belowTo = last ? pctFpl.compareTo(b.toPctFpl()) <= 0 : pctFpl.compareTo(b.toPctFpl()) < 0;
            if (aboveFrom && belowTo) {
                return Optional.of(interpolate(pctFpl, b));
            }
        }
        if (!bands.isEmpty() && pctFpl.compareTo(bands.get(0).fromPctFpl()) < 0) {
            return Optional.of(bands.get(0).startPercent());
        }
        return Optional.empty();
    }

    static BigDecimal interpolate(BigDecimal pctFpl, ApplicableBand b) {
        BigDecimal width = b.toPctFpl().subtract(b.fromPctFpl());
        if (width.signum() == 0 || b.startPercent().compareTo(b.endPercent()) == 0) {
            return b.startPercent();
        }
        BigDecimal fraction = pctFpl.subtract(b.fromPctFpl()).divide(width, 10, RoundingMode.HALF_UP);
        return b.startPercent()
                .add(b.endPercent().subtract(b.startPercent()).multiply(fraction))
                .setScale(4, RoundingMode.HALF_UP);
    }

    /** Most the household is expected to pay per year for the benchmark plan. */
    public static BigDecimal requiredAnnualContribution(BigDecimal annualIncome, BigDecimal applicablePercent) {
        return annualIncome.multiply(applicablePercent).divide(Money.HUNDRED, 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal monthlyCredit(BigDecimal benchmarkMonthly, BigDecimal requiredAnnualContribution) {
        BigDecimal credit = benchmarkMonthly.subtract(Money.monthly(requiredAnnualContribution));
        return Money.cents(Money.max(BigDecimal.ZERO, credit));
    }

    /** Employer coverage is "affordable" (blocks the credit) if its annual cost <= pct% of income. */
    public static boolean employerCoverageAffordable(BigDecimal monthlyPremium, BigDecimal annualIncome,
                                                     BigDecimal affordabilityPercent) {
        BigDecimal annualCost = monthlyPremium.multiply(Money.TWELVE);
        return annualCost.multiply(Money.HUNDRED).compareTo(annualIncome.multiply(affordabilityPercent)) <= 0;
    }
}
