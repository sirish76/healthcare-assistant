import React from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { Link, navigate } from '../../router';

/**
 * Message for people returning from Stripe Checkout
 * (/?payment=success&session_id=... or /?payment=cancelled).
 * Dismissing clears the query string from the address bar.
 */
export default function PaymentBanner({ status }) {
  if (status !== 'success' && status !== 'cancelled') return null;
  const success = status === 'success';
  const Icon = success ? CheckCircle2 : Info;
  return (
    <div role="status" className={`border-b ${success ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-start gap-3">
        <Icon size={20} className={`shrink-0 mt-0.5 ${success ? 'text-emerald-700' : 'text-amber-800'}`} aria-hidden="true" />
        <p className={`flex-1 text-sm leading-relaxed ${success ? 'text-emerald-900' : 'text-amber-900'}`}>
          {success ? (
            <>Payment received. We're confirming your session, and you'll get a confirmation email shortly.</>
          ) : (
            <>
              Payment cancelled. You weren't charged.{' '}
              <Link to="/contact?type=paid-60" className="font-semibold underline underline-offset-2">Book again</Link>
            </>
          )}
        </p>
        <button type="button" onClick={() => navigate('/', { replace: true })}
                className="inline-flex items-center justify-center w-11 h-11 -my-2 rounded-xl hover:bg-black/5"
                aria-label="Dismiss message">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
