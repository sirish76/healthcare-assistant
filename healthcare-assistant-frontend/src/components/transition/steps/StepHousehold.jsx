import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Field, Toggle, SectionTitle, inputClass, BRAND } from '../ui';
import { newMember } from '../wizardState';
import { lookupLocation } from '../../../services/transitionApi';

const STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'], ['CO', 'Colorado'],
  ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'],
  ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'],
  ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'],
  ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'],
  ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
  ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

const RELATIONSHIPS = [
  ['SELF', 'Me'], ['SPOUSE_PARTNER', 'Spouse or partner'], ['CHILD', 'Child'], ['OTHER_DEPENDENT', 'Other dependent'],
];

export default function StepHousehold({ data, update, errors }) {
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const lastZip = useRef(data.location ? data.zip : null);

  useEffect(() => {
    if (!/^\d{5}$/.test(data.zip) || data.zip === lastZip.current) return;
    lastZip.current = data.zip;
    let cancelled = false;
    setLooking(true);
    setLookupError(null);
    lookupLocation(data.zip)
      .then((loc) => {
        if (cancelled) return;
        const only = loc.counties.length === 1 ? loc.counties[0].fips : '';
        update({ location: loc, state: loc.state, countyFips: only });
      })
      .catch(() => {
        if (cancelled) return;
        update({ location: null, state: '', countyFips: '' });
        setLookupError("We couldn't match that ZIP code. Choose your state below.");
      })
      .finally(() => !cancelled && setLooking(false));
    return () => {
      cancelled = true;
    };
  }, [data.zip]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMember = (i, patch) =>
    update({ members: data.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const counties = data.location?.counties || [];

  return (
    <div className="space-y-6">
      <SectionTitle sub="We use your ZIP code to find your state's rules and plans. Nothing you enter is saved.">
        Where you live and who needs coverage
      </SectionTitle>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="ZIP code" htmlFor="zip" error={errors.zip}>
          <div className="relative">
            <input
              id="zip"
              inputMode="numeric"
              maxLength={5}
              value={data.zip}
              onChange={(e) => update({ zip: e.target.value.replace(/\D/g, '') })}
              className={inputClass}
              placeholder="27360"
              autoComplete="postal-code"
            />
            {looking && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
          </div>
        </Field>
        <Field label="State" htmlFor="state" error={errors.state || lookupError}
               hint={data.location ? `Enrollment through ${data.location.exchangeName}` : null}>
          <select id="state" value={data.state} onChange={(e) => update({ state: e.target.value })} className={inputClass}>
            <option value="">Choose…</option>
            {STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </Field>
      </div>

      {counties.length > 1 && (
        <Field label="County" htmlFor="county" error={errors.countyFips} hint="Your ZIP code spans more than one county.">
          <select id="county" value={data.countyFips} onChange={(e) => update({ countyFips: e.target.value })} className={inputClass}>
            <option value="">Choose…</option>
            {counties.map((c) => <option key={c.fips} value={c.fips}>{c.name}</option>)}
          </select>
        </Field>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-1" style={{ color: BRAND.primary }}>Your household</h3>
        <p className="text-xs mb-3" style={{ color: BRAND.muted }}>
          Include everyone on your tax return. Ages set prices; tobacco use can raise them.
        </p>
        {errors.members && <p className="text-xs mb-2 text-red-600" role="alert">{errors.members}</p>}
        <div className="space-y-3">
          {data.members.map((m, i) => (
            <div key={i} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60">
              <div className="grid grid-cols-2 sm:grid-cols-[1fr_7rem_auto] gap-3 items-end">
                <Field label={i === 0 ? 'Who' : null} htmlFor={`rel-${i}`}>
                  <select id={`rel-${i}`} aria-label="Relationship" value={m.relationship}
                          onChange={(e) => setMember(i, { relationship: e.target.value })} className={inputClass}>
                    {RELATIONSHIPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label={i === 0 ? 'Age' : null} htmlFor={`age-${i}`} error={errors[`members.${i}.age`]}>
                  <input id={`age-${i}`} aria-label="Age" inputMode="numeric" value={m.age} maxLength={3}
                         onChange={(e) => setMember(i, { age: e.target.value.replace(/\D/g, '') })} className={inputClass} />
                </Field>
                {data.members.length > 1 && (
                  <button type="button" onClick={() => update({ members: data.members.filter((_, j) => j !== i) })}
                          className="p-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 justify-self-end"
                          aria-label="Remove person">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3">
                <Toggle id={`covered-${i}`} checked={m.wasCovered} onChange={(v) => setMember(i, { wasCovered: v })}
                        label="Was on the plan I'm losing" />
                <Toggle id={`tobacco-${i}`} checked={m.usesTobacco} onChange={(v) => setMember(i, { usesTobacco: v })}
                        label="Uses tobacco" />
              </div>
            </div>
          ))}
        </div>
        {data.members.length < 12 && (
          <button type="button"
                  onClick={() => update({ members: [...data.members, newMember(data.members.length === 1 ? 'SPOUSE_PARTNER' : 'CHILD')] })}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: BRAND.accent }}>
            <Plus size={16} /> Add a person
          </button>
        )}
      </div>
    </div>
  );
}
