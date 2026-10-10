import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import axe from 'axe-core';
import App from './App';
import { STORAGE_KEY, defaultWizard } from './components/transition/wizardState';
import realResponse from './components/transition/__fixtures__/analyze-response.json';

vi.mock('./services/api', () => ({
  default: {},
  sendMessage: vi.fn(),
  getConversations: vi.fn(async () => []),
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  addMessageToConversation: vi.fn(),
  deleteConversation: vi.fn(),
  getAvailableSlots: vi.fn(async () => ({ slots: [] })),
  bookSlot: vi.fn(),
  createCheckoutSession: vi.fn(),
  getProfile: vi.fn(async () => ({})),
  updateProfile: vi.fn(),
}));
vi.mock('./services/transitionApi', () => ({
  lookupLocation: vi.fn(),
  searchDrugs: vi.fn(),
  searchProviders: vi.fn(),
  analyzeCoverage: vi.fn(),
}));

import { sendMessage, addMessageToConversation } from './services/api';
import { analyzeCoverage } from './services/transitionApi';

function renderAt(url) {
  window.history.replaceState({}, '', url);
  return render(<App />);
}

async function axeViolations(container) {
  // Colour contrast can't be computed in jsdom; it's checked with a contrast script instead.
  const res = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
  return res.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = vi.fn();
  sendMessage.mockResolvedValue({ message: 'Here is an explanation.', contentType: 'TEXT', sessionId: 's1' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('home page', () => {
  it('leads with the coverage comparison and keeps chat secondary', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Lost your job/);
    const ctas = screen.getAllByRole('link', { name: /Compare my options/ });
    expect(ctas.length).toBeGreaterThan(1);
    ctas.forEach((a) => expect(a.getAttribute('href')).toBe('/compare'));
    expect(screen.getAllByText(/The comparison doesn’t store your answers/).length).toBeGreaterThan(0);
    for (const id of ['deadlines', 'how-it-works', 'example', 'why', 'faq']) {
      expect(document.getElementById(id)).not.toBeNull();
    }
    expect(screen.getByText(/Every number and date here is made up/)).toBeTruthy();
    // header (phones), hero, closing section, floating (tablet/desktop)
    expect(screen.getAllByRole('button', { name: /ask a question/i }).length).toBe(4);
  });

  it('has no automatically detectable accessibility violations', async () => {
    const { container } = renderAt('/');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('does not load the Google sign-in script until someone signs in', () => {
    renderAt('/');
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeNull();
  });
});

describe('Stripe return URLs', () => {
  it('shows a confirmation for /?payment=success and clears the query on dismiss', () => {
    renderAt('/?payment=success&session_id=cs_test_abc');
    expect(screen.getByRole('status').textContent).toMatch(/Payment received/);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(window.location.search).toBe('');
    expect(screen.queryByText(/Payment received/)).toBeNull();
  });

  it('shows a cancellation note with a way to book again', () => {
    renderAt('/?payment=cancelled');
    const status = screen.getByRole('status');
    expect(status.textContent).toMatch(/You weren't charged/);
    expect(within(status).getByRole('link', { name: 'Book again' }).getAttribute('href')).toBe('/contact?type=paid-60');
  });
});

describe('routes', () => {
  it('redirects old landing anchors to the More ways we help page', async () => {
    renderAt('/#services');
    await waitFor(() => expect(window.location.pathname + window.location.hash).toBe('/more#services'));
    expect(await screen.findByText(/Care Led by Experts/)).toBeTruthy();
    expect(document.getElementById('services')).not.toBeNull();
    expect(screen.queryByText(/Real Stories/)).toBeNull(); // testimonials removed
  });

  it('redirects /transition to /compare', async () => {
    renderAt('/transition');
    await waitFor(() => expect(window.location.pathname).toBe('/compare'));
    expect(await screen.findByText('Step 1 of 5')).toBeTruthy();
  });

  it('keeps the paid booking route', async () => {
    renderAt('/contact?type=paid-60');
    expect(await screen.findByText('Book a 1-Hour Session')).toBeTruthy();
  });

  it('shows a not-found page for unknown paths', () => {
    renderAt('/nope');
    expect(screen.getByRole('heading', { name: /couldn’t find that page/ })).toBeTruthy();
  });

  it('the comparison page has no automatically detectable accessibility violations', async () => {
    const { container } = renderAt('/compare');
    await screen.findByText('Step 1 of 5');
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('chat panel', () => {
  it('opens from the floating button with job-loss starters, closes on Escape and restores focus', async () => {
    renderAt('/more');
    const [headerButton, floating] = screen.getAllByRole('button', { name: 'Ask a question' });
    expect(floating.className).toContain('sm:inline-flex');
    const launcher = headerButton;
    launcher.focus();
    fireEvent.click(launcher);
    const dialog = await screen.findByRole('dialog', { name: 'Ask Zume' });
    expect(await within(dialog).findByText('COBRA or a Marketplace plan?')).toBeTruthy();
    expect(await axeViolations(dialog)).toEqual([]);

    expect(floating.className).not.toContain('sm:inline-flex'); // floating button hidden while the panel is open
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(launcher));
  });

  it('"Ask about my results" opens the panel in place with only the summary, never saved', async () => {
    analyzeCoverage.mockResolvedValue(realResponse);
    localStorage.setItem('healthassist_user', JSON.stringify({ id: 7, name: 'Signed In' }));
    const data = {
      ...defaultWizard(), zip: '27360', state: 'NC', lastDayOfCoverage: '2026-09-30',
      members: [{ age: '40', usesTobacco: false, wasCovered: true, relationship: 'SELF' }],
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step: 4, data }));
    renderAt('/compare');

    fireEvent.click(await screen.findByRole('button', { name: /Compare my options/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Ask about my results/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Ask Zume' });
    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage.mock.calls[0][0]).toBe(realResponse.chatSummary);
    expect(await within(dialog).findByText('Here is an explanation.')).toBeTruthy();
    expect(window.location.pathname).toBe('/compare'); // stayed on the results
    expect(addMessageToConversation).not.toHaveBeenCalled(); // ephemeral even when signed in
  });
});
