// Pure helpers for the coverage-transition wizard: defaults, validation,
// request building and sessionStorage persistence.
//
// PRIVACY: in-progress answers live ONLY in sessionStorage (cleared when the
// tab closes, or by "Clear my info"). Results are never stored.

export const STORAGE_KEY = 'zumanely_coverage_transition_v1';

export const STEPS = [
  { id: 'household', title: 'Where you live and who needs coverage' },
  { id: 'coverage', title: 'Your old coverage and COBRA' },
  { id: 'income', title: 'Household income' },
  { id: 'care', title: 'Health care needs' },
  { id: 'spouse', title: "Spouse's or partner's plan" },
];

export const newMember = (relationship = 'SELF') => ({
  age: '',
  usesTobacco: false,
  wasCovered: true,
  relationship,
});

export function defaultWizard() {
  return {
    zip: '',
    state: '',
    countyFips: '',
    location: null,
    members: [newMember('SELF')],
    jobEndDate: '',
    lastDayOfCoverage: '',
    cobraNoticeReceived: false,
    cobraNoticeDate: '',
    cobraPriceSource: 'notice', // notice | paycheck | unknown
    cobraMonthlyPremium: '',
    paycheckDeduction: '',
    payFrequency: 'BIWEEKLY',
    incomeMode: 'helper', // helper | total
    annualOverride: '',
    wagesThisYear: '',
    severance: '',
    unemploymentWeekly: '',
    unemploymentWeeks: '',
    spouseAnnualIncome: '',
    otherAnnualIncome: '',
    nextYearAnnualIncome: '',
    currentMonthlyOverride: '',
    oldDeductible: '',
    oldOopMax: '',
    deductibleMet: '',
    oopMet: '',
    usage: 'MODERATE',
    drugs: [],
    providers: [],
    spouseAvailable: false,
    spouseMonthlyPremium: '',
    spouseDeductible: '',
    spouseOopMax: '',
  };
}

// ---- sessionStorage ---------------------------------------------------------

function storage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function loadWizard() {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return { step: Number(saved.step) || 0, data: { ...defaultWizard(), ...saved.data } };
  } catch {
    return null;
  }
}

export function saveWizard(step, data) {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // Storage blocked or full: the wizard still works, it just won't survive a reload.
  }
}

