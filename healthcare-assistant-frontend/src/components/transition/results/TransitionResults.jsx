import React from 'react';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { BRAND } from '../ui';
import { shortDate } from '../format';
import OptionsComparison from './OptionsComparison';
import DeadlineTimeline from './DeadlineTimeline';
import WatchOuts from './WatchOuts';
import NextSteps from './NextSteps';

export default function TransitionResults({ result, onEdit, onClear, onAskAboutResults }) {
  const { household, location, meta } = result;
  return (
    <div className="space-y-10">
      <div className="rounded-2xl p-4 text-sm leading-relaxed" style={{ background: BRAND.warmLight, color: '#7A4B00' }} role="note">
        <strong>Estimates, not advice.</strong> Check prices, eligibility and deadlines on the official site before you decide.
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm" style={{ color: BRAND.muted }}>
        <span><strong style={{ color: BRAND.primary }}>{location.stateName}</strong>{location.countyName ? `, ${location.countyName}` : ''}</span>
        <span>Old coverage ends <strong style={{ color: BRAND.primary }}>{shortDate(household.coverageEnds)}</strong></span>
        <span>New coverage could start <strong style={{ color: BRAND.primary }}>{shortDate(household.newCoverageStart)}</strong></span>
      </div>

      <OptionsComparison result={result} />

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => onAskAboutResults(result.chatSummary)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                style={{ background: BRAND.accent }}>
          <MessageSquare size={18} /> Ask about my results
        </button>
        <button type="button" onClick={onEdit}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold border border-gray-200 bg-white"
                style={{ color: BRAND.primary }}>
          <Pencil size={16} /> Edit answers
        </button>
      </div>
      <p className="text-xs -mt-7" style={{ color: BRAND.muted }}>
        Opens the Zume chat with a summary of these numbers only, without your ZIP code, exact ages, income or prescriptions.
        That chat isn't saved to your account.
      </p>

      <div className="grid lg:grid-cols-2 gap-10">
        <DeadlineTimeline timeline={result.timeline} />
        <WatchOuts watchOuts={result.watchOuts} />
      </div>

      <NextSteps steps={result.nextSteps} />

      <footer className="border-t border-gray-100 pt-6 space-y-2 text-xs leading-relaxed" style={{ color: BRAND.muted }}>
        {result.disclaimers.map((d) => <p key={d}>{d}</p>)}
        {meta.planDataSource === 'FIXTURE' && <p><strong>Plan prices shown are sample data, not real quotes.</strong></p>}
        {meta.pendingReviewValues?.length > 0 && (
          <p>Some regulatory figures used here are still being verified (data version {meta.dataVersion}).</p>
        )}
        <button type="button" onClick={onClear}
                className="inline-flex items-center gap-1.5 mt-2 font-semibold text-red-600 hover:text-red-700">
          <Trash2 size={14} /> Clear my info
        </button>
      </footer>
    </div>
  );
}
