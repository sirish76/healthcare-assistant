import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../router';
import { BRAND } from '../../theme';

/** Sign-in button / account menu. Moved here from the old LandingPage navbar so every page can use it. */
export default function UserMenu({ isMobile = false, onNavigate }) {
  const { user, signIn, signOut, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    const onClick = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [menuOpen]);

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      await signIn();
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) return null;

  if (user) {
    return (
      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={`flex items-center gap-2.5 min-h-[44px] px-3 rounded-full text-gray-700 hover:bg-gray-50 ${isMobile ? 'w-full' : ''}`}
        >
          {user.pictureUrl ? (
            <img src={user.pictureUrl} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: BRAND.accent }}>
              <User size={16} className="text-white" aria-hidden="true" />
            </span>
          )}
          <span className="text-sm font-medium truncate max-w-[140px]">{user.name || user.email}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>

        {menuOpen && (
          <div role="menu" className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 z-50">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-600 truncate mt-0.5">{user.email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); onNavigate?.(); navigate('/profile'); }}
              className="w-full text-left px-4 min-h-[44px] text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
            >
              <User size={14} aria-hidden="true" /> My profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); signOut(); }}
              className="w-full text-left px-4 min-h-[44px] text-sm text-red-700 hover:bg-red-50 flex items-center gap-2.5"
            >
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={signingIn}
      className={`flex items-center justify-center gap-2.5 min-h-[44px] px-5 rounded-full text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 ${isMobile ? 'w-full' : ''} ${signingIn ? 'opacity-60 cursor-wait' : ''}`}
    >
      {signingIn ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      )}
      {signingIn ? 'Signing in…' : 'Sign in'}
    </button>
  );
}
