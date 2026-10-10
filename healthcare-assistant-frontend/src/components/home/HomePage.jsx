import React, { useRef } from 'react';
import { ArrowRight, CalendarClock, ClipboardList, Columns3, Landmark, Lock, MessageCircle, Scale, ShieldCheck } from 'lucide-react';
import { Link } from '../../router';
import { BRAND, primaryButton } from '../../theme';
import OptionsComparison from '../transition/results/OptionsComparison';
import DeadlineTimeline from '../transition/results/DeadlineTimeline';
import { SAMPLE_RESULT } from './sampleResult';
import PaymentBanner from './PaymentBanner';
import StickyMobileCta from './StickyMobileCta';

const DEADLINES = [
  {
    title: '60 days to decide on COBRA',
    body: 'You have 60 days from your COBRA notice, or from when your coverage ends if that’s later, to sign up. Coverage is backdated, but the first payment is due within 45 days of signing up.',
  },
  {
    title: '60 days to pick a Marketplace plan',
    body: 'Losing job-based coverage opens a window from 60 days before to 60 days after your coverage ends. Miss it, and you may have to wait for open enrollment in November.',
  },
  {
    title: 'Dropping COBRA later can lock you out',
    body: 'If you choose COBRA and later cancel it or stop paying, that doesn’t open a new Marketplace window. You could be stuck until open enrollment, so compare before you decide.',
  },
];

const STEPS = [
  { Icon: ClipboardList, title: 'Answer a few questions', body: 'ZIP code, household, income and coverage dates. About 5 minutes, no account.' },
  { Icon: Columns3, title: 'See your options side by side', body: 'COBRA, Marketplace plans, Medicaid/CHIP and a spouse’s plan, with estimated monthly and total costs.' },
  { Icon: CalendarClock, title: 'Get your deadlines and next steps', body: 'A personal timeline and a checklist with links to the official sites to enroll.' },
];

const WHY = [
  { Icon: Scale, title: 'Neutral', body: 'We don’t sell insurance or earn commissions, so we have no reason to steer you toward any plan.' },
  { Icon: Lock, title: 'Private', body: 'The comparison runs without an account and doesn’t store your answers. Close the tab and they’re gone.' },
  { Icon: Landmark, title: 'Official sources', body: 'Built on official government rules and sources: enrollment rules, poverty guidelines and subsidy tables, with links to every official site you’ll need.' },
];

const FAQS = [
  {
    q: 'COBRA or a Marketplace plan: which is better?',
    a: 'It depends on your numbers. COBRA keeps your exact plan, your doctors and the deductible you’ve already met, but you usually pay the full premium plus up to 2%. A Marketplace plan can cost much less if your income qualifies for a subsidy, but its deductible starts at $0 and you’ll want to check your doctors are in its network. The comparison puts both in dollars for your situation.',
  },
  {
    q: 'What counts as income?',
    a: 'For Marketplace subsidies, it’s your household’s expected income for the whole calendar year: wages earned before your job ended, severance, unemployment benefits, a spouse’s or partner’s income and most other taxable income. Medicaid usually looks at your current monthly income instead, which can be much lower right after a job loss.',
  },
  {
    q: 'What if I find a new job mid-year?',
    a: 'Good news, and easy to handle. Update your Marketplace application as soon as possible: once you can enroll in affordable coverage through the new job, you generally can’t keep getting Marketplace subsidies. You can end a Marketplace plan or COBRA when the new coverage starts. If your income ends up higher than you estimated, you may have to pay back some of the subsidy at tax time.',
  },
  {
    q: 'What if I live in California, or another state with its own exchange?',
    a: 'California runs its own exchange, Covered California, as do several other states, including New York, New Jersey, Pennsylvania and Washington. The comparison still works out COBRA, Medicaid (Medi-Cal in California), a spouse’s plan and your deadlines, then sends you to your state’s exchange for live plan prices. Its open enrollment dates may differ from HealthCare.gov’s.',
  },
  {
    q: 'Is this advice?',
    a: 'No. It’s a free tool that gives estimates, not insurance, tax or legal advice, and we don’t sell insurance. Confirm prices, eligibility and deadlines on the official site before you decide. If you want to talk it through, you can ask our AI assistant or book time with a person.',
  },
];

function Cta({ className = '', children = 'Compare my options', ...rest }) {
  return (
    <Link to="/compare" className={`${primaryButton} ${className}`} style={{ background: BRAND.accent }} {...rest}>
      {children} <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}

function SectionHeading({ id, eyebrow, children }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: BRAND.accent }}>{eyebrow}</p>}
      <h2 id={id} className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: BRAND.primary }}>{children}</h2>
    </div>
  );
}

