package com.healthassist.transition.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Output of the rules engine. PRIVACY: never logged or persisted. */
public record TransitionResult(Meta meta,
                               LocationSummary location,
                               HouseholdSummary household,
                               List<CoverageOption> options,
                               List<TimelineItem> timeline,
                               List<WatchOut> watchOuts,
                               List<NextStep> nextSteps,
                               String chatSummary,
                               List<String> disclaimers) {

    @Override
    public String toString() {
        return "TransitionResult[redacted]";
    }

    public enum PlanDataSource { LIVE, FIXTURE, UNAVAILABLE, NOT_APPLICABLE }

    public enum OptionType { COBRA, MARKETPLACE, MEDICAID_CHIP, SPOUSE_PLAN }

    public enum Availability { AVAILABLE, LIKELY, POSSIBLE, UNLIKELY, NOT_AVAILABLE, UNKNOWN }

    public enum Severity { INFO, WARNING, URGENT }

    public enum TimelineStatus { PASSED, OPEN, UPCOMING, ONGOING, UNKNOWN }

    public record Meta(String dataVersion,
                       LocalDate asOf,
                       int planYear,
                       boolean planYearDataIsExact,
                       PlanDataSource planDataSource,
                       String planDataNote,
                       List<String> pendingReviewValues) {
    }

    public record LocationSummary(String state,
                                  String stateName,
                                  String countyName,
                                  String exchangeType,
                                  String exchangeName,
                                  String exchangeUrl,
                                  String medicaidUrl) {
    }

    public record HouseholdSummary(int householdSize,
                                   int peopleNeedingCoverage,
                                   BigDecimal projectedAnnualIncome,
                                   int incomeYear,
                                   BigDecimal annualFplPercent,
                                   int subsidyGuidelineYear,
                                   BigDecimal currentMonthlyIncome,
                                   BigDecimal currentMonthlyFplPercent,
                                   int medicaidGuidelineYear,
                                   LocalDate coverageEnds,
                                   LocalDate newCoverageStart,
                                   int monthsInPeriod) {
    }

    public record MemberEligibility(int memberIndex,
                                    int age,
                                    String group,
                                    Availability availability,
                                    String reason) {
    }

    public record SubsidySummary(boolean eligible,
                                 String reason,
                                 BigDecimal applicablePercent,
                                 BigDecimal maxMonthlyForBenchmark,
                                 BigDecimal benchmarkMonthlyPremium,
                                 BigDecimal estimatedMonthlyCredit,
                                 boolean enhancedRules) {
    }

    public record Coverage(String id, String name, String status) {
    }

    public record PlanQuote(String id,
                            String name,
                            String issuer,
                            String metalLevel,
                            String planType,
                            BigDecimal monthlyPremium,
                            BigDecimal monthlyPremiumAfterCredit,
                            BigDecimal deductible,
                            BigDecimal outOfPocketMax,
                            BigDecimal periodCost,
                            BigDecimal twelveMonthCost,
                            List<Coverage> drugCoverage,
                            List<Coverage> providerCoverage) {
    }

    public record Handoff(String name, String url, String reason) {
    }

    public record CoverageOption(OptionType type,
                                 String label,
                                 Availability availability,
                                 String availabilityReason,
                                 BigDecimal monthlyPremium,
                                 BigDecimal periodCost,
                                 BigDecimal twelveMonthCost,
                                 Boolean deductibleCarriesOver,
                                 BigDecimal deductibleRemaining,
                                 String costBasis,
                                 List<String> notes,
                                 List<PlanQuote> plans,
                                 SubsidySummary subsidy,
                                 List<MemberEligibility> members,
                                 Handoff handoff) {
    }

    public record TimelineItem(String key,
                               String label,
                               LocalDate windowStart,
                               LocalDate date,
                               boolean estimated,
                               TimelineStatus status,
                               Long daysLeft,
                               String detail) {
    }

    public record WatchOut(String key, Severity severity, String title, String body) {
    }

    public record NextStep(String key, String title, String body, String url, String urlLabel, LocalDate dueBy) {
    }
}
