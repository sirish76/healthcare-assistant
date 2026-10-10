package com.healthassist.transition.engine;

import com.healthassist.transition.model.TransitionInput;
import com.healthassist.transition.model.TransitionInput.Member;
import com.healthassist.transition.model.TransitionInput.OldPlanInput;
import com.healthassist.transition.model.TransitionInput.SpousePlanInput;
import com.healthassist.transition.model.TransitionResult;
import com.healthassist.transition.model.TransitionResult.Availability;
import com.healthassist.transition.model.TransitionResult.Coverage;
import com.healthassist.transition.model.TransitionResult.CoverageOption;
import com.healthassist.transition.model.TransitionResult.Handoff;
import com.healthassist.transition.model.TransitionResult.HouseholdSummary;
import com.healthassist.transition.model.TransitionResult.LocationSummary;
import com.healthassist.transition.model.TransitionResult.MemberEligibility;
import com.healthassist.transition.model.TransitionResult.Meta;
import com.healthassist.transition.model.TransitionResult.OptionType;
import com.healthassist.transition.model.TransitionResult.PlanDataSource;
import com.healthassist.transition.model.TransitionResult.PlanQuote;
import com.healthassist.transition.model.TransitionResult.SubsidySummary;
import com.healthassist.transition.model.TransitionResult.TimelineItem;
import com.healthassist.transition.model.TransitionResult.TimelineStatus;
import com.healthassist.transition.model.TransitionResult.WatchOut;
import com.healthassist.transition.regdata.RegulatoryData;
import com.healthassist.transition.regdata.RegulatoryData.OpenEnrollmentWindow;
import com.healthassist.transition.regdata.RegulatoryTypes.ApplicableBand;
import com.healthassist.transition.regdata.RegulatoryTypes.Assumptions;
import com.healthassist.transition.regdata.RegulatoryTypes.ChipInfo;
import com.healthassist.transition.regdata.RegulatoryTypes.EmployerShare;
import com.healthassist.transition.regdata.RegulatoryTypes.ExchangeInfo;
import com.healthassist.transition.regdata.RegulatoryTypes.ExchangeType;
import com.healthassist.transition.regdata.RegulatoryTypes.FplGuideline;
import com.healthassist.transition.regdata.RegulatoryTypes.MedicaidAdults;
import com.healthassist.transition.regdata.RegulatoryTypes.PlanYearData;
import com.healthassist.transition.regdata.RegulatoryTypes.Rules;
import com.healthassist.transition.regdata.RegulatoryTypes.StateInfo;
import com.healthassist.transition.regdata.RegulatoryTypes.TypicalPlan;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.IntStream;

/**
 * The deterministic rules engine. Pure: no I/O, no clock, no logging. Every
 * number and eligibility decision in the result is computed here; the chatbot
 * only explains the output.
 */
public final class TransitionAnalyzer {

    private static final String DISCLAIMER_ESTIMATES = "These are estimates, not insurance, tax or legal advice. "
            + "Confirm prices, eligibility and deadlines on the official site before you decide.";
    private static final String DISCLAIMER_ELIGIBILITY = "Medicaid, CHIP and subsidy results are screening estimates. "
            + "Only the Marketplace or your state Medicaid agency can decide eligibility.";
    private static final String DISCLAIMER_PRIVACY = "Your answers are not saved. They are used only to calculate this page.";

    private final RegulatoryData data;

    public TransitionAnalyzer(RegulatoryData data) {
        this.data = data;
    }

