import React, { useCallback } from 'react';
import { Field, MoneyInput, Choice, SectionTitle, BRAND } from '../ui';
import LookupPicker from './LookupPicker';
import { searchDrugs, searchProviders } from '../../../services/transitionApi';

export default function StepCare({ data, update, errors }) {
  const drugSearch = useCallback((q) => searchDrugs(q), []);
  const providerSearch = useCallback((q) => searchProviders(q, data.zip), [data.zip]);

  return (
    <div className="space-y-6">
      <SectionTitle sub="This shapes the out-of-pocket estimate. It's a rough guide, not a prediction.">
        Health care needs
      </SectionTitle>

      <Field label="How much care does your household expect for the rest of the year?">
        <Choice
          name="Expected care"
          value={data.usage}
          onChange={(v) => update({ usage: v })}
          options={[
            { value: 'LOW', label: 'Low', hint: 'Checkups, a few visits' },
            { value: 'MODERATE', label: 'Moderate', hint: 'Regular visits, ongoing prescriptions' },
            { value: 'HIGH', label: 'High', hint: 'Surgery, pregnancy, chronic condition' },
          ]}
        />
      </Field>

      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: BRAND.primary }}>Already paid on your old plan this year</h3>
        <p className="text-xs mb-3" style={{ color: BRAND.muted }}>
          COBRA keeps this progress. A new plan starts from $0. Leave blank if you're not sure.
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Plan deductible" htmlFor="oldDed" error={errors.oldDeductible}>
            <MoneyInput id="oldDed" value={data.oldDeductible} onChange={(v) => update({ oldDeductible: v })} />
          </Field>
          <Field label="Deductible met so far" htmlFor="dedMet" error={errors.deductibleMet}>
            <MoneyInput id="dedMet" value={data.deductibleMet} onChange={(v) => update({ deductibleMet: v })} />
          </Field>
          <Field label="Plan out-of-pocket maximum" htmlFor="oldOop" error={errors.oldOopMax}>
            <MoneyInput id="oldOop" value={data.oldOopMax} onChange={(v) => update({ oldOopMax: v })} />
          </Field>
          <Field label="Out-of-pocket paid so far" htmlFor="oopMet" error={errors.oopMet}>
            <MoneyInput id="oopMet" value={data.oopMet} onChange={(v) => update({ oopMet: v })} />
          </Field>
        </div>
      </div>

      <LookupPicker
        id="drugs"
        label="Prescriptions to check (optional)"
        placeholder="Start typing a drug name"
        search={drugSearch}
        selected={data.drugs}
        onChange={(drugs) => update({ drugs })}
        idKey="rxcui"
        describe={(d) => d.fullName || [d.name, d.strength, d.route].filter(Boolean).join(' ')}
      />

      <LookupPicker
        id="providers"
        label="Doctors you want to keep (optional)"
        placeholder="Doctor or clinic name"
        search={providerSearch}
        selected={data.providers}
        onChange={(providers) => update({ providers })}
        idKey="npi"
        describe={(p) => [p.name, p.specialty, p.city].filter(Boolean).join(' · ')}
      />
    </div>
  );
}
