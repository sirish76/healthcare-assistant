package com.healthassist.transition.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Expected cost = premiums + expected out-of-pocket. Out-of-pocket uses a
 * simple deductible-then-coinsurance model capped at the out-of-pocket max:
 *   oop = min(oopRemaining, min(spend, dedRemaining) + coinsurance x (spend - dedRemaining)+)
 * This is an estimate; copays and plan-specific cost sharing are not modeled.
 */
public final class CostModel {

    private CostModel() {
    }

    public record PlanTerms(BigDecimal monthlyPremium, BigDecimal deductible, BigDecimal oopMax, BigDecimal coinsurance) {
    }

    public record Estimate(BigDecimal premiums, BigDecimal outOfPocket, BigDecimal total,
                           BigDecimal deductibleRemaining) {
    }

    public static BigDecimal expectedOutOfPocket(BigDecimal allowedSpend, BigDecimal deductibleRemaining,
                                                 BigDecimal oopRemaining, BigDecimal coinsurance) {
        BigDecimal spend = Money.max(BigDecimal.ZERO, allowedSpend);
        BigDecimal ded = Money.max(BigDecimal.ZERO, deductibleRemaining);
        BigDecimal cap = Money.max(BigDecimal.ZERO, oopRemaining);
        BigDecimal underDeductible = Money.min(spend, ded);
        BigDecimal afterDeductible = Money.max(BigDecimal.ZERO, spend.subtract(ded)).multiply(coinsurance);
        return Money.cents(Money.min(cap, underDeductible.add(afterDeductible)));
    }

    /**
     * Cost over {@code months} months, given the deductible / out-of-pocket
     * already met on THIS plan this plan year (zero for a new plan).
     */
    public static Estimate estimate(PlanTerms terms, int months, BigDecimal annualAllowedSpend,
                                    BigDecimal deductibleMet, BigDecimal oopMet) {
        BigDecimal spend = annualAllowedSpend.multiply(BigDecimal.valueOf(months))
                .divide(Money.TWELVE, 2, RoundingMode.HALF_UP);
        BigDecimal dedRemaining = Money.max(BigDecimal.ZERO, terms.deductible().subtract(Money.nz(deductibleMet)));
        BigDecimal oopRemaining = Money.max(BigDecimal.ZERO, terms.oopMax().subtract(Money.nz(oopMet)));
        BigDecimal oop = expectedOutOfPocket(spend, dedRemaining, oopRemaining, terms.coinsurance());
        BigDecimal premiums = Money.cents(terms.monthlyPremium().multiply(BigDecimal.valueOf(months)));
        return new Estimate(premiums, oop, premiums.add(oop), dedRemaining);
    }
}
