import { describe, it, expect, beforeEach } from 'vitest';
import {
  defaultWizard, validateStep, buildRequest, projectedAnnualIncome, lossDate, newCoverageYear,
  saveWizard, loadWizard, clearWizard, STORAGE_KEY, stepForField, toNumber,
} from './wizardState';

const filled = (patch = {}) => ({
  ...defaultWizard(),
  zip: '27360',
  state: 'NC',
  members: [{ age: '40', usesTobacco: false, wasCovered: true, relationship: 'SELF' }],
  lastDayOfCoverage: '2026-09-30',
  ...patch,
});

describe('income helpers', () => {
  it('adds up helper components like the backend does', () => {
    const d = filled({ wagesThisYear: '30,000', severance: '$5000', unemploymentWeekly: '450', unemploymentWeeks: '20',
      spouseAnnualIncome: '24000', otherAnnualIncome: '1000' });
    expect(projectedAnnualIncome(d)).toBe(69000);
  });

  it('uses the total in total mode', () => {
    expect(projectedAnnualIncome(filled({ incomeMode: 'total', annualOverride: '52000' }))).toBe(52000);
  });

  it('parses money input leniently and rejects junk', () => {
    expect(toNumber('$1,234.50')).toBe(1234.5);
    expect(toNumber('')).toBeNull();
    expect(Number.isNaN(toNumber('abc'))).toBe(true);
  });
});

describe('dates', () => {
  it('falls back to the end of the job-end month, including leap years', () => {
    expect(lossDate(filled({ lastDayOfCoverage: '', jobEndDate: '2028-02-10' }))).toEqual({ y: 2028, m: 2, d: 29 });
    expect(lossDate(filled({ lastDayOfCoverage: '', jobEndDate: '2027-02-10' }))).toEqual({ y: 2027, m: 2, d: 28 });
  });

  it('moves December losses into the next coverage year', () => {
    expect(newCoverageYear(filled({ lastDayOfCoverage: '2026-12-15' }))).toBe(2027);
    expect(newCoverageYear(filled({ lastDayOfCoverage: '2026-11-30' }))).toBe(2026);
  });
});

describe('validation', () => {
  it('requires ZIP, state and valid ages', () => {
    const e = validateStep('household', { ...defaultWizard(), members: [{ age: '130', wasCovered: true }] });
    expect(Object.keys(e)).toEqual(expect.arrayContaining(['zip', 'state', 'members.0.age']));
    expect(validateStep('household', filled())).toEqual({});
  });

  it('requires a county when the ZIP spans several', () => {
    const d = filled({ location: { counties: [{ fips: '1' }, { fips: '2' }] } });
    expect(validateStep('household', d)).toHaveProperty('countyFips');
  });

  it('requires at least one coverage date', () => {
    expect(validateStep('coverage', filled({ lastDayOfCoverage: '' }))).toHaveProperty('lastDayOfCoverage');
  });

  it('requires a total in total-income mode and rejects negatives', () => {
    expect(validateStep('income', filled({ incomeMode: 'total' }))).toHaveProperty('annualOverride');
    expect(validateStep('income', filled({ severance: '-5' }))).toHaveProperty('severance');
  });
});

describe('buildRequest', () => {
  it('builds the analyze payload with nulls for blanks and no location object', () => {
    const req = buildRequest(filled({
      location: { counties: [], exchangeName: 'HealthCare.gov' },
      cobraMonthlyPremium: '650',
      drugs: [{ rxcui: '861007', name: 'metformin', strength: '500 MG' }],
    }));
    expect(req).not.toHaveProperty('location');
    expect(req.members[0]).toEqual({ age: 40, usesTobacco: false, wasCovered: true, relationship: 'SELF' });
    expect(req.dates).toEqual({ jobEndDate: null, lastDayOfCoverage: '2026-09-30', cobraNoticeReceived: false, cobraNoticeDate: null });
    expect(req.cobra).toEqual({ monthlyPremium: 650 });
    expect(req.care.drugs).toEqual([{ rxcui: '861007', name: 'metformin' }]);
    expect(req.spousePlan).toBeNull();
    expect(req.income.annualOverride).toBeNull();
  });

  it('sends paycheck details or nothing for COBRA', () => {
    expect(buildRequest(filled({ cobraPriceSource: 'paycheck', paycheckDeduction: '150' })).cobra)
      .toEqual({ paycheckDeduction: 150, payFrequency: 'BIWEEKLY' });
    expect(buildRequest(filled({ cobraPriceSource: 'unknown' })).cobra).toBeNull();
  });

  it('only sends next-year income when coverage starts next year', () => {
    const thisYear = new Date().getFullYear();
    const nextYearLoss = filled({ lastDayOfCoverage: `${thisYear}-12-31`, nextYearAnnualIncome: '30000' });
    expect(buildRequest(nextYearLoss).income.nextYearAnnualIncome).toBe(30000);
    const sameYear = filled({ lastDayOfCoverage: `${thisYear}-06-30`, nextYearAnnualIncome: '30000' });
    expect(buildRequest(sameYear).income.nextYearAnnualIncome).toBeNull();
  });

  it('includes the spouse plan only when available', () => {
    const req = buildRequest(filled({ spouseAvailable: true, spouseMonthlyPremium: '400' }));
    expect(req.spousePlan).toEqual({ available: true, monthlyPremium: 400, deductible: null, outOfPocketMax: null });
  });
});

describe('sessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('saves, restores and clears the wizard in sessionStorage only', () => {
    saveWizard(2, filled({ severance: '5000' }));
    expect(localStorage.length).toBe(0);
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)).step).toBe(2);
    const restored = loadWizard();
    expect(restored.step).toBe(2);
    expect(restored.data.severance).toBe('5000');
    clearWizard();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadWizard()).toBeNull();
  });

  it('ignores corrupt saved data', () => {
    sessionStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadWizard()).toBeNull();
  });
});

describe('stepForField', () => {
  it('sends the person back to the step that owns a backend field', () => {
    expect(stepForField('members[0].age')).toBe(0);
    expect(stepForField('dates.lastDayOfCoverage')).toBe(1);
    expect(stepForField('income.annualOverride')).toBe(2);
    expect(stepForField('care.drugs[0].rxcui')).toBe(3);
    expect(stepForField('spousePlan.monthlyPremium')).toBe(4);
  });
});
