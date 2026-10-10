import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { BRAND } from '../ui';
import { shortDate } from '../format';

/** Checklist ticks are kept in memory only. */
export default function NextSteps({ steps }) {
  const [done, setDone] = useState({});
  return (
    <section aria-labelledby="steps-heading">
      <h2 id="steps-heading" className="text-lg font-bold mb-4" style={{ color: BRAND.primary }}>Next steps</h2>
      <ol className="space-y-3">
        {steps.map((s) => (
          <li key={s.key} className="flex gap-3 p-4 rounded-2xl border border-gray-100 bg-white">
            <input type="checkbox" id={`step-${s.key}`} checked={!!done[s.key]}
                   onChange={(e) => setDone({ ...done, [s.key]: e.target.checked })}
                   className="w-4 h-4 mt-1 accent-teal-600 shrink-0" />
            <div className="min-w-0">
              <label htmlFor={`step-${s.key}`} className="text-sm font-semibold cursor-pointer"
                     style={{ color: done[s.key] ? '#64748B' : BRAND.text, textDecoration: done[s.key] ? 'line-through' : 'none' }}>
                {s.title}
              </label>
              {s.dueBy && <span className="ml-2 text-xs font-semibold" style={{ color: '#B45309' }}>by {shortDate(s.dueBy)}</span>}
              <p className="text-xs mt-1 leading-relaxed" style={{ color: BRAND.muted }}>{s.body}</p>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1 text-xs font-semibold mt-1.5" style={{ color: BRAND.accent }}>
                  {s.urlLabel || s.url} <ExternalLink size={11} />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
