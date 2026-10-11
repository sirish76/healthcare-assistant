import React from 'react';
import { BRAND } from '../../theme';

// Static, fictional preview of the results page for the hero. Plain HTML/CSS so it
// stays sharp at any size and adds no image weight. Numbers match sampleResult.js.
const COLUMNS = [
  { name: 'COBRA', monthly: '$1,600', total: '$11,400', deductible: 'Kept' },
  { name: 'Marketplace', monthly: '$300', total: '$4,800', deductible: 'Resets', best: true },
  { name: 'Medicaid', monthly: '$0', total: 'Kids may qualify', deductible: '—' },
];

const DEADLINES = [
  { label: 'Join spouse’s plan', left: '12 days left', urgent: true },
  { label: 'Marketplace window closes', left: '42 days left' },
  { label: 'COBRA decision due', left: '56 days left', desktopOnly: true },
];

export default function HeroPreview() {
  return (
    <figure
      className="hero-in rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 text-left"
      style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -12px rgba(27,58,92,0.18)' }}
    >
      <figcaption className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm font-semibold" style={{ color: BRAND.primary }}>
          Your options<span className="hidden sm:inline">, Jul–Dec</span>
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: BRAND.warmLight, color: '#7A4B00' }}>
          Example<span className="hidden sm:inline"> · fictional numbers</span>
        </span>
      </figcaption>

      {/* Phones: one compact tile per option */}
      <ul className="sm:hidden grid grid-cols-3 gap-2 tabular-nums" aria-label="Example options with fictional numbers">
        {COLUMNS.map((c) => (
          <li key={c.name} className="rounded-xl p-2.5"
              style={c.best ? { background: BRAND.accentLight, boxShadow: `inset 0 0 0 1px ${BRAND.accentBright}` } : { background: BRAND.bg }}>
            <p className="text-xs font-semibold" style={{ color: BRAND.primary }}>{c.name}</p>
            <p className="mt-1 text-base font-semibold" style={{ color: BRAND.text }}>
              {c.monthly}<span className="text-xs font-normal text-slate-600">/mo</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {c.total.startsWith('$') ? `${c.total} total` : c.total}
            </p>
          </li>
        ))}
      </ul>

      {/* Larger screens: comparison table */}
      <table className="hidden sm:table w-full text-sm tabular-nums">
        <caption className="sr-only">Example comparison with fictional numbers</caption>
        <thead>
          <tr>
            <td className="w-[26%]" />
            {COLUMNS.map((c) => (
              <th key={c.name} scope="col" className="pb-2 pr-2 text-left text-xs font-semibold" style={{ color: BRAND.primary }}>
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr>
            <th scope="row" className="py-2 text-left text-xs font-medium text-slate-600">Per month</th>
            {COLUMNS.map((c) => (
              <td key={c.name} className="py-2 pr-2" style={{ color: BRAND.text }}>{c.monthly}</td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="py-2 text-left text-xs font-medium text-slate-600">Est. total</th>
            {COLUMNS.map((c) => (
              <td key={c.name} className="py-2 pr-2">
                {c.best ? (
                  <span className="px-1.5 py-0.5 -mx-1.5 rounded font-semibold" style={{ background: BRAND.accentLight, color: BRAND.accent }}>
                    {c.total}
                  </span>
                ) : (
                  <span className={c.total.startsWith('$') ? 'font-semibold' : 'block text-xs leading-tight text-slate-600'} style={c.total.startsWith('$') ? { color: BRAND.text } : undefined}>
                    {c.total}
                  </span>
                )}
              </td>
            ))}
          </tr>
          <tr className="hidden sm:table-row">
            <th scope="row" className="py-2 text-left text-xs font-medium text-slate-600">Deductible</th>
            {COLUMNS.map((c) => (
              <td key={c.name} className="py-2 pr-2 text-xs text-slate-600">{c.deductible}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="mt-5 pt-4 border-t border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">Your deadlines</p>
        <ol className="space-y-2.5">
          {DEADLINES.map((d) => (
            <li key={d.label} className={`${d.desktopOnly ? 'hidden sm:flex' : 'flex'} items-center gap-3 text-sm`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.urgent ? BRAND.warm : BRAND.accentBright }} aria-hidden="true" />
              <span className="flex-1" style={{ color: BRAND.text }}>{d.label}</span>
              <span className="text-xs font-semibold" style={{ color: d.urgent ? '#B45309' : '#475569' }}>{d.left}</span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
