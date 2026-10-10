const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const money = (v) => (v === null || v === undefined ? '—' : usd0.format(Number(v)));

/** "2026-11-29" -> "Nov 29, 2026" without timezone shifts. */
export function shortDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

export function monthName(iso) {
  if (!iso) return '';
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

export const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(Number(v))}%`);
