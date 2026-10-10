import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, Trash2 } from 'lucide-react';
import { BRAND } from './ui';
import {
  STEPS, defaultWizard, loadWizard, saveWizard, clearWizard, validateStep, buildRequest, stepForField,
} from './wizardState';
import { analyzeCoverage } from '../../services/transitionApi';
import StepHousehold from './steps/StepHousehold';
import StepCoverage from './steps/StepCoverage';
import StepIncome from './steps/StepIncome';
import StepCare from './steps/StepCare';
import StepSpouse from './steps/StepSpouse';
import TransitionResults from './results/TransitionResults';

const STEP_COMPONENTS = [StepHousehold, StepCoverage, StepIncome, StepCare, StepSpouse];

/**
 * "Lost your job? Compare your coverage options."
 * No account needed. Answers are kept in sessionStorage only; results are kept
 * in memory and disappear on reload or "Clear my info".
 */
export default function TransitionFlow({ onBack, onAskAboutResults }) {
  const [initial] = useState(() => loadWizard());
  const [step, setStep] = useState(initial?.step ?? 0);
  const [data, setData] = useState(initial?.data ?? defaultWizard());
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    saveWizard(step, data);
  }, [step, data]);

  const update = (patch) => setData((d) => ({ ...d, ...patch }));

  const goTo = (i) => {
    setErrors({});
    setStep(i);
    window.scrollTo(0, 0);
  };

  const next = async () => {
    const e = validateStep(STEPS[step].id, data);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (step < STEPS.length - 1) {
      goTo(step + 1);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      setResult(await analyzeCoverage(buildRequest(data)));
      window.scrollTo(0, 0);
    } catch (err) {
      const body = err.response?.data;
      if (body?.error === 'invalid_input') {
        setSubmitError(body.message || 'Some answers need a fix.');
        goTo(stepForField(body.fields?.[0]));
      } else {
        setSubmitError("We couldn't calculate your options right now. Please try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clearAll = () => {
    clearWizard();
    setData(defaultWizard());
    setResult(null);
    setErrors({});
    setSubmitError(null);
    setStep(0);
    window.scrollTo(0, 0);
  };

  const StepComponent = STEP_COMPONENTS[step];

  return (
    <div className="min-h-screen" style={{ background: BRAND.bg }}>
      <header className="px-6 pt-8 pb-10" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, #24507A)` }}>
        <div className="max-w-5xl mx-auto">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium mb-6"
                  style={{ color: 'rgba(255,255,255,0.8)' }}>
            <ArrowLeft size={16} /> Back to home
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Lost your job? Compare your coverage options.
          </h1>
          <p className="mt-3 text-base max-w-2xl" style={{ color: 'rgba(255,255,255,0.8)' }}>
            See COBRA, Marketplace plans, Medicaid/CHIP and a spouse's or partner's plan side by side, with your personal deadlines.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <ShieldCheck size={14} style={{ color: BRAND.accent }} /> No account needed. Your answers stay in this browser tab and aren't saved.
          </p>
        </div>
      </header>

      <main className="px-6 -mt-6 pb-16">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl border border-gray-100 p-6 md:p-10">
          {result ? (
            <TransitionResults
              result={result}
              onEdit={() => { setResult(null); goTo(0); }}
              onClear={clearAll}
              onAskAboutResults={onAskAboutResults}
            />
          ) : (
            <>
              <nav aria-label="Progress" className="mb-8">
                <ol className="flex gap-2">
                  {STEPS.map((s, i) => (
                    <li key={s.id} className="flex-1">
                      <button type="button" onClick={() => i < step && goTo(i)} disabled={i >= step}
                              aria-current={i === step ? 'step' : undefined} aria-label={`Step ${i + 1}: ${s.title}`}
                              className="w-full h-1.5 rounded-full transition-all"
                              style={{ background: i <= step ? BRAND.accent : '#E2E8F0', cursor: i < step ? 'pointer' : 'default' }} />
                    </li>
                  ))}
                </ol>
                <p className="text-xs mt-2" style={{ color: BRAND.muted }}>Step {step + 1} of {STEPS.length}</p>
              </nav>

              <form onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
                <StepComponent data={data} update={update} errors={errors} />

                {submitError && (
                  <div className="mt-6 text-sm text-red-600 bg-red-50 p-3 rounded-xl" role="alert">{submitError}</div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 mt-10">
                  <div className="flex gap-3">
                    {step > 0 && (
                      <button type="button" onClick={() => goTo(step - 1)}
                              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-full text-sm font-semibold border border-gray-200"
                              style={{ color: BRAND.primary }}>
                        <ArrowLeft size={16} /> Back
                      </button>
                    )}
                    <button type="button" onClick={clearAll}
                            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-sm font-medium text-gray-500 hover:text-red-600">
                      <Trash2 size={15} /> Clear my info
                    </button>
                  </div>
                  <button type="submit" disabled={submitting}
                          className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold text-white shadow-lg disabled:opacity-60"
                          style={{ background: `linear-gradient(135deg, ${BRAND.accent}, #1B8A7E)` }}>
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {step < STEPS.length - 1 ? 'Continue' : 'Compare my options'}
                    {!submitting && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
