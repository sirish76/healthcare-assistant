import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { BRAND } from '../ui';
import { money, monthName, pct } from '../format';

export const AVAILABILITY = {
  AVAILABLE: { label: 'Available', bg: '#E6F7F5', fg: '#11695F' },
  LIKELY: { label: 'Likely eligible', bg: '#E6F7F5', fg: '#11695F' },
  POSSIBLE: { label: 'Possibly eligible', bg: '#FFF8EB', fg: '#8A5A00' },
  UNKNOWN: { label: 'Check eligibility', bg: '#F1F5F9', fg: '#475569' },
  UNLIKELY: { label: 'Unlikely', bg: '#F1F5F9', fg: '#475569' },
  NOT_AVAILABLE: { label: 'Not available now', bg: '#FEF2F2', fg: '#B91C1C' },
};

export function Badge({ availability }) {
  const a = AVAILABILITY[availability] || AVAILABILITY.UNKNOWN;
  return (
    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: a.bg, color: a.fg }}>
      {a.label}
    </span>
  );
}

const COVERAGE_LABEL = { Covered: 'Covered', GenericCovered: 'Generic covered', NotCovered: 'Not covered' };

function SubsidyBox({ subsidy }) {
  if (!subsidy) return null;
  return (
    <div className="mt-2 rounded-xl p-3 text-xs leading-relaxed" style={{ background: BRAND.accentLight, color: BRAND.primary }}>
      {subsidy.eligible ? (
        <>
          <strong>Subsidy-eligible.</strong> You'd pay at most about <strong>{money(subsidy.maxMonthlyForBenchmark)}/mo</strong>{' '}
          ({subsidy.applicablePercent}% of income) for the benchmark silver plan
          {subsidy.estimatedMonthlyCredit != null && <> — an estimated {money(subsidy.estimatedMonthlyCredit)}/mo credit</>}.
        </>
      ) : (
        <>No subsidy: {subsidy.reason}.</>
      )}
    </div>
  );
}