export function clearWizard() {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ---- numbers & dates --------------------------------------------------------

export function toNumber(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

function parseDate(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** Last day of coverage: entered, or end of the month the job ended (same rule as the backend). */
export function lossDate(data) {
  const last = parseDate(data.lastDayOfCoverage);
  if (last) return last;
  const job = parseDate(data.jobEndDate);
  if (!job) return null;
  const endOfMonth = new Date(Date.UTC(job.y, job.m, 0)).getUTCDate();
  return { y: job.y, m: job.m, d: endOfMonth };
}

/** Year new coverage would start (1st of the month after coverage ends). */
export function newCoverageYear(data) {
  const loss = lossDate(data);
  if (!loss) return null;
  return loss.m === 12 ? loss.y + 1 : loss.y;
}

export function startsNextYear(data, today = new Date()) {
  const y = newCoverageYear(data);
  return y !== null && y > today.getFullYear();
}

/** Same arithmetic as the backend's IncomeCalculator.projectedAnnual (shown live in the wizard). */
export function projectedAnnualIncome(data) {
  if (data.incomeMode === 'total') {
    const t = toNumber(data.annualOverride);
    return Number.isNaN(t) ? null : t;
  }
  const n = (v) => {
    const x = toNumber(v);
    return x === null || Number.isNaN(x) ? 0 : x;
  };
  return (
    n(data.wagesThisYear) +
    n(data.severance) +
    n(data.unemploymentWeekly) * n(data.unemploymentWeeks) +
    n(data.spouseAnnualIncome) +
    n(data.otherAnnualIncome)
  );
}

// ---- validation -------------------------------------------------------------

function checkMoney(errors, key, value, label) {
  const n = toNumber(value);
  if (n !== null && (Number.isNaN(n) || n < 0)) errors[key] = `${label} must be a dollar amount of 0 or more.`;
}

/** Returns {fieldKey: message}. Empty object means the step is valid. */
export function validateStep(stepId, data) {
  const e = {};
  if (stepId === 'household') {
    if (!/^\d{5}$/.test(data.zip || '')) e.zip = 'Enter a 5-digit ZIP code.';
    if (!data.state) e.state = 'Choose your state.';
    const counties = data.location?.counties || [];
    if (counties.length > 1 && !data.countyFips) e.countyFips = 'Choose your county.';
    if (!data.members.length) e.members = 'Add at least one person.';
    data.members.forEach((m, i) => {
      const age = toNumber(m.age);
      if (age === null || Number.isNaN(age) || !Number.isInteger(age) || age < 0 || age > 120) {
        e[`members.${i}.age`] = 'Enter an age from 0 to 120.';
      }
    });
    if (!data.members.some((m) => m.wasCovered)) e.members = 'Mark who was covered by the old plan.';
  }
  if (stepId === 'coverage') {
    if (!data.lastDayOfCoverage && !data.jobEndDate) {
      e.lastDayOfCoverage = 'Enter your last day of coverage, or your job end date.';
    }
    if (data.cobraPriceSource === 'notice') checkMoney(e, 'cobraMonthlyPremium', data.cobraMonthlyPremium, 'COBRA premium');
    if (data.cobraPriceSource === 'paycheck') checkMoney(e, 'paycheckDeduction', data.paycheckDeduction, 'Deduction');
  }
  if (stepId === 'income') {
    if (data.incomeMode === 'total') {
      const t = toNumber(data.annualOverride);
      if (t === null) e.annualOverride = 'Enter your projected household income for the year.';
      else checkMoney(e, 'annualOverride', data.annualOverride, 'Income');
    }
    ['wagesThisYear', 'severance', 'unemploymentWeekly', 'spouseAnnualIncome', 'otherAnnualIncome',
      'nextYearAnnualIncome', 'currentMonthlyOverride'].forEach((k) => checkMoney(e, k, data[k], 'This amount'));
    const weeks = toNumber(data.unemploymentWeeks);
    if (weeks !== null && (Number.isNaN(weeks) || weeks < 0 || weeks > 104)) {
      e.unemploymentWeeks = 'Enter 0 to 104 weeks.';
    }
  }
  if (stepId === 'care') {
    ['oldDeductible', 'oldOopMax', 'deductibleMet', 'oopMet'].forEach((k) => checkMoney(e, k, data[k], 'This amount'));
  }
  if (stepId === 'spouse' && data.spouseAvailable) {
    ['spouseMonthlyPremium', 'spouseDeductible', 'spouseOopMax'].forEach((k) => checkMoney(e, k, data[k], 'This amount'));
  }
  return e;
}

// ---- request ----------------------------------------------------------------

const num = (v) => {
  const n = toNumber(v);
  return n === null || Number.isNaN(n) ? null : n;
};

/** Builds the POST /api/transition/analyze body. Never includes the free-text location object. */
export function buildRequest(data) {
  const cobra =
    data.cobraPriceSource === 'notice'
      ? { monthlyPremium: num(data.cobraMonthlyPremium) }
      : data.cobraPriceSource === 'paycheck'
        ? { paycheckDeduction: num(data.paycheckDeduction), payFrequency: data.payFrequency }
        : null;
  const helper = data.incomeMode !== 'total';
  return {
    zip: data.zip,
    state: data.state || null,
    countyFips: data.countyFips || null,
    members: data.members.map((m) => ({
      age: num(m.age),
      usesTobacco: !!m.usesTobacco,
      wasCovered: !!m.wasCovered,
      relationship: m.relationship,
    })),
    dates: {
      jobEndDate: data.jobEndDate || null,
      lastDayOfCoverage: data.lastDayOfCoverage || null,
      cobraNoticeReceived: !!data.cobraNoticeReceived,
      cobraNoticeDate: data.cobraNoticeReceived && data.cobraNoticeDate ? data.cobraNoticeDate : null,
    },
    cobra,
    oldPlan: {
      deductible: num(data.oldDeductible),
      outOfPocketMax: num(data.oldOopMax),
      deductibleMet: num(data.deductibleMet),
      outOfPocketMet: num(data.oopMet),
    },
    income: {
      annualOverride: helper ? null : num(data.annualOverride),
      wagesThisYear: helper ? num(data.wagesThisYear) : null,
      severance: helper ? num(data.severance) : null,
      unemploymentWeekly: num(data.unemploymentWeekly),
      unemploymentWeeks: helper ? num(data.unemploymentWeeks) : null,
      spouseAnnualIncome: num(data.spouseAnnualIncome),
      otherAnnualIncome: helper ? num(data.otherAnnualIncome) : null,
      nextYearAnnualIncome: startsNextYear(data) ? num(data.nextYearAnnualIncome) : null,
      currentMonthlyOverride: num(data.currentMonthlyOverride),
    },
    care: {
      usage: data.usage,
      drugs: data.drugs.map((d) => ({ rxcui: d.rxcui, name: d.name })),
      providers: data.providers.map((p) => ({ npi: p.npi, name: p.name })),
    },
    spousePlan: data.spouseAvailable
      ? {
          available: true,
          monthlyPremium: num(data.spouseMonthlyPremium),
          deductible: num(data.spouseDeductible),
          outOfPocketMax: num(data.spouseOopMax),
        }
      : null,
  };
}

/** Maps backend field paths (e.g. "income.annualOverride", "members[0].age") to the wizard step to revisit. */
export function stepForField(field) {
  if (!field) return 0;
  if (/^(zip|state|countyFips|members)/.test(field)) return 0;
  if (/^(dates|cobra)/.test(field)) return 1;
  if (/^income/.test(field)) return 2;
  if (/^(oldPlan|care)/.test(field)) return 3;
  if (/^spousePlan/.test(field)) return 4;
  return 0;
}
