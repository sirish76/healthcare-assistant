import React from 'react';
import { MessageCircle } from 'lucide-react';
import { BRAND } from '../../theme';

/**
 * Floating "Ask a question" button on tablet and desktop, on every page except the
 * full-screen chat. On phones the same entry point lives in the site header so it
 * never covers form fields or the main call to action.
 */
export default function ChatLauncher({ onOpen, raised = false, hidden = false }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={`${hidden ? 'hidden' : 'hidden sm:inline-flex'} fixed right-4 sm:right-6 z-30 items-center gap-2 min-h-[52px] pl-4 pr-5 rounded-full text-white text-sm font-semibold shadow-xl hover:shadow-2xl transition-all focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#1B3A5C] ${raised ? 'bottom-24' : 'bottom-4 sm:bottom-6'}`}
      style={{ background: BRAND.primary, marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <MessageCircle size={20} aria-hidden="true" />
      Ask a question
    </button>
  );
}