export default function HomePage({ paymentStatus, onOpenChat, onStickyCtaChange }) {
  const heroCtaRef = useRef(null);

  return (
    <>
      <PaymentBanner status={paymentStatus} />

      {/* 1. Hero */}
      <section aria-labelledby="hero-title" style={{ background: `linear-gradient(180deg, ${BRAND.accentLight} 0%, ${BRAND.bg} 100%)` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-3xl">
            <h1 id="hero-title" className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1]" style={{ color: BRAND.primary }}>
              Lost your job, or about to? See every health coverage option you have, in real dollars.
            </h1>
            <p className="mt-5 text-lg sm:text-xl leading-relaxed text-slate-700">
              COBRA, Marketplace plans, Medicaid and a spouse’s plan, compared side by side, with your personal deadlines.
              About 5 minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <span ref={heroCtaRef}><Cta className="w-full sm:w-auto text-lg !min-h-[56px] !px-8" /></span>
              <button type="button" onClick={onOpenChat}
                      className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-full font-semibold underline-offset-4 hover:underline"
                      style={{ color: BRAND.accent }}>
                <MessageCircle size={18} aria-hidden="true" /> Or ask a question
              </button>
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm text-slate-700">
              <ShieldCheck size={18} className="shrink-0" style={{ color: BRAND.accent }} aria-hidden="true" />
              Free. No signup. The comparison doesn’t store your answers.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Deadlines */}
      <section id="deadlines" aria-labelledby="deadlines-title" className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading id="deadlines-title" eyebrow="Know your dates">The deadlines nobody tells you about</SectionHeading>
          <ul className="grid gap-5 md:grid-cols-3">
            {DEADLINES.map((d) => (
              <li key={d.title} className="flex flex-col rounded-2xl border border-gray-200 p-6" style={{ background: BRAND.bg }}>
                <h3 className="text-lg font-semibold" style={{ color: BRAND.primary }}>{d.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-700 flex-1">{d.body}</p>
                <Link to="/compare" className="mt-5 inline-flex items-center gap-1.5 min-h-[44px] font-semibold underline-offset-4 hover:underline"
                      style={{ color: BRAND.accent }}>
                  See my deadlines <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. How it works */}
      <section id="how-it-works" aria-labelledby="how-title" className="py-16 sm:py-20" style={{ background: BRAND.bg }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading id="how-title" eyebrow="How it works">Three steps, about 5 minutes</SectionHeading>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map(({ Icon, title, body }, i) => (
              <li key={title} className="rounded-2xl bg-white border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: BRAND.primary }}>
                    {i + 1}
                  </span>
                  <Icon size={22} style={{ color: BRAND.accentBright }} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold" style={{ color: BRAND.primary }}>{title}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10"><Cta /></div>
        </div>
      </section>

      {/* 4. Sample results */}
      <section id="example" aria-labelledby="example-title" className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading id="example-title" eyebrow="What you’ll get">See your options in real dollars</SectionHeading>
          <figure className="rounded-3xl border-2 border-dashed p-4 sm:p-8" style={{ borderColor: BRAND.border }}>
            <figcaption className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold"
                        style={{ background: BRAND.warmLight, color: '#7A4B00' }}>
              Example: a fictional family of three. Every number and date here is made up.
            </figcaption>
            <OptionsComparison result={SAMPLE_RESULT} title="Example: compare your options" headingLevel={3} idPrefix="example-" />
            <div className="mt-10 max-w-xl">
              <DeadlineTimeline timeline={SAMPLE_RESULT.timeline} title="Example: your deadlines" headingLevel={3} idPrefix="example-" />
            </div>
          </figure>
          <div className="mt-10"><Cta>See my real numbers</Cta></div>
        </div>
      </section>

      {/* 5. Why Zumanely */}
      <section id="why" aria-labelledby="why-title" className="py-16 sm:py-20" style={{ background: BRAND.bg }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading id="why-title" eyebrow="Why Zumanely">On your side, and only yours</SectionHeading>
          <ul className="grid gap-5 md:grid-cols-3">
            {WHY.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-2xl bg-white border border-gray-200 p-6">
                <Icon size={26} style={{ color: BRAND.accent }} aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold" style={{ color: BRAND.primary }}>{title}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. FAQ */}
      <section id="faq" aria-labelledby="faq-title" className="py-16 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionHeading id="faq-title" eyebrow="FAQ">Common questions</SectionHeading>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-gray-200 bg-white open:shadow-sm">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none min-h-[56px] px-5 py-4 text-base font-semibold rounded-2xl"
                         style={{ color: BRAND.primary }}>
                  {f.q}
                  <span aria-hidden="true" className="shrink-0 text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-5 text-base leading-relaxed text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section aria-labelledby="closing-title" className="py-16 sm:py-20" style={{ background: BRAND.accentLight }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 id="closing-title" className="text-2xl sm:text-3xl font-bold" style={{ color: BRAND.primary }}>
            Take five minutes to see where you stand
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-700">Free, no signup, and the comparison doesn’t store your answers.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Cta className="w-full sm:w-auto" />
            <button type="button" onClick={onOpenChat}
                    className="inline-flex items-center gap-2 min-h-[48px] px-4 font-semibold underline-offset-4 hover:underline"
                    style={{ color: BRAND.primary }}>
              <MessageCircle size={18} aria-hidden="true" /> Ask a question
            </button>
          </div>
        </div>
      </section>

      <StickyMobileCta watchRef={heroCtaRef} onVisibleChange={onStickyCtaChange} />
    </>
  );
}
