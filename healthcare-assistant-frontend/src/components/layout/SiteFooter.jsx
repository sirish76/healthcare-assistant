import React from 'react';
import { Link } from '../../router';
import { BRAND } from '../../theme';

export default function SiteFooter() {
  return (
    <footer className="text-sm" style={{ background: BRAND.primary, color: '#E2E8F0' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="text-lg font-bold text-white">Zumanely</p>
          <p className="mt-3 leading-relaxed max-w-md">
            Free help comparing your health coverage options after a job loss.
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="font-semibold text-white mb-3">Get help</h2>
          <ul className="space-y-1">
            {[
              ['/compare', 'Compare my options'],
              ['/chat', 'Ask a question'],
              ['/contact', 'Talk to a person'],
              ['/more', 'More ways we help'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="inline-flex items-center min-h-[44px] underline-offset-4 hover:underline">{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="font-semibold text-white mb-3">Contact</h2>
          <p className="leading-loose">
            zumanely0@gmail.com<br />
            (408) 982-6644
          </p>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-3 text-xs leading-relaxed" style={{ color: '#CBD5E1' }}>
          <p>
            Zumanely gives estimates and general information, not insurance, tax, legal or medical advice. We don't sell
            insurance or earn commissions. Confirm prices, eligibility and deadlines with HealthCare.gov, your state's
            exchange or your state Medicaid office before you decide.
          </p>
          <p>
            The coverage comparison doesn't store your answers. Chat conversations are saved only if you sign in. Our AI
            assistant can make mistakes.
          </p>
          <p>© {new Date().getFullYear()} Zumanely</p>
        </div>
      </div>
    </footer>
  );
}