    public TransitionResult analyze(TransitionInput in, ResolvedLocation loc, MarketplaceSnapshot mkt, LocalDate today) {
        DeadlineCalculator.requireDates(in.dates());
        Provenance prov = new Provenance();
        Rules r = data.common().rules();
        Assumptions a = data.common().assumptions();
        String state = loc.state();
        StateInfo st = loc.stateInfo();

        ExchangeInfo exchange = prov.use("states." + state + ".exchange", st.exchange());
        boolean stateExchange = exchange.type() == ExchangeType.STATE;
        MedicaidAdults medicaidAdults = prov.use("states." + state + ".medicaidAdults", st.medicaidAdults());
        ChipInfo chip = prov.use("states." + state + ".chip", st.chip());
        String medicaidUrl = prov.use("states." + state + ".medicaidUrl", st.medicaidUrl());

        List<Member> members = in.members();
        List<Integer> coveredIdx = IntStream.range(0, members.size()).filter(i -> members.get(i).wasCovered()).boxed().toList();
        if (coveredIdx.isEmpty()) {
            coveredIdx = IntStream.range(0, members.size()).boxed().toList();
        }
        List<Member> covered = coveredIdx.stream().map(members::get).toList();
        boolean family = covered.size() > 1;

        // ---- Dates ---------------------------------------------------------
        DeadlineCalculator.Rules dr = new DeadlineCalculator.Rules(
                prov.use("rules.cobraElectionDays", r.cobraElectionDays()),
                prov.use("rules.cobraFirstPaymentDays", r.cobraFirstPaymentDays()),
                prov.use("rules.cobraNoticeMaxDays", r.cobraNoticeMaxDays()),
                prov.use("rules.cobraMaxMonthsJobLoss", r.cobraMaxMonthsJobLoss()),
                prov.use("rules.marketplaceSepDaysBefore", r.marketplaceSepDaysBefore()),
                prov.use("rules.marketplaceSepDaysAfter", r.marketplaceSepDaysAfter()),
                prov.use("rules.employerPlanSpecialEnrollmentDays", r.employerPlanSpecialEnrollmentDays()),
                prov.use("rules.medicarePartBSepMonths", r.medicarePartBSepMonths()));
        LocalDate loss = DeadlineCalculator.lossDate(in.dates());
        LocalDate start = DeadlineCalculator.gaplessStart(loss);
        int planYear = start.getYear();
        int periodMonths = 13 - start.getMonthValue();
        PlanYearData py = data.planYearOrNearest(planYear);
        String pyKey = "planYear" + py.planYear();

        int medicareAge = prov.use("rules.medicareAge", r.medicareAge());
        int childMaxAge = prov.use("rules.childMaxAge", r.childMaxAge());
        boolean anyoneMedicareAge = covered.stream().anyMatch(m -> m.age() >= medicareAge);

        // ---- Income & FPL --------------------------------------------------
        BigDecimal currentYearAnnual = IncomeCalculator.projectedAnnual(in.income());
        boolean startsNextYear = planYear > today.getYear();
        boolean hasNextYearIncome = in.income().nextYearAnnualIncome() != null;
        BigDecimal subsidyIncome = startsNextYear && hasNextYearIncome ? in.income().nextYearAnnualIncome() : currentYearAnnual;
        int incomeYear = startsNextYear && hasNextYearIncome ? planYear : today.getYear();
        boolean usedCurrentForNext = startsNextYear && !hasNextYearIncome;

        int subsidyGuidelineYear = data.guidelineYearFor(py.aptcFplGuidelineYear());
        FplGuideline subsidyGuideline = prov.use("fplGuidelines." + subsidyGuidelineYear + "."
                + RegulatoryData.guidelineRegion(state), data.guideline(subsidyGuidelineYear, state));
        BigDecimal householdLine = FplCalculator.povertyLine(subsidyGuideline, members.size());
        BigDecimal annualPct = FplCalculator.percentOfFpl(subsidyIncome, householdLine);
        BigDecimal annualPctPrecise = FplCalculator.percentOfFplPrecise(subsidyIncome, householdLine);

        int medicaidGuidelineYear = data.guidelineYearFor(today.getYear());
        FplGuideline medicaidGuideline = prov.use("fplGuidelines." + medicaidGuidelineYear + "."
                + RegulatoryData.guidelineRegion(state), data.guideline(medicaidGuidelineYear, state));
        BigDecimal medicaidLine = FplCalculator.povertyLine(medicaidGuideline, members.size());
        BigDecimal currentMonthly = IncomeCalculator.currentMonthly(in.income());
        BigDecimal monthlyPct = FplCalculator.percentOfFpl(currentMonthly.multiply(Money.TWELVE), medicaidLine);

        // ---- Medicaid / CHIP -----------------------------------------------
        MedicaidChipEligibility.Params mp = new MedicaidChipEligibility.Params(
                medicaidAdults.expanded(), medicaidAdults.adultLimitPctFpl(), chip.limitPctFpl(),
                prov.use("rules.chipFallback", r.chipFallback()), childMaxAge, medicareAge,
                prov.use("rules.nonExpansionParentScreenPctFpl", r.nonExpansionParentScreenPctFpl()));
        List<MemberEligibility> allEligibility = MedicaidChipEligibility.assess(mp, members, medicaidLine,
                currentMonthly, currentYearAnnual);
        List<MemberEligibility> coveredEligibility = coveredIdx.stream().map(allEligibility::get).toList();
        Availability medicaidBest = MedicaidChipEligibility.best(coveredEligibility);
        List<MemberEligibility> adultElig = coveredEligibility.stream().filter(e -> "ADULT".equals(e.group())).toList();
        List<MemberEligibility> childElig = coveredEligibility.stream().filter(e -> "CHILD".equals(e.group())).toList();
        boolean adultsLikely = adultElig.stream().anyMatch(e -> e.availability() == Availability.LIKELY);
        boolean adultsAnnualQualify = medicaidAdults.adultLimitPctFpl() != null
                && FplCalculator.atOrBelow(currentYearAnnual, medicaidLine, medicaidAdults.adultLimitPctFpl());
        boolean childrenOnlyMedicaid = !childElig.isEmpty()
                && childElig.stream().anyMatch(e -> e.availability() == Availability.LIKELY || e.availability() == Availability.POSSIBLE)
                && adultElig.stream().noneMatch(e -> e.availability() == Availability.LIKELY || e.availability() == Availability.POSSIBLE);

        // ---- Subsidy -------------------------------------------------------
        boolean enhanced = prov.use(pyKey + ".enhancedSubsidiesInEffect", py.enhancedSubsidiesInEffect());
        List<ApplicableBand> bands = enhanced
                ? prov.use(pyKey + ".applicablePercentages.enhanced", py.applicablePercentages().enhanced())
                : prov.use(pyKey + ".applicablePercentages.standard", py.applicablePercentages().standard());
        BigDecimal floor = prov.use("rules.marketplaceSubsidyFloorPctFpl", r.marketplaceSubsidyFloorPctFpl());
        BigDecimal affordabilityPct = prov.use(pyKey + ".employerAffordabilityPercent", py.employerAffordabilityPercent());
        boolean repaymentUncapped = prov.use(pyKey + ".repaymentCaps", py.repaymentCaps()) == null;

        Optional<BigDecimal> applicable = SubsidyEstimator.applicablePercent(annualPctPrecise, bands);
        boolean aboveFloor = FplCalculator.atOrAbove(subsidyIncome, householdLine, floor);
        boolean incomeEligible = aboveFloor && applicable.isPresent();
        boolean medicaidInstead = medicaidAdults.adultLimitPctFpl() != null && aboveFloor
                && FplCalculator.atOrBelow(subsidyIncome, householdLine, medicaidAdults.adultLimitPctFpl())
                && adultElig.stream().anyMatch(e -> e.availability() == Availability.LIKELY);

        SpousePlanInput spouse = in.spousePlan() != null && in.spousePlan().available() ? in.spousePlan() : null;
        Boolean spouseAffordable = spouse == null || spouse.monthlyPremium() == null ? null
                : SubsidyEstimator.employerCoverageAffordable(spouse.monthlyPremium(), subsidyIncome, affordabilityPct);

        boolean subsidyEligible = incomeEligible && !medicaidInstead && !Boolean.TRUE.equals(spouseAffordable);
        String subsidyReason;
        if (!aboveFloor) {
            subsidyReason = "income is below 100% of the poverty level";
        } else if (applicable.isEmpty()) {
            subsidyReason = "income is above the " + bands.get(bands.size() - 1).toPctFpl().stripTrailingZeros().toPlainString()
                    + "% of poverty level cutoff";
        } else if (medicaidInstead) {
            subsidyReason = "income qualifies for Medicaid instead";
        } else if (Boolean.TRUE.equals(spouseAffordable)) {
            subsidyReason = "an affordable spouse or partner plan is available";
        } else {
            subsidyReason = "income is in the subsidy range";
        }
        BigDecimal applicablePct = applicable.orElse(null);
        BigDecimal maxMonthlyBenchmark = applicablePct == null ? null
                : Money.monthly(SubsidyEstimator.requiredAnnualContribution(subsidyIncome, applicablePct));
        BigDecimal benchmark = mkt.benchmarkMonthly() != null ? mkt.benchmarkMonthly() : secondLowestSilver(mkt.plans());
        BigDecimal credit = subsidyEligible && benchmark != null && applicablePct != null
                ? SubsidyEstimator.monthlyCredit(benchmark,
                        SubsidyEstimator.requiredAnnualContribution(subsidyIncome, applicablePct))
                : null;
        BigDecimal cutoffIncome = enhanced ? null
                : FplCalculator.incomeAtPercent(householdLine, bands.get(bands.size() - 1).toPctFpl());
        SubsidySummary subsidy = new SubsidySummary(subsidyEligible, subsidyReason,
                applicablePct == null ? null : applicablePct.setScale(2, java.math.RoundingMode.HALF_UP),
                subsidyEligible ? maxMonthlyBenchmark : null, Money.cents(benchmark), credit, enhanced);

        boolean coverageGap = !medicaidAdults.expanded() && !aboveFloor && !adultElig.isEmpty()
                && adultElig.stream().noneMatch(e -> e.availability() == Availability.LIKELY);

        // ---- Cost model inputs ---------------------------------------------
        Map<String, BigDecimal> spendTable = prov.use("assumptions.annualAllowedSpendPerPerson", a.annualAllowedSpendPerPerson());
        BigDecimal allowedSpend = spendTable.get(in.care().usage().name()).multiply(BigDecimal.valueOf(covered.size()));
        Map<String, BigDecimal> coinsurance = prov.use("assumptions.coinsuranceByMetal", a.coinsuranceByMetal());
        BigDecimal employerCoins = coinsurance.get("EMPLOYER");

        // ---- Timeline ------------------------------------------------------
        Optional<OpenEnrollmentWindow> oe = data.nextOpenEnrollment(state, today);
        oe.ifPresent(w -> prov.use("planYear" + w.planYear() + ".openEnrollment", w.window()));
        List<TimelineItem> timeline = DeadlineCalculator.timeline(new DeadlineCalculator.Context(
                in.dates(), today, spouse != null, anyoneMedicareAge, oe), dr);
        Map<String, TimelineItem> byKey = new LinkedHashMap<>();
        timeline.forEach(t -> byKey.put(t.key(), t));
        TimelineItem sep = byKey.get("MARKETPLACE_SEP");
        TimelineItem oeItem = byKey.get("OPEN_ENROLLMENT");
        TimelineItem elect = byKey.get("COBRA_ELECT");
        boolean sepPassed = sep.status() == TimelineStatus.PASSED;
        boolean oeOpen = oeItem != null && oeItem.status() == TimelineStatus.OPEN;

        // ---- Options -------------------------------------------------------
        List<CoverageOption> options = new ArrayList<>();
        TypicalPlan typical = prov.use("assumptions.typicalEmployerPlan", a.typicalEmployerPlan());
        BigDecimal typicalDed = family ? typical.deductibleFamily() : typical.deductibleSingle();
        BigDecimal typicalOop = family ? typical.oopMaxFamily() : typical.oopMaxSingle();

        // COBRA
        EmployerShare share = prov.use("assumptions.employerPremiumShare", a.employerPremiumShare());
        Optional<CobraEstimator.CobraPremium> cobraPremium = CobraEstimator.monthlyPremium(in.cobra(),
                family ? share.family() : share.single(),
                prov.use("rules.cobraPremiumMaxPercent", r.cobraPremiumMaxPercent()));
        OldPlanInput old = in.oldPlan();
        boolean oldDedKnown = old != null && old.deductible() != null;
        boolean oldOopKnown = old != null && old.outOfPocketMax() != null;
        BigDecimal cobraDed = oldDedKnown ? old.deductible() : typicalDed;
        BigDecimal cobraOop = oldOopKnown ? old.outOfPocketMax() : typicalOop;
        boolean carriesOver = loss.getYear() == start.getYear();
        BigDecimal dedMet = carriesOver && old != null ? Money.nz(old.deductibleMet()) : BigDecimal.ZERO;
        BigDecimal oopMet = carriesOver && old != null ? Money.nz(old.outOfPocketMet()) : BigDecimal.ZERO;
        List<String> cobraNotes = new ArrayList<>();
        cobraNotes.add("Same plan, doctors and drug coverage you had before. Lasts up to "
                + dr.cobraMaxMonths() + " months.");
        BigDecimal cobraMonthly = null;
        BigDecimal cobraPeriod = null;
        BigDecimal cobraTwelve = null;
        BigDecimal cobraDedRemaining = Money.max(BigDecimal.ZERO, cobraDed.subtract(dedMet));
        String cobraBasis = null;
        if (cobraPremium.isPresent()) {
            cobraMonthly = cobraPremium.get().monthly();
            CostModel.PlanTerms terms = new CostModel.PlanTerms(cobraMonthly, cobraDed, cobraOop, employerCoins);
            cobraPeriod = CostModel.estimate(terms, periodMonths, allowedSpend, dedMet, oopMet).total();
            cobraTwelve = CostModel.estimate(terms, 12, allowedSpend, BigDecimal.ZERO, BigDecimal.ZERO).total();
            if (cobraPremium.get().basis() == CobraEstimator.Basis.NOTICE) {
                cobraBasis = "Premium from your COBRA notice";
            } else {
                BigDecimal employerPct = (family ? share.family() : share.single()).multiply(Money.HUNDRED);
                cobraBasis = "Estimated from your paycheck deduction";
                cobraNotes.add("Estimated assuming your employer paid about " + Money.dollars(employerPct).toPlainString()
                        + "% of the premium. Your COBRA notice will show the exact price.");
            }
        } else {
            cobraNotes.add("Enter the monthly premium from your COBRA notice, or your old paycheck deduction, to see costs.");
        }
        if (!oldDedKnown || !oldOopKnown) {
            cobraNotes.add("We used typical employer-plan deductible and out-of-pocket amounts because you didn't enter yours.");
        }
        if (!carriesOver) {
            cobraNotes.add("Your new coverage starts in January, so the deductible starts over on every option.");
        }
        boolean electionPassed = elect.status() == TimelineStatus.PASSED && !elect.estimated();
        options.add(new CoverageOption(OptionType.COBRA, "COBRA (keep your old plan)",
                electionPassed ? Availability.NOT_AVAILABLE : Availability.AVAILABLE,
                electionPassed ? "The election deadline has passed." : "Available if your employer had 20 or more employees.",
                cobraMonthly, cobraPeriod, cobraTwelve, carriesOver, cobraDedRemaining, cobraBasis,
                cobraNotes, List.of(), null, List.of(), null));

        // Marketplace
        String hcgovUrl = NextStepsBuilder.HEALTHCARE_GOV;
        List<PlanQuote> quotes = new ArrayList<>();
        Handoff marketplaceHandoff = null;
        if (stateExchange) {
            marketplaceHandoff = new Handoff(exchange.name(), exchange.url(),
                    "Your state runs its own exchange. See live plans and prices there.");
        } else if (mkt.hasPlans()) {
            boolean catastrophicAllowed = covered.stream().allMatch(m -> m.age() < 30);
            for (MarketplaceSnapshot.PlanData p : mkt.plans()) {
                boolean catastrophic = "Catastrophic".equalsIgnoreCase(p.metalLevel());
                if (catastrophic && !catastrophicAllowed) {
                    continue;
                }
                quotes.add(quote(p, family, credit, catastrophic, coinsurance, periodMonths, allowedSpend, in, mkt));
            }
            quotes.sort(Comparator.comparing(PlanQuote::periodCost));
            if (quotes.size() > 10) {
                quotes = new ArrayList<>(quotes.subList(0, 10));
            }
        } else {
            marketplaceHandoff = new Handoff("HealthCare.gov", hcgovUrl,
                    "Live plan prices aren't available here. Compare exact plans on HealthCare.gov.");
        }
        List<String> mktNotes = new ArrayList<>();
        mktNotes.add("Deductible starts over at $0 on a new plan.");
        if (subsidyEligible && maxMonthlyBenchmark != null) {
            mktNotes.add("With the subsidy, you'd pay at most about " + Money.usd(maxMonthlyBenchmark)
                    + "/month for the benchmark silver plan. Bronze plans may cost less, with higher deductibles.");
        }
        if (in.care().drugs() != null && !in.care().drugs().isEmpty() && quotes.isEmpty()) {
            mktNotes.add("Check that your prescriptions are covered when you compare plans.");
        }
        PlanQuote cheapest = quotes.isEmpty() ? null : quotes.get(0);
        Availability mktAvail = sepPassed && !oeOpen ? Availability.NOT_AVAILABLE : Availability.AVAILABLE;
        options.add(new CoverageOption(OptionType.MARKETPLACE,
                stateExchange ? "Marketplace plan (" + exchange.name() + ")" : "Marketplace plan (HealthCare.gov)",
                mktAvail,
                mktAvail == Availability.NOT_AVAILABLE
                        ? "Your special enrollment window has ended. Next chance: open enrollment."
                        : "You can enroll because you lost job-based coverage.",
                cheapest == null ? null : cheapest.monthlyPremiumAfterCredit(),
                cheapest == null ? null : cheapest.periodCost(),
                cheapest == null ? null : cheapest.twelveMonthCost(),
                false, null,
                cheapest == null ? null : "Lowest estimated total among " + quotes.size() + " plans",
                mktNotes, quotes, subsidy, List.of(), marketplaceHandoff));

        // Medicaid / CHIP
        boolean medicaidPossible = medicaidBest == Availability.LIKELY || medicaidBest == Availability.POSSIBLE;
        // Only show a household cost if everyone who needs coverage could be on Medicaid/CHIP.
        boolean medicaidCoversAll = coveredEligibility.stream()
                .allMatch(e -> e.availability() == Availability.LIKELY || e.availability() == Availability.POSSIBLE);
        List<String> medNotes = new ArrayList<>();
        medNotes.add("Medicaid and CHIP look at your current monthly income. You can apply any time.");
        if (childrenOnlyMedicaid) {
            medNotes.add("Likely only for the children in your household. The adults would need another option.");
        } else if (medicaidPossible && !medicaidCoversAll) {
            medNotes.add("Likely only for some people in your household. The others would need another option.");
        }
        medNotes.add("Usually no premium and very low costs when you get care. Some states charge small CHIP premiums.");
        options.add(new CoverageOption(OptionType.MEDICAID_CHIP, "Medicaid / CHIP", medicaidBest,
                coveredEligibility.stream().filter(e -> e.availability() == medicaidBest).map(MemberEligibility::reason)
                        .findFirst().orElse(null),
                medicaidPossible ? BigDecimal.ZERO.setScale(2) : null,
                medicaidCoversAll ? BigDecimal.ZERO.setScale(2) : null,
                medicaidCoversAll ? BigDecimal.ZERO.setScale(2) : null,
                false, null, medicaidPossible ? "Typical: no premium" : null,
                medNotes, List.of(), null, coveredEligibility,
                new Handoff(stateExchange ? exchange.name() : "HealthCare.gov",
                        stateExchange ? exchange.url() : hcgovUrl, "Apply for Medicaid or CHIP")));

        // Spouse / partner plan
        if (spouse != null) {
            TimelineItem sp = byKey.get("SPOUSE_PLAN");
            boolean spPassed = sp != null && sp.status() == TimelineStatus.PASSED;
            List<String> spNotes = new ArrayList<>();
            spNotes.add("New plan, so the deductible starts over at $0. Check that your doctors are in its network.");
            BigDecimal spMonthly = null;
            BigDecimal spPeriod = null;
            BigDecimal spTwelve = null;
            if (spouse.monthlyPremium() != null) {
                spMonthly = Money.cents(spouse.monthlyPremium());
                BigDecimal d = spouse.deductible() != null ? spouse.deductible() : typicalDed;
                BigDecimal o = spouse.outOfPocketMax() != null ? spouse.outOfPocketMax() : typicalOop;
                if (spouse.deductible() == null || spouse.outOfPocketMax() == null) {
                    spNotes.add("We used typical employer-plan deductible and out-of-pocket amounts for the missing ones.");
                }
                CostModel.PlanTerms terms = new CostModel.PlanTerms(spMonthly, d, o, employerCoins);
                spPeriod = CostModel.estimate(terms, periodMonths, allowedSpend, BigDecimal.ZERO, BigDecimal.ZERO).total();
                spTwelve = CostModel.estimate(terms, 12, allowedSpend, BigDecimal.ZERO, BigDecimal.ZERO).total();
            } else {
                spNotes.add("Ask their HR what family coverage would cost per month to see an estimate.");
            }
            options.add(new CoverageOption(OptionType.SPOUSE_PLAN, "Spouse's or partner's employer plan",
                    spPassed ? Availability.NOT_AVAILABLE : Availability.AVAILABLE,
                    spPassed ? "The usual 30-day window to join has passed. Ask their HR whether it allows longer."
                             : "Losing your coverage lets you join their plan outside open enrollment.",
                    spMonthly, spPeriod, spTwelve, false, null,
                    spMonthly != null ? "Monthly cost you entered" : null, spNotes, List.of(), null, List.of(), null));
        }

        // ---- Watch-outs, next steps, summary --------------------------------
        boolean incomeVariable = in.income().annualOverride() == null
                && (Money.nz(in.income().severance()).signum() > 0 || Money.nz(in.income().unemploymentWeekly()).signum() > 0);
        List<WatchOut> watchOuts = WatchOutRules.evaluate(new WatchOutRules.Facts(
                exchange.name(), stateExchange, planYear, incomeYear, startsNextYear, usedCurrentForNext, periodMonths,
                annualPct, householdLine, subsidyEligible, enhanced, cutoffIncome, repaymentUncapped, medicaidBest,
                adultsLikely && !adultsAnnualQualify, childrenOnlyMedicaid, coverageGap,
                old == null ? null : old.deductibleMet(), carriesOver,
                spouse != null, spouseAffordable, spouse == null ? null : spouse.monthlyPremium(), affordabilityPct,
                anyoneMedicareAge, DeadlineCalculator.cobraNoticeDueBy(in.dates(), dr), in.dates().cobraNoticeReceived(),
                sep.date(), elect.date(), elect.estimated(), oeItem == null ? null : oeItem.windowStart(),
                stateExchange ? PlanDataSource.NOT_APPLICABLE : mkt.source(),
                DeadlineCalculator.lossDateEstimated(in.dates()), incomeVariable, today));

        List<TransitionResult.NextStep> nextSteps = NextStepsBuilder.build(new NextStepsBuilder.Inputs(
                stateExchange, exchange.name(), exchange.url(), medicaidUrl, medicaidBest, spouse != null,
                anyoneMedicareAge, byKey));

        LocationSummary location = new LocationSummary(state, st.name(), loc.countyName(), exchange.type().name(),
                exchange.name(), exchange.url(), medicaidUrl);
        HouseholdSummary household = new HouseholdSummary(members.size(), covered.size(), Money.cents(subsidyIncome),
                incomeYear, annualPct, subsidyGuidelineYear, currentMonthly, monthlyPct, medicaidGuidelineYear,
                loss, start, periodMonths);

        int children = (int) covered.stream().filter(m -> m.age() <= childMaxAge).count();
        int seniors = (int) covered.stream().filter(m -> m.age() >= medicareAge).count();
        String chatSummary = ChatSummaryBuilder.build(location, household, covered.size() - children, children,
                seniors, options, byKey, watchOuts);

        Meta meta = new Meta(data.dataVersion(), today, planYear, data.hasPlanYear(planYear),
                stateExchange ? PlanDataSource.NOT_APPLICABLE : mkt.source(), mkt.note(), prov.pending());
        return new TransitionResult(meta, location, household, options, timeline, watchOuts, nextSteps, chatSummary,
                List.of(DISCLAIMER_ESTIMATES, DISCLAIMER_ELIGIBILITY, DISCLAIMER_PRIVACY));
    }

