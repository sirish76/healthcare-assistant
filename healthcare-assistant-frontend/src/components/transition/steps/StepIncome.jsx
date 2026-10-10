import React from 'react';
import { Field, MoneyInput, Choice, SectionTitle, BRAND, inputClass } from '../ui';
import { projectedAnnualIncome, startsNextYear, newCoverageYear } from '../wizardState';
import { money } from '../format';

export default function StepIncome({ data, update, errors }) {
  const total = projectedAnnualIncome(data);
  const nextYear = startsNextYear(data);
  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <SectionTitle sub="Subsidies use your whole-year household income. Medicaid looks at what you get each month right now.">
        Household income
      </SectionTitle>

      <Choice
        name="Income entry"
        value={data.incomeMode}
        onChange={(v) => update({ incomeMode: v })}
        options={[
          { value: 'helper', label: 'Help me add it up' },
          { value: 'total', label: 'I know the yearly total' },
        ]}
      />

      {data.incomeMode === 'total' ? (
        <Field label={`Projected household income for ${thisYear}`} htmlFor="annual" error={errors.annualOverride}
               hint="Include severance, unemployment and a spouse's or partner's income.">
          <MoneyInput id="annual" value={data.annualOverride} onChange={(v) => update({ annualOverride: v })} />
        </Field>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label={`Your wages so far in ${thisYear}`} htmlFor="wages" error={errors.wagesThisYear}>
            <MoneyInput id="wages" value={data.wagesThisYear} onChange={(v) => update({ wagesThisYear: v })} />
          </Field>
          <Field label="Severance" htmlFor="severance" error={errors.severance}>
            <MoneyInput id="severance" value={data.severance} onChange={(v) => update({ severance: v })} />
          </Field>
          <Field label="Unemployment benefit per week" htmlFor="uiWeekly" error={errors.unemploymentWeekly}>
            <MoneyInput id="uiWeekly" value={data.unemploymentWeekly} onChange={(v) => update({ unemploymentWeekly: v })} />
          </Field>
          <Field label={`Weeks of unemployment expected in ${thisYear}`} htmlFor="uiWeeks" error={errors.unemploymentWeeks}>
            <input id="uiWeeks" inputMode="numeric" value={data.unemploymentWeeks} className={inputClass}
                   onChange={(e) => update({ unemploymentWeeks: e.target.value.replace(/\D/g, '') })} placeholder="0" />
          </Field>
          <Field label={`Spouse's or partner's income for ${thisYear}`} htmlFor="spouseIncome" error={errors.spouseAnnualIncome}>
            <MoneyInput id="spouseIncome" value={data.spouseAnnualIncome} onChange={(v) => update({ spouseAnnualIncome: v })} />
          </Field>
          <Field label="Other income this year" htmlFor="other" error={errors.otherAnnualIncome}
                 hint="Self-employment, interest, retirement withdrawals and similar.">
            <MoneyInput id="other" value={data.otherAnnualIncome} onChange={(v) => update({ otherAnnualIncome: v })} />
          </Field>
        </div>
      )}

      <div className="rounded-2xl px-5 py-4 text-sm" style={{ background: BRAND.accentLight, color: BRAND.primary }}>
        Projected household income for {thisYear}: <strong>{money(total)}</strong>
      </div>

      {nextYear && (
        <Field label={`Projected household income for ${newCoverageYear(data)}`} htmlFor="nextYear" error={errors.nextYearAnnualIncome}
               hint="Your new coverage would start next year, so subsidies use next year's income. Leave blank to use this year's.">
          <MoneyInput id="nextYear" value={data.nextYearAnnualIncome} onChange={(v) => update({ nextYearAnnualIncome: v })} />
        </Field>
      )}

      <Field label="Household income per month right now (optional)" htmlFor="monthly" error={errors.currentMonthlyOverride}
             hint="Leave blank and we'll use unemployment plus your spouse's and other income. Medicaid uses this number.">
        <MoneyInput id="monthly" value={data.currentMonthlyOverride} onChange={(v) => update({ currentMonthlyOverride: v })} />
      </Field>
    </div>
  );
}
