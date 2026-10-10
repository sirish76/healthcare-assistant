import React, { useSyncExternalStore } from 'react';

// Minimal History-API router (no dependency). nginx already serves index.html
// for every path, so deep links and the back button work.

const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

const snapshot = () => window.location.pathname + window.location.search + window.location.hash;

export function navigate(to, { replace = false } = {}) {
  if (to === snapshot()) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
  emit();
}

/** Current location as {path, search, hash, query}. Re-renders on navigation. */
export function useLocation() {
  const href = useSyncExternalStore(subscribe, snapshot, () => '/');
  const url = new URL(href, 'http://local');
  return {
    path: url.pathname.replace(/\/+$/, '') || '/',
    search: url.search,
    hash: url.hash,
    query: url.searchParams,
    href,
  };
}

/** In-app link: a real <a href> (works with new-tab, keyboard, screen readers), navigates without reload. */
export function Link({ to, onClick, children, ...rest }) {
  const handle = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== '_self') return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  );
}

// Anchors from the old single-page landing now live on /more.
const LEGACY_HASHES = { '#about': '/more#about', '#services': '/more#services', '#contact': '/more#contact' };

/**
 * Normalizes legacy URLs. Returns the replacement URL, or null if none is needed.
 * Stripe's return URLs (/?payment=...&session_id=...) are deliberately left alone.
 */
export function legacyRedirect(path, search, hash) {
  if (path === '/transition') return `/compare${search}${hash}`;
  // zumanely.ai used to serve the app under /app behind a static landing page.
  if (path === '/app' || path.startsWith('/app/')) return `${path.slice(4) || '/'}${search}${hash}`;
  if (path === '/' && LEGACY_HASHES[hash]) return LEGACY_HASHES[hash];
  return null;
}