    private static PlanQuote quote(MarketplaceSnapshot.PlanData p, boolean family, BigDecimal credit, boolean catastrophic,
                                   Map<String, BigDecimal> coinsurance, int months, BigDecimal allowedSpend,
                                   TransitionInput in, MarketplaceSnapshot mkt) {
        BigDecimal premium = Money.cents(p.monthlyPremium());
        BigDecimal afterCredit = credit == null || catastrophic ? premium
                : Money.cents(Money.max(BigDecimal.ZERO, premium.subtract(credit)));
        BigDecimal ded = family && p.deductibleFamily() != null ? p.deductibleFamily() : Money.nz(p.deductibleIndividual());
        BigDecimal oop = family && p.moopFamily() != null ? p.moopFamily() : Money.nz(p.moopIndividual());
        BigDecimal coins = coinsurance.getOrDefault(p.metalLevel(), coinsurance.get("Silver"));
        CostModel.PlanTerms terms = new CostModel.PlanTerms(afterCredit, ded, oop, coins);
        BigDecimal period = CostModel.estimate(terms, months, allowedSpend, BigDecimal.ZERO, BigDecimal.ZERO).total();
        BigDecimal twelve = CostModel.estimate(terms, 12, allowedSpend, BigDecimal.ZERO, BigDecimal.ZERO).total();
        List<Coverage> drugs = in.care().drugs() == null ? List.of() : in.care().drugs().stream()
                .map(d -> new Coverage(d.rxcui(), d.name(), status(mkt.drugCoverage(), p.id(), d.rxcui()))).toList();
        List<Coverage> providers = in.care().providers() == null ? List.of() : in.care().providers().stream()
                .map(d -> new Coverage(d.npi(), d.name(), status(mkt.providerCoverage(), p.id(), d.npi()))).toList();
        return new PlanQuote(p.id(), p.name(), p.issuer(), p.metalLevel(), p.planType(), premium, afterCredit,
                Money.cents(ded), Money.cents(oop), period, twelve, drugs, providers);
    }

    private static String status(List<MarketplaceSnapshot.CoverageRow> rows, String planId, String itemId) {
        if (rows == null) {
            return "Unknown";
        }
        return rows.stream().filter(r -> planId.equals(r.planId()) && itemId.equals(r.itemId()))
                .map(MarketplaceSnapshot.CoverageRow::status).findFirst().orElse("Unknown");
    }

    /** Fallback benchmark when the API's SLCSP isn't available: 2nd-lowest silver premium in the list. */
    static BigDecimal secondLowestSilver(List<MarketplaceSnapshot.PlanData> plans) {
        if (plans == null) {
            return null;
        }
        List<BigDecimal> silver = plans.stream().filter(p -> "Silver".equalsIgnoreCase(p.metalLevel()))
                .map(MarketplaceSnapshot.PlanData::monthlyPremium).sorted().toList();
        if (silver.isEmpty()) {
            return null;
        }
        return silver.size() == 1 ? silver.get(0) : silver.get(1);
    }
}
