import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { Loader2, Maximize2, MessageSquarePlus, X } from 'lucide-react';
import { Link } from '../../router';
import { BRAND } from '../../theme';

// Loaded on first open so the chat (and its markdown renderer) isn't in the home page bundle.
const ChatInterface = lazy(() => import('../ChatInterface'));

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible chat panel: full screen on phones, side drawer on larger screens.
 * Focus is trapped while open, Esc closes, and focus returns to whatever opened it.
 */
export default function ChatDrawer({ open, onClose, conversation, onUpdateMessages, onNewConversation }) {
  const panelRef = useRef(null);
  const returnFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocus.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const textarea = panelRef.current?.querySelector('textarea');
      (textarea || panelRef.current?.querySelector('button'))?.focus();
    }, 50);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !conversation) return null;

  const iconButton = 'inline-flex items-center justify-center w-11 h-11 rounded-xl text-gray-700 hover:bg-gray-100';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-drawer-title"
        className="relative flex flex-col w-full sm:max-w-md h-full bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 pl-4 pr-2 h-16 border-b border-gray-200 shrink-0">
          <div className="min-w-0">
            <h2 id="chat-drawer-title" className="font-semibold" style={{ color: BRAND.primary }}>Ask Zume</h2>
            <p className="text-xs text-gray-600 truncate">AI assistant · can make mistakes</p>
          </div>
          <div className="flex items-center">
            <button type="button" onClick={onNewConversation} className={iconButton} aria-label="Start a new conversation" title="New conversation">
              <MessageSquarePlus size={20} aria-hidden="true" />
            </button>
            <Link to="/chat" onClick={onClose} className={iconButton} aria-label="Open full-screen chat" title="Full screen">
              <Maximize2 size={18} aria-hidden="true" />
            </Link>
            <button type="button" onClick={onClose} className={iconButton} aria-label="Close chat">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-500" aria-label="Loading chat" /></div>}>
            <ChatInterface key={conversation.id} conversation={conversation} onUpdateMessages={onUpdateMessages} compact />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
