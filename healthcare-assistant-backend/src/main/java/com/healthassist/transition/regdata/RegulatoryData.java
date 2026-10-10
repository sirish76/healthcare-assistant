package com.healthassist.transition.regdata;

import com.healthassist.transition.regdata.RegulatoryTypes.CommonData;
import com.healthassist.transition.regdata.RegulatoryTypes.DateWindow;
import com.healthassist.transition.regdata.RegulatoryTypes.FplGuideline;
import com.healthassist.transition.regdata.RegulatoryTypes.PlanYearData;
import com.healthassist.transition.regdata.RegulatoryTypes.StateInfo;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.Optional;
import java.util.TreeMap;

/** Immutable, loaded-once view over all regulatory YAML files. */
public final class RegulatoryData {

    private final CommonData common;
    private final NavigableMap<Integer, PlanYearData> planYears;
    private final List<String> reviewItems;

    public RegulatoryData(CommonData common, Map<Integer, PlanYearData> planYears, List<String> reviewItems) {
        this.common = common;
        this.planYears = new TreeMap<>(planYears);
        this.reviewItems = List.copyOf(reviewItems);
    }

    public CommonData common() {
        return common;
    }

    public String dataVersion() {
        return common.dataVersion();
    }

    public List<Integer> planYears() {
        return List.copyOf(planYears.keySet());
    }

    /** Exact plan year if configured, otherwise the closest earlier one, otherwise the earliest. */
    public PlanYearData planYearOrNearest(int year) {
        Map.Entry<Integer, PlanYearData> floor = planYears.floorEntry(year);
        return floor != null ? floor.getValue() : planYears.firstEntry().getValue();
    }

    public boolean hasPlanYear(int year) {
        return planYears.containsKey(year);
    }

    public Optional<StateInfo> state(String code) {
        return Optional.ofNullable(code == null ? null : common.states().get(code.toUpperCase()));
    }

    /** Guideline-year key actually used for the requested year (closest earlier, else earliest). */
    public int guidelineYearFor(int year) {
        TreeMap<Integer, String> years = new TreeMap<>();
        common.fplGuidelines().keySet().forEach(k -> years.put(Integer.parseInt(k), k));
        Integer floor = years.floorKey(year);
        return floor != null ? floor : years.firstKey();
    }

    /** Key into the guideline table for a state: AK and HI have their own lines. */
    public static String guidelineRegion(String stateCode) {
        return "AK".equals(stateCode) || "HI".equals(stateCode) ? stateCode : "contiguous";
    }

    public Sourced<FplGuideline> guideline(int guidelineYear, String stateCode) {
        return common.fplGuidelines().get(String.valueOf(guidelineYear)).get(guidelineRegion(stateCode));
    }

    /** First open-enrollment window (state override, else HealthCare.gov) that has not ended by {@code today}. */
    public Optional<OpenEnrollmentWindow> nextOpenEnrollment(String stateCode, LocalDate today) {
        for (PlanYearData py : planYears.values()) {
            Sourced<DateWindow> window = py.openEnrollment().stateOverrides() != null
                    ? py.openEnrollment().stateOverrides().get(stateCode) : null;
            boolean stateSpecific = window != null;
            if (window == null) {
                window = py.openEnrollment().healthcareGov();
            }
            if (!window.value().end().isBefore(today)) {
                return Optional.of(new OpenEnrollmentWindow(py.planYear(), window, stateSpecific));
            }
        }
        return Optional.empty();
    }

    public record OpenEnrollmentWindow(int planYear, Sourced<DateWindow> window, boolean stateSpecific) {
    }

    /** Paths of every value that is unverified or has a TODO (for startup logging; contains no user data). */
    public List<String> reviewItems() {
        return reviewItems;
    }
}
