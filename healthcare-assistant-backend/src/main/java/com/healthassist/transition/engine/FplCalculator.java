package com.healthassist.transition.engine;

import com.healthassist.transition.regdata.RegulatoryTypes.FplGuideline;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Federal poverty level math. Threshold checks are exact (no rounding), so an
 * income exactly at a limit counts as "at or below" the limit.
 */
public final class FplCalculator {

    private FplCalculator() {
    }

    public static BigDecimal povertyLine(FplGuideline g, int householdSize) {
        if (householdSize < 1) {
            throw new IllegalArgumentException("household size must be >= 1");
        }
        return g.firstPerson().add(g.eachAdditional().multiply(BigDecimal.valueOf(householdSize - 1L)));
    }

    /** Income as a percent of the poverty line, truncated to 2 decimals (for display). */
    public static BigDecimal percentOfFpl(BigDecimal annualIncome, BigDecimal povertyLine) {
        return annualIncome.multiply(Money.HUNDRED).divide(povertyLine, 2, RoundingMode.DOWN);
    }

    /** Income as a percent of the poverty line with enough precision for band lookups. */
    public static BigDecimal percentOfFplPrecise(BigDecimal annualIncome, BigDecimal povertyLine) {
        return annualIncome.multiply(Money.HUNDRED).divide(povertyLine, 8, RoundingMode.DOWN);
    }

    /** Exact test: income <= limitPct% of the poverty line. */
    public static boolean atOrBelow(BigDecimal annualIncome, BigDecimal povertyLine, BigDecimal limitPct) {
        return annualIncome.multiply(Money.HUNDRED).compareTo(limitPct.multiply(povertyLine)) <= 0;
    }

    /** Exact test: income >= floorPct% of the poverty line. */
    public static boolean atOrAbove(BigDecimal annualIncome, BigDecimal povertyLine, BigDecimal floorPct) {
        return annualIncome.multiply(Money.HUNDRED).compareTo(floorPct.multiply(povertyLine)) >= 0;
    }

    /** Annual income equal to {@code pct}% of the poverty line. */
    public static BigDecimal incomeAtPercent(BigDecimal povertyLine, BigDecimal pct) {
        return povertyLine.multiply(pct).divide(Money.HUNDRED, 2, RoundingMode.HALF_UP);
    }
}
