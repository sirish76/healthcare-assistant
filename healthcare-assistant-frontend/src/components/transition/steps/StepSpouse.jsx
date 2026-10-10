import React from 'react';
import { Field, MoneyInput, Choice, SectionTitle, BRAND } from '../ui';

export default function StepSpouse({ data, update, errors }) {
  return (
    <div className="space-y-6">
      <SectionTitle sub="Losing your coverage lets you join a spouse's or partner's job-based plan, usually within 30 days.">
        Spouse's or partner's plan
      </SectionTitle>

      <Field label="Does a spouse or partner have job-based coverage your family could join?">
        <Choice
          name="Spouse plan available"
          value={data.spouseAvailable ? 'yes' : 'no'}
          onChange={(v) => update({ spouseAvailable: v === 'yes' })}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No / not sure' },
          ]}
        />
      </Field>

      {data.spouseAvailable && (
        <>
          <Field label="What they'd pay per month to cover the family" htmlFor="spPremium" error={errors.spouseMonthlyPremium}
                 hint="Their total cost for family coverage, from HR or the benefits site. We also use it to check whether it blocks Marketplace subsidies.">
            <MoneyInput id="spPremium" value={data.spouseMonthlyPremium} onChange={(v) => update({ spouseMonthlyPremium: v })} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Plan deductible (optional)" htmlFor="spDed" error={errors.spouseDeductible}>
              <MoneyInput id="spDed" value={data.spouseDeductible} onChange={(v) => update({ spouseDeductible: v })} />
            </Field>
            <Field label="Out-of-pocket maximum (optional)" htmlFor="spOop" error={errors.spouseOopMax}>
              <MoneyInput id="spOop" value={data.spouseOopMax} onChange={(v) => update({ spouseOopMax: v })} />
            </Field>
          </div>
        </>
      )}

      <p className="text-xs" style={{ color: BRAND.muted }}>
        Next, we'll compare every option. Your answers are used only to calculate the results and aren't saved.
      </p>
    </div>
  );
}
