import React, { useEffect, useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { inputClass, BRAND } from '../ui';

/**
 * Debounced search-and-pick list (prescriptions, doctors). Searches go to our
 * backend by POST; selections stay in the wizard state only.
 */
export default function LookupPicker({ id, label, placeholder, search, selected, onChange, idKey, describe, max = 20 }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      search(q)
        .then((res) => {
          if (cancelled) return;
          setNotice(res.available ? null : res.message || 'Search is not available right now.');
          setResults(res.results || []);
        })
        .catch(() => !cancelled && setNotice('Search is not available right now.'))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, search]);

  const add = (item) => {
    if (selected.some((s) => s[idKey] === item[idKey]) || selected.length >= max) return;
    onChange([...selected, item]);
    setQuery('');
    setResults([]);
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: BRAND.primary }}>{label}</label>
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input id={id} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}
               className={`${inputClass} pl-10`} autoComplete="off" role="combobox" aria-expanded={results.length > 0}
               aria-controls={`${id}-results`} />
        {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
      </div>
      {notice && <p className="text-xs mt-1.5" style={{ color: BRAND.muted }}>{notice}</p>}
      {results.length > 0 && (
        <ul id={`${id}-results`} role="listbox" className="mt-1 max-h-56 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.slice(0, 10).map((r) => (
            <li key={r[idKey]}>
              <button type="button" role="option" aria-selected="false" onClick={() => add(r)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50">
                {describe(r)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selected.map((s) => (
            <span key={s[idKey]} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: BRAND.accentLight, color: BRAND.primary }}>
              {s.name}
              <button type="button" aria-label={`Remove ${s.name}`} onClick={() => onChange(selected.filter((x) => x[idKey] !== s[idKey]))}
                      className="p-0.5 rounded-full hover:bg-white/60">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