export default function OptionsComparison({ result }) {
  const [showPlans, setShowPlans] = useState(false);
  const { options, household } = result;
  const period = `${monthName(household.newCoverageStart)}–Dec ${household.newCoverageStart.slice(0, 4)}`;
  const marketplace = options.find((o) => o.type === 'MARKETPLACE');
  const plans = marketplace?.plans || [];
  const drugNames = plans[0]?.drugCoverage?.map((d) => d.name) || [];
  const providerNames = plans[0]?.providerCoverage?.map((d) => d.name) || [];

  const rows = [
    { label: 'Monthly premium', render: (o) => (o.monthlyPremium != null ? `${money(o.monthlyPremium)}/mo` : '—') },
    { label: `Estimated total, ${period}`, hint: 'Premiums plus expected out-of-pocket', render: (o) => <strong>{money(o.periodCost)}</strong> },
    { label: 'Estimated total, 12 months', render: (o) => money(o.twelveMonthCost) },
    {
      label: 'Deductible you have already met',
      render: (o) => (o.deductibleCarriesOver ? `Carries over (${money(o.deductibleRemaining)} left)` : 'Starts over at $0'),
    },
  ];

  return (
    <section aria-labelledby="options-heading">
      <h2 id="options-heading" className="text-lg font-bold mb-1" style={{ color: BRAND.primary }}>Compare your options</h2>
      <p className="text-sm mb-4" style={{ color: BRAND.muted }}>
        Household income is about {pct(household.annualFplPercent)} of the federal poverty level. Costs are estimates for {period}.
      </p>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[640px] text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="w-44" />
              {options.map((o) => (
                <th key={o.type} scope="col" className="text-left align-top p-3 bg-white border-b border-gray-100">
                  <div className="font-semibold mb-1.5" style={{ color: BRAND.primary }}>{o.label}</div>
                  <Badge availability={o.availability} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="text-left font-medium p-3 align-top border-b border-gray-100" style={{ color: BRAND.muted }}>
                  {r.label}
                  {r.hint && <span className="block text-xs font-normal">{r.hint}</span>}
                </th>
                {options.map((o) => (
                  <td key={o.type} className="p-3 align-top border-b border-gray-100" style={{ color: BRAND.text }}>
                    {r.render(o)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row" className="text-left font-medium p-3 align-top" style={{ color: BRAND.muted }}>Details</th>
              {options.map((o) => (
                <td key={o.type} className="p-3 align-top text-xs leading-relaxed" style={{ color: BRAND.muted }}>
                  {o.availabilityReason && <p className="mb-1.5">{o.availabilityReason}</p>}
                  {o.costBasis && <p className="mb-1.5 italic">{o.costBasis}</p>}
                  <ul className="list-disc pl-4 space-y-1">
                    {o.notes.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                  {o.type === 'MARKETPLACE' && <SubsidyBox subsidy={o.subsidy} />}
                  {o.type === 'MEDICAID_CHIP' && o.members?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {o.members.map((m) => (
                        <li key={m.memberIndex}>
                          {m.group === 'CHILD' ? 'Child' : m.group === 'MEDICARE_AGE' ? 'Adult 65+' : 'Adult'}, age {m.age}:{' '}
                          <span style={{ color: AVAILABILITY[m.availability]?.fg }}>{AVAILABILITY[m.availability]?.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {o.handoff && (
                    <a href={o.handoff.url} target="_blank" rel="noopener noreferrer"
                       className="mt-2 inline-flex items-center gap-1 font-semibold" style={{ color: BRAND.accent }}>
                      {o.type === 'MEDICAID_CHIP' ? 'Apply' : 'See plans'} on {o.handoff.name} <ExternalLink size={12} />
                    </a>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {plans.length > 0 && (
        <div className="mt-4">
          <button type="button" onClick={() => setShowPlans(!showPlans)} aria-expanded={showPlans}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: BRAND.accent }}>
            {showPlans ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showPlans ? 'Hide' : 'Show'} {plans.length} Marketplace plans
          </button>
          {showPlans && (
            <div className="overflow-x-auto mt-3">
              <table className="w-full min-w-[720px] text-xs">
                <thead>
                  <tr className="text-left" style={{ color: BRAND.muted }}>
                    <th className="p-2">Plan</th>
                    <th className="p-2">Metal</th>
                    <th className="p-2">Premium after subsidy</th>
                    <th className="p-2">Deductible</th>
                    <th className="p-2">Out-of-pocket max</th>
                    <th className="p-2">Est. total, {period}</th>
                    {drugNames.map((n) => <th key={n} className="p-2">{n}</th>)}
                    {providerNames.map((n) => <th key={n} className="p-2">{n}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.id} className="border-t border-gray-100" style={{ color: BRAND.text }}>
                      <td className="p-2">
                        <div className="font-medium">{p.name}</div>
                        <div style={{ color: BRAND.muted }}>{p.issuer} · {p.planType}</div>
                      </td>
                      <td className="p-2">{p.metalLevel}</td>
                      <td className="p-2">
                        {money(p.monthlyPremiumAfterCredit)}/mo
                        {p.monthlyPremiumAfterCredit !== p.monthlyPremium && (
                          <span className="block line-through" style={{ color: BRAND.muted }}>{money(p.monthlyPremium)}</span>
                        )}
                      </td>
                      <td className="p-2">{money(p.deductible)}</td>
                      <td className="p-2">{money(p.outOfPocketMax)}</td>
                      <td className="p-2 font-semibold">{money(p.periodCost)}</td>
                      {p.drugCoverage.map((d) => <td key={d.id} className="p-2">{COVERAGE_LABEL[d.status] || 'Unknown'}</td>)}
                      {p.providerCoverage.map((d) => <td key={d.id} className="p-2">{COVERAGE_LABEL[d.status] || 'Unknown'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
