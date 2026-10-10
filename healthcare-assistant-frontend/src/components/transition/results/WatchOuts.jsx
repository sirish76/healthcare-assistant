import React from 'react';
import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { BRAND } from '../ui';

const STYLE = {
  URGENT: { bg: '#FEF2F2', border: '#FECACA', fg: '#991B1B', Icon: AlertOctagon },
  WARNING: { bg: '#FFF8EB', border: '#FDE68A', fg: '#8A5A00', Icon: AlertTriangle },
  INFO: { bg: '#F8FAFC', border: '#E2E8F0', fg: BRAND.primary, Icon: Info },
};

export default function WatchOuts({ watchOuts }) {
  return (
    <section aria-labelledby="watch-heading">
      <h2 id="watch-heading" className="text-lg font-bold mb-4" style={{ color: BRAND.primary }}>Watch out for</h2>
      <ul className="space-y-3">
        {watchOuts.map((w) => {
          const s = STYLE[w.severity] || STYLE.INFO;
          return (
            <li key={w.key} className="flex gap-3 p-4 rounded-2xl border" style={{ background: s.bg, borderColor: s.border }}>
              <s.Icon size={18} className="shrink-0 mt-0.5" style={{ color: s.fg }} aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold" style={{ color: s.fg }}>{w.title}</p>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: BRAND.text }}>{w.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
