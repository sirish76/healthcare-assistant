import React from 'react';

export { BRAND } from '../../theme';
import { BRAND } from '../../theme';

export const inputClass =
  'w-full min-h-[48px] px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-base focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-600/40 transition-all';

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium mb-1.5" style={{ color: BRAND.primary }}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs mt-1.5" style={{ color: BRAND.muted }}>{hint}</p>}
      {error && <p className="text-xs mt-1.5 text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export function MoneyInput({ id, value, onChange, placeholder = '0', ...rest }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-8`}
        autoComplete="off"
        {...rest}
      />
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 min-h-[44px] text-sm cursor-pointer select-none" style={{ color: BRAND.text }}>
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-teal-700"
      />
      {label}
    </label>
  );
}

export function Choice({ options, value, onChange, name }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            type="button"
            key={o.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium border transition-all text-left"
            style={
              active
                ? { background: BRAND.accentLight, borderColor: BRAND.accent, color: BRAND.primary }
                : { background: '#fff', borderColor: '#E2E8F0', color: BRAND.muted }
            }
          >
            {o.label}
            {o.hint && <span className="block text-xs font-normal mt-0.5" style={{ color: BRAND.muted }}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-bold" style={{ color: BRAND.primary }}>
        {children}
      </h2>
      {sub && <p className="text-sm mt-1" style={{ color: BRAND.muted }}>{sub}</p>}
    </div>
  );
}
