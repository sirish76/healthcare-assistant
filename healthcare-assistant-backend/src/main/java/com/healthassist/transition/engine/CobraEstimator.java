package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionInput.CobraInput;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/** COBRA monthly premium: from the notice if known, else estimated from the old paycheck deduction. */
public final class CobraEstimator {

    private CobraEstimator() {
    }

    public enum Basis { NOTICE, ESTIMATED_FROM_PAYCHECK }

    public record CobraPremium(BigDecimal monthly, Basis basis) {
    }

    /**
     * @param employerShare share of the total premium the employer paid (e.g. 0.84)
     * @param maxPercent    COBRA cap as percent of total premium (102)
     */
    public static Optional<CobraPremium> monthlyPremium(CobraInput in, BigDecimal employerShare, BigDecimal maxPercent) {
        if (in == null) {
            return Optional.empty();
        }
        if (in.monthlyPremium() != null && in.monthlyPremium().signum() > 0) {
            return Optional.of(new CobraPremium(Money.cents(in.monthlyPremium()), Basis.NOTICE));
        }
        if (in.paycheckDeduction() != null && in.paycheckDeduction().signum() > 0 && in.payFrequency() != null) {
            BigDecimal employeeMonthly = in.paycheckDeduction()
                    .multiply(BigDecimal.valueOf(in.payFrequency().periodsPerYear))
                    .divide(Money.TWELVE, 10, RoundingMode.HALF_UP);
            BigDecimal employeeShare = BigDecimal.ONE.subtract(employerShare);
            BigDecimal total = employeeMonthly.divide(employeeShare, 10, RoundingMode.HALF_UP);
            BigDecimal cobra = total.multiply(maxPercent).divide(Money.HUNDRED, 2, RoundingMode.HALF_UP);
            return Optional.of(new CobraPremium(cobra, Basis.ESTIMATED_FROM_PAYCHECK));
        }
        return Optional.empty();
    }
}
