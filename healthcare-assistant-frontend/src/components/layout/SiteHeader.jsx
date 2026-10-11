import React, { useEffect, useState } from 'react';
import { Menu, MessageCircle, X } from 'lucide-react';
import { Link, useLocation } from '../../router';
import { BRAND, primaryButton } from '../../theme';
import UserMenu from './UserMenu';
import Wordmark from './Wordmark';

const LINKS = [
  { to: '/compare', label: 'Compare options' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/#faq', label: 'FAQ' },
  { to: '/more', label: 'More ways we help' },
  { to: '/contact', label: 'Talk to a person' },
];

export default function SiteHeader({ onOpenChat }) {
  const [open, setOpen] = useState(false);
  const { path, hash } = useLocation();

  useEffect(() => setOpen(false), [path, hash]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isCurrent = (to) => (to === path ? 'page' : undefined);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center min-h-[44px] rounded-lg" aria-label="Zumanely home">
          <Wordmark className="h-10 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} aria-current={isCurrent(l.to)}
                      className="px-3 py-2 rounded-full text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 aria-[current=page]:font-semibold aria-[current=page]:text-[#1B3A5C]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <UserMenu />
          {path !== '/compare' && (
            <Link to="/compare" className={`${primaryButton} !min-h-[44px] !px-5 !text-sm`} style={{ background: BRAND.accent }}>
              Compare my options
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
        <button
          type="button"
          onClick={onOpenChat}
          aria-haspopup="dialog"
          aria-label="Ask a question"
          className="sm:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl hover:bg-gray-100"
          style={{ color: BRAND.primary }}
        >
          <MessageCircle size={22} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-gray-800 hover:bg-gray-100"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="lg:hidden border-t border-gray-200 bg-white">
          <ul className="px-4 py-3 space-y-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} aria-current={isCurrent(l.to)}
                      className="flex items-center min-h-[48px] px-3 rounded-xl text-base font-medium text-gray-800 hover:bg-gray-50">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
            <UserMenu isMobile onNavigate={() => setOpen(false)} />
            <Link to="/compare" className={`${primaryButton} w-full`} style={{ background: BRAND.accent }}>
              Compare my options
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
