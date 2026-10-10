import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import TransitionFlow from './TransitionFlow';
import TransitionResults from './results/TransitionResults';
import { STORAGE_KEY, defaultWizard } from './wizardState';

vi.mock('../../services/transitionApi', () => ({
  lookupLocation: vi.fn(),
  searchDrugs: vi.fn(),
  searchProviders: vi.fn(),
  analyzeCoverage: vi.fn(),
}));

import { analyzeCoverage } from '../../services/transitionApi';

const RESULT = {
  meta: { dataVersion: 'test', asOf: '2026-10-10', planYear: 2026, planDataSource: 'UNAVAILABLE', pendingReviewValues: ['x'] },
  location: { state: 'NC', stateName: 'North Carolina', countyName: null, exchangeType: 'HEALTHCARE_GOV', exchangeName: 'HealthCare.gov' },
  household: { coverageEnds: '2026-09-30', newCoverageStart: '2026-10-01', annualFplPercent: 255.59, monthsInPeriod: 3 },
  options: [
    { type: 'COBRA', label: 'COBRA (keep your old plan)', availability: 'AVAILABLE', monthlyPremium: 650, periodCost: 2650,
      twelveMonthCost: 9000, deductibleCarriesOver: true, deductibleRemaining: 500, notes: ['Same plan'], plans: [], members: [] },
    { type: 'MARKETPLACE', label: 'Marketplace plan (HealthCare.gov)', availability: 'AVAILABLE', monthlyPremium: null,
      periodCost: null, twelveMonthCost: null, deductibleCarriesOver: false, notes: [], plans: [], members: [],
      subsidy: { eligible: true, applicablePercent: 8.61, maxMonthlyForBenchmark: 287 },
      handoff: { name: 'HealthCare.gov', url: 'https://www.healthcare.gov/' } },
  ],
  timeline: [{ key: 'MARKETPLACE_SEP', label: 'Marketplace special enrollment window', windowStart: '2026-08-01',
    date: '2026-11-29', estimated: false, status: 'OPEN', daysLeft: 50, detail: 'd' }],
  watchOuts: [{ key: 'SUBSIDY_REPAYMENT', severity: 'WARNING', title: 'Underestimating your income', body: 'b' }],
  nextSteps: [{ key: 'MARKETPLACE_ENROLL', title: 'Compare plans', body: 'b', url: 'https://www.healthcare.gov/', urlLabel: 'HealthCare.gov', dueBy: '2026-11-29' }],
  chatSummary: 'SUMMARY-ONLY-NUMBERS',
  disclaimers: ['These are estimates, not advice.'],
};

beforeEach(() => {
  sessionStorage.clear();
  window.scrollTo = () => {};
});
afterEach(cleanup);

describe('TransitionResults', () => {
  it('shows the comparison, deadlines and hands only the summary to the chat', () => {
    const ask = vi.fn();
    render(<TransitionResults result={RESULT} onEdit={() => {}} onClear={() => {}} onAskAboutResults={ask} />);
    expect(screen.getByText('COBRA (keep your old plan)')).toBeTruthy();
    expect(screen.getByText('$2,650')).toBeTruthy();
    expect(screen.getByText(/Carries over/)).toBeTruthy();
    expect(screen.getByText('50 days left')).toBeTruthy();
    expect(screen.getByText(/\$287\/mo/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Ask about my results/ }));
    expect(ask).toHaveBeenCalledWith('SUMMARY-ONLY-NUMBERS');
  });
});

describe('TransitionFlow', () => {
  it('restores progress from sessionStorage and "Clear my info" wipes it', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 2, data: { ...defaultWizard(), zip: '27360', severance: '5000' } }));
    render(<TransitionFlow onBack={() => {}} onAskAboutResults={() => {}} />);
    expect(screen.getByText('Step 3 of 5')).toBeTruthy();
    expect(screen.getByLabelText('Severance').value).toBe('5000');

    fireEvent.click(screen.getByRole('button', { name: /Clear my info/ }));
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
    await waitFor(() => {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      expect(saved.data.severance).toBe('');
      expect(saved.data.zip).toBe('');
    });
  });

  it('submits on the last step and shows results without storing them', async () => {
    analyzeCoverage.mockResolvedValue(RESULT);
    const data = {
      ...defaultWizard(), zip: '27360', state: 'NC', lastDayOfCoverage: '2026-09-30',
      members: [{ age: '40', usesTobacco: false, wasCovered: true, relationship: 'SELF' }],
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 4, data }));
    render(<TransitionFlow onBack={() => {}} onAskAboutResults={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Compare my options/ }));
    await waitFor(() => expect(screen.getByText('Compare your options')).toBeTruthy());
    expect(analyzeCoverage).toHaveBeenCalledTimes(1);
    expect(analyzeCoverage.mock.calls[0][0].zip).toBe('27360');
    expect(sessionStorage.getItem(STORAGE_KEY)).not.toContain('SUMMARY-ONLY-NUMBERS');
  });

  it('blocks Continue until the step is valid', () => {
    render(<TransitionFlow onBack={() => {}} onAskAboutResults={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByText('Enter a 5-digit ZIP code.')).toBeTruthy();
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
  });
});

// Contract test: a real /api/transition/analyze response captured from the
// backend (fixture plan data) must render without errors.
import realResponse from './__fixtures__/analyze-response.json';

describe('TransitionResults with a real backend response', () => {
  it('renders every section and the plan table', () => {
    render(<TransitionResults result={realResponse} onEdit={() => {}} onClear={() => {}} onAskAboutResults={() => {}} />);
    for (const o of realResponse.options) expect(screen.getAllByText(o.label).length).toBeGreaterThan(0);
    for (const w of realResponse.watchOuts) expect(screen.getByText(w.title)).toBeTruthy();
    for (const s of realResponse.nextSteps) expect(screen.getByText(s.title)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Marketplace plans/ }));
    expect(screen.getAllByText('insulin glargine').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not covered').length).toBeGreaterThan(0);
    expect(screen.getByText(/sample data, not real quotes/)).toBeTruthy();
  });
});
