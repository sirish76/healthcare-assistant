import React from 'react';
import { BRAND } from '../ui';
import { shortDate } from '../format';

const STATUS = {
  PASSED: { label: 'Passed', color: '#64748B' },
  OPEN: { label: 'Open now', color: '#11695F' },
  UPCOMING: { label: 'Upcoming', color: BRAND.primary },
  ONGOING: { label: 'Any time', color: '#11695F' },
  UNKNOWN: { label: 'Not announced', color: '#64748B' },
};

export default function DeadlineTimeline({ timeline, title = 'Your deadlines', headingLevel = 2, idPrefix = '' }) {
  const H = `h${headingLevel}`;
  return (
    <section aria-labelledby={`${idPrefix}timeline-heading`}>
      <H id={`${idPrefix}timeline-heading`} className="text-lg font-bold mb-4" style={{ color: BRAND.primary }}>{title}</H>
      <ol className="relative border-l-2 border-gray-100 ml-2 space-y-5">
        {timeline.map((t) => {
          const s = STATUS[t.status] || STATUS.UNKNOWN;
          const urgent = t.status !== 'PASSED' && t.daysLeft != null && t.daysLeft <= 14;
          return (
            <li key={t.key} className="pl-6 relative">
              <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white"
                    style={{ background: urgent ? BRAND.warm : s.color }} aria-hidden="true" />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-semibold text-sm" style={{ color: t.status === 'PASSED' ? '#64748B' : BRAND.text }}>
                  {t.label}
                </span>
                <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                {t.daysLeft != null && t.status !== 'PASSED' && (
                  <span className="text-xs font-semibold" style={{ color: urgent ? '#B45309' : BRAND.muted }}>
                    {t.daysLeft === 0 ? 'Today' : `${t.daysLeft} day${t.daysLeft === 1 ? '' : 's'} left`}
                  </span>
                )}
              </div>
              {(t.date || t.windowStart) && (
                <div className="text-sm mt-0.5" style={{ color: BRAND.primary }}>
                  {t.windowStart && t.date ? `${shortDate(t.windowStart)} – ${shortDate(t.date)}` : shortDate(t.date)}
                  {t.estimated && <span className="text-xs ml-2" style={{ color: BRAND.muted }}>(estimate)</span>}
                </div>
              )}
              <p className="text-xs mt-1 leading-relaxed" style={{ color: BRAND.muted }}>{t.detail}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
