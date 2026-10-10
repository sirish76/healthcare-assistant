package com.healthassist.transition.regdata;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Plain data shapes for the YAML files in {@code resources/transition/regulatory}. */
public final class RegulatoryTypes {

    private RegulatoryTypes() {
    }

    public enum ExchangeType { HEALTHCARE_GOV, STATE }

    public record FplGuideline(BigDecimal firstPerson, BigDecimal eachAdditional) {
    }

    public record ExchangeInfo(ExchangeType type, String name, String url) {
    }

    public record MedicaidAdults(boolean expanded, BigDecimal adultLimitPctFpl) {
    }

    public record ChipInfo(BigDecimal limitPctFpl) {
    }

    public record ChipFallback(BigDecimal likelyBelowPctFpl, BigDecimal possibleBelowPctFpl) {
    }

    public record StateInfo(String name,
                            Sourced<ExchangeInfo> exchange,
                            Sourced<MedicaidAdults> medicaidAdults,
                            Sourced<ChipInfo> chip,
                            Sourced<String> medicaidUrl) {
    }

    public record Rules(Sourced<Integer> cobraElectionDays,
                        Sourced<Integer> cobraFirstPaymentDays,
                        Sourced<Integer> cobraMaxMonthsJobLoss,
                        Sourced<BigDecimal> cobraPremiumMaxPercent,
                        Sourced<Integer> cobraNoticeMaxDays,
                        Sourced<Integer> marketplaceSepDaysBefore,
                        Sourced<Integer> marketplaceSepDaysAfter,
                        Sourced<Integer> employerPlanSpecialEnrollmentDays,
                        Sourced<Integer> medicarePartBSepMonths,
                        Sourced<Integer> medicareAge,
                        Sourced<BigDecimal> medicaidExpansionLimitPctFpl,
                        Sourced<BigDecimal> marketplaceSubsidyFloorPctFpl,
                        Sourced<Integer> childMaxAge,
                        Sourced<ChipFallback> chipFallback,
                        Sourced<BigDecimal> nonExpansionParentScreenPctFpl) {
    }

    public record EmployerShare(BigDecimal single, BigDecimal family) {
    }

    public record TypicalPlan(BigDecimal deductibleSingle, BigDecimal deductibleFamily,
                              BigDecimal oopMaxSingle, BigDecimal oopMaxFamily) {
    }

    public record Assumptions(Sourced<EmployerShare> employerPremiumShare,
                              Sourced<Map<String, BigDecimal>> annualAllowedSpendPerPerson,
                              Sourced<Map<String, BigDecimal>> coinsuranceByMetal,
                              Sourced<TypicalPlan> typicalEmployerPlan) {
    }

    public record CommonData(String dataVersion,
                             Map<String, Map<String, Sourced<FplGuideline>>> fplGuidelines,
                             Rules rules,
                             Assumptions assumptions,
                             Map<String, StateInfo> states) {
    }

    public record DateWindow(LocalDate start, LocalDate end) {
    }

    public record OpenEnrollment(@JsonProperty("HEALTHCARE_GOV") Sourced<DateWindow> healthcareGov,
                                 Map<String, Sourced<DateWindow>> stateOverrides) {
    }

    /** Linear from startPercent to endPercent across [fromPctFpl, toPctFpl). */
    public record ApplicableBand(BigDecimal fromPctFpl, BigDecimal toPctFpl,
                                 BigDecimal startPercent, BigDecimal endPercent) {
    }

    public record ApplicablePercentages(Sourced<List<ApplicableBand>> standard,
                                        Sourced<List<ApplicableBand>> enhanced) {
    }

    public record RepaymentCap(BigDecimal upToPctFpl, BigDecimal singleCap, BigDecimal otherCap) {
    }

    public record MoopLimits(BigDecimal self, BigDecimal family) {
    }

    public record PlanYearData(int planYear,
                               int aptcFplGuidelineYear,
                               OpenEnrollment openEnrollment,
                               Sourced<Boolean> enhancedSubsidiesInEffect,
                               ApplicablePercentages applicablePercentages,
                               Sourced<BigDecimal> employerAffordabilityPercent,
                               Sourced<List<RepaymentCap>> repaymentCaps,
                               Sourced<MoopLimits> maxOutOfPocket) {
    }
}
