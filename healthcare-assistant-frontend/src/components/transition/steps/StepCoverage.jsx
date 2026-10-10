import React from 'react';
import { Field, MoneyInput, Toggle, Choice, SectionTitle, inputClass } from '../ui';

export default function StepCoverage({ data, update, errors }) {
  return (
    <div className="space-y-6">
      <SectionTitle sub="Every deadline is counted from the day your old coverage ends.">
        Your old coverage and COBRA
      </SectionTitle>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Last day of coverage" htmlFor="lastDay" error={errors.lastDayOfCoverage}
               hint="Often the last day of the month you leave. Check with HR.">
          <input id="lastDay" type="date" value={data.lastDayOfCoverage}
                 onChange={(e) => update({ lastDayOfCoverage: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Job end date" htmlFor="jobEnd" hint="If you don't know the coverage end date, we'll estimate it from this.">
          <input id="jobEnd" type="date" value={data.jobEndDate}
                 onChange={(e) => update({ jobEndDate: e.target.value })} className={inputClass} />
        </Field>
      </div>

      <div className="space-y-3">
        <Toggle id="noticeReceived" checked={data.cobraNoticeReceived}
                onChange={(v) => update({ cobraNoticeReceived: v })} label="My COBRA election notice has arrived" />
        {data.cobraNoticeReceived && (
          <Field label="Date on the notice" htmlFor="noticeDate" hint="Your 60-day election window counts from this date or from when coverage ends, whichever is later.">
            <input id="noticeDate" type="date" value={data.cobraNoticeDate}
                   onChange={(e) => update({ cobraNoticeDate: e.target.value })} className={`${inputClass} sm:max-w-xs`} />
          </Field>
        )}
      </div>

      <Field label="What would COBRA cost?">
        <Choice
          name="COBRA cost source"
          value={data.cobraPriceSource}
          onChange={(v) => update({ cobraPriceSource: v })}
          options={[
            { value: 'notice', label: 'I have the price', hint: 'From the COBRA notice' },
            { value: 'paycheck', label: 'Estimate it', hint: 'From my old paycheck deduction' },
            { value: 'unknown', label: "I don't know yet" },
          ]}
        />
      </Field>

      {data.cobraPriceSource === 'notice' && (
        <Field label="Monthly COBRA premium for everyone you'd cover" htmlFor="cobraPremium" error={errors.cobraMonthlyPremium}>
          <MoneyInput id="cobraPremium" value={data.cobraMonthlyPremium} onChange={(v) => update({ cobraMonthlyPremium: v })} />
        </Field>
      )}
      {data.cobraPriceSource === 'paycheck' && (
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Health insurance deduction per paycheck" htmlFor="deduction" error={errors.paycheckDeduction}
                 hint="Your employer paid most of the premium. COBRA usually costs several times this.">
            <MoneyInput id="deduction" value={data.paycheckDeduction} onChange={(v) => update({ paycheckDeduction: v })} />
          </Field>
          <Field label="How often you were paid" htmlFor="freq">
            <select id="freq" value={data.payFrequency} onChange={(e) => update({ payFrequency: e.target.value })} className={inputClass}>
              <option value="WEEKLY">Weekly</option>
              <option value="BIWEEKLY">Every two weeks</option>
              <option value="SEMIMONTHLY">Twice a month</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}
