package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionInput.IncomeInput;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Turns the wizard's income helpers into the two numbers the rules need. */
public final class IncomeCalculator {

    private static final BigDecimal WEEKS_PER_MONTH = new BigDecimal("4.3333333333");

    private IncomeCalculator() {
    }

    /** Projected household income for the current calendar year. */
    public static BigDecimal projectedAnnual(IncomeInput in) {
        if (in.annualOverride() != null) {
            return in.annualOverride();
        }
        BigDecimal unemployment = Money.nz(in.unemploymentWeekly())
                .multiply(BigDecimal.valueOf(in.unemploymentWeeks() == null ? 0 : in.unemploymentWeeks()));
        return Money.nz(in.wagesThisYear())
                .add(Money.nz(in.severance()))
                .add(unemployment)
                .add(Money.nz(in.spouseAnnualIncome()))
                .add(Money.nz(in.otherAnnualIncome()));
    }

    /**
     * Current monthly household income, as Medicaid would look at it right
     * after the job ends: unemployment + spouse + other. Wages and one-time
     * severance are excluded (severance counts only in the month received).
     */
    public static BigDecimal currentMonthly(IncomeInput in) {
        if (in.currentMonthlyOverride() != null) {
            return in.currentMonthlyOverride();
        }
        BigDecimal unemployment = Money.nz(in.unemploymentWeekly()).multiply(WEEKS_PER_MONTH);
        BigDecimal annualOther = Money.nz(in.spouseAnnualIncome()).add(Money.nz(in.otherAnnualIncome()));
        return unemployment.add(annualOther.divide(Money.TWELVE, 10, RoundingMode.HALF_UP))
                .setScale(2, RoundingMode.HALF_UP);
    }
}
