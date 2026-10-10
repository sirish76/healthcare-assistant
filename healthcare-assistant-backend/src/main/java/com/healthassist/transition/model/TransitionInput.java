package com.healthassist.transition.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Everything the wizard collects. PRIVACY: these records contain household,
 * income and prescription data. They are processed in memory only, and every
 * toString() is redacted so that accidental logging can't leak them.
 */
public record TransitionInput(
        @NotNull @Pattern(regexp = "\\d{5}") String zip,
        @Pattern(regexp = "[A-Za-z]{2}") String state,
        @Pattern(regexp = "\\d{5}") String countyFips,
        @NotEmpty @Size(max = 12) List<@Valid @NotNull Member> members,
        @NotNull @Valid CoverageDates dates,
        @Valid CobraInput cobra,
        @Valid OldPlanInput oldPlan,
        @NotNull @Valid IncomeInput income,
        @NotNull @Valid CareInput care,
        @Valid SpousePlanInput spousePlan) {

    @Override
    public String toString() {
        return "TransitionInput[redacted]";
    }

    public enum Relationship { SELF, SPOUSE_PARTNER, CHILD, OTHER_DEPENDENT }

    public enum PayFrequency {
        WEEKLY(52), BIWEEKLY(26), SEMIMONTHLY(24), MONTHLY(12);

        public final int periodsPerYear;

        PayFrequency(int periodsPerYear) {
            this.periodsPerYear = periodsPerYear;
        }
    }

    public enum UsageLevel { LOW, MODERATE, HIGH }

    public record Member(@Min(0) @Max(120) int age,
                         boolean usesTobacco,
                         boolean wasCovered,
                         @NotNull Relationship relationship) {
        @Override
        public String toString() {
            return "Member[redacted]";
        }
    }

    /** At least one of jobEndDate / lastDayOfCoverage is required (checked by the analyzer). */
    public record CoverageDates(LocalDate jobEndDate,
                                LocalDate lastDayOfCoverage,
                                boolean cobraNoticeReceived,
                                LocalDate cobraNoticeDate) {
        @Override
        public String toString() {
            return "CoverageDates[redacted]";
        }
    }

    public record CobraInput(@PositiveOrZero @DecimalMax("1000000") BigDecimal monthlyPremium,
                             @PositiveOrZero @DecimalMax("1000000") BigDecimal paycheckDeduction,
                             PayFrequency payFrequency) {
        @Override
        public String toString() {
            return "CobraInput[redacted]";
        }
    }

    public record OldPlanInput(@PositiveOrZero @DecimalMax("1000000") BigDecimal deductible,
                               @PositiveOrZero @DecimalMax("1000000") BigDecimal outOfPocketMax,
                               @PositiveOrZero @DecimalMax("1000000") BigDecimal deductibleMet,
                               @PositiveOrZero @DecimalMax("1000000") BigDecimal outOfPocketMet) {
        @Override
        public String toString() {
            return "OldPlanInput[redacted]";
        }
    }

    /**
     * Either {@code annualOverride} or the helper components. Projected annual
     * household income for the calendar year the new coverage starts in.
     */
    public record IncomeInput(@PositiveOrZero @DecimalMax("100000000") BigDecimal annualOverride,
                              @PositiveOrZero @DecimalMax("100000000") BigDecimal wagesThisYear,
                              @PositiveOrZero @DecimalMax("100000000") BigDecimal severance,
                              @PositiveOrZero @DecimalMax("100000") BigDecimal unemploymentWeekly,
                              @Min(0) @Max(104) Integer unemploymentWeeks,
                              @PositiveOrZero @DecimalMax("100000000") BigDecimal spouseAnnualIncome,
                              @PositiveOrZero @DecimalMax("100000000") BigDecimal otherAnnualIncome,
                              @PositiveOrZero @DecimalMax("100000000") BigDecimal nextYearAnnualIncome,
                              @PositiveOrZero @DecimalMax("10000000") BigDecimal currentMonthlyOverride) {
        @Override
        public String toString() {
            return "IncomeInput[redacted]";
        }
    }

    public record CareInput(@NotNull UsageLevel usage,
                            @Size(max = 20) List<@Valid @NotNull DrugRef> drugs,
                            @Size(max = 20) List<@Valid @NotNull ProviderRef> providers) {
        @Override
        public String toString() {
            return "CareInput[redacted]";
        }
    }

    public record DrugRef(@NotNull @Pattern(regexp = "\\d{1,10}") String rxcui, @Size(max = 200) String name) {
        @Override
        public String toString() {
            return "DrugRef[redacted]";
        }
    }

    public record ProviderRef(@NotNull @Pattern(regexp = "\\d{10}") String npi, @Size(max = 200) String name) {
        @Override
        public String toString() {
            return "ProviderRef[redacted]";
        }
    }

    /** {@code monthlyPremium} = what the spouse/partner would pay per month to cover the family. */
    public record SpousePlanInput(boolean available,
                                  @PositiveOrZero @DecimalMax("1000000") BigDecimal monthlyPremium,
                                  @PositiveOrZero @DecimalMax("1000000") BigDecimal deductible,
                                  @PositiveOrZero @DecimalMax("1000000") BigDecimal outOfPocketMax) {
        @Override
        public String toString() {
            return "SpousePlanInput[redacted]";
        }
    }
}
