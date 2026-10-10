// FICTIONAL example used for the home page preview. Not real prices, people or dates.
// Shape matches the /api/transition/analyze response so the real components render it.
export const SAMPLE_RESULT = {
  household: { newCoverageStart: '2026-07-01', annualFplPercent: 230 },
  options: [
    {
      type: 'COBRA', label: 'COBRA (keep your old plan)', availability: 'AVAILABLE',
      monthlyPremium: 1600, periodCost: 11400, twelveMonthCost: 23000,
      deductibleCarriesOver: true, deductibleRemaining: 400,
      notes: ['Same plan, doctors and drug coverage as before.'], plans: [], members: [],
    },
    {
      type: 'MARKETPLACE', label: 'Marketplace plan', availability: 'AVAILABLE',
      monthlyPremium: 300, periodCost: 4800, twelveMonthCost: 9100,
      deductibleCarriesOver: false,
      notes: ['Deductible starts over at $0 on a new plan.'], plans: [], members: [],
      subsidy: { eligible: true, applicablePercent: 7.5, maxMonthlyForBenchmark: 400, estimatedMonthlyCredit: 900 },
    },
    {
      type: 'MEDICAID_CHIP', label: 'Medicaid / CHIP', availability: 'POSSIBLE',
      monthlyPremium: 0, periodCost: null, twelveMonthCost: null, deductibleCarriesOver: false,
      notes: ['Likely only for the child in this example household.'], plans: [], members: [],
    },
    {
      type: 'SPOUSE_PLAN', label: "Spouse's or partner's plan", availability: 'AVAILABLE',
      monthlyPremium: 700, periodCost: 6500, twelveMonthCost: 12300, deductibleCarriesOver: false,
      notes: ['New plan, so the deductible starts over.'], plans: [], members: [],
    },
  ],
  timeline: [
    { key: 'SPOUSE_PLAN', label: "Join a spouse's or partner's plan", windowStart: '2026-06-30', date: '2026-07-30',
      estimated: false, status: 'OPEN', daysLeft: 12, detail: 'Usually 30 days after your coverage ends.' },
    { key: 'MARKETPLACE_SEP', label: 'Marketplace special enrollment window', windowStart: '2026-05-01', date: '2026-08-29',
      estimated: false, status: 'OPEN', daysLeft: 42, detail: '60 days before to 60 days after your coverage ends.' },
    { key: 'COBRA_ELECT', label: 'Last day to elect COBRA', windowStart: '2026-06-30', date: '2026-09-12',
      estimated: true, status: 'UPCOMING', daysLeft: 56, detail: '60 days after your COBRA notice arrives.' },
    { key: 'MEDICAID', label: 'Medicaid / CHIP: apply any time', windowStart: null, date: null,
      estimated: false, status: 'ONGOING', daysLeft: null, detail: 'No enrollment window.' },
  ],
};
