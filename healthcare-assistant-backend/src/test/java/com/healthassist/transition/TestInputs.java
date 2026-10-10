package com.healthassist.transition;

import com.healthassist.transition.model.TransitionInput;
import com.healthassist.transition.model.TransitionInput.CareInput;
import com.healthassist.transition.model.TransitionInput.CobraInput;
import com.healthassist.transition.model.TransitionInput.CoverageDates;
import com.healthassist.transition.model.TransitionInput.IncomeInput;
import com.healthassist.transition.model.TransitionInput.Member;
import com.healthassist.transition.model.TransitionInput.OldPlanInput;
import com.healthassist.transition.model.TransitionInput.Relationship;
import com.healthassist.transition.model.TransitionInput.SpousePlanInput;
import com.healthassist.transition.model.TransitionInput.UsageLevel;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Fluent builder for test inputs. */
public final class TestInputs {

    public String zip = "27360";
    public String state = null;
    public String countyFips = null;
    public List<Member> members = new ArrayList<>(List.of(new Member(40, false, true, Relationship.SELF)));
    public CoverageDates dates = new CoverageDates(LocalDate.of(2026, 9, 15), LocalDate.of(2026, 9, 30), true,
            LocalDate.of(2026, 10, 5));
    public CobraInput cobra = new CobraInput(new BigDecimal("650"), null, null);
    public OldPlanInput oldPlan = new OldPlanInput(new BigDecimal("2000"), new BigDecimal("6000"),
            new BigDecimal("1500"), new BigDecimal("1800"));
    public IncomeInput income = income("40000");
    public CareInput care = new CareInput(UsageLevel.MODERATE, List.of(), List.of());
    public SpousePlanInput spousePlan = null;

    public static TestInputs single() {
        return new TestInputs();
    }

    public static IncomeInput income(String annual) {
        return new IncomeInput(new BigDecimal(annual), null, null, null, null, null, null, null, null);
    }

    public static IncomeInput incomeWithMonthly(String annual, String monthly) {
        return new IncomeInput(new BigDecimal(annual), null, null, null, null, null, null, null, new BigDecimal(monthly));
    }

    public TestInputs members(Member... m) {
        this.members = new ArrayList<>(List.of(m));
        return this;
    }

    public TestInputs family(int adults, int children) {
        members = new ArrayList<>();
        members.add(new Member(40, false, true, Relationship.SELF));
        if (adults > 1) {
            members.add(new Member(38, false, true, Relationship.SPOUSE_PARTNER));
        }
        for (int i = 0; i < children; i++) {
            members.add(new Member(5 + i, false, true, Relationship.CHILD));
        }
        return this;
    }

    public TransitionInput build() {
        return new TransitionInput(zip, state, countyFips, members, dates, cobra, oldPlan, income, care, spousePlan);
    }
}
