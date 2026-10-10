import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { Link, navigate, useLocation, legacyRedirect } from './router';

function Where() {
  const { path, query, hash } = useLocation();
  return <p data-testid="where">{`${path}|${query.get('payment') || ''}|${hash}`}</p>;
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('router', () => {
  it('parses path, query and hash and re-renders on navigate', () => {
    window.history.replaceState({}, '', '/?payment=success&session_id=cs_test_1');
    render(<Where />);
    expect(screen.getByTestId('where').textContent).toBe('/|success|');
    act(() => navigate('/more#services'));
    expect(screen.getByTestId('where').textContent).toBe('/more||#services');
  });

  it('Link navigates without a page load but leaves modified clicks to the browser', () => {
    render(<><Link to="/compare">go</Link><Where /></>);
    fireEvent.click(screen.getByText('go'));
    expect(window.location.pathname).toBe('/compare');
    act(() => navigate('/'));
    const notPrevented = fireEvent.click(screen.getByText('go'), { metaKey: true });
    expect(notPrevented).toBe(true); // default not prevented: opens in a new tab as usual
    expect(window.location.pathname).toBe('/');
  });

  it('responds to the back button', () => {
    render(<Where />);
    act(() => navigate('/compare'));
    act(() => {
      window.history.replaceState({}, '', '/more');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByTestId('where').textContent).toBe('/more||');
  });

  it('redirects legacy URLs but never the Stripe return URL', () => {
    expect(legacyRedirect('/transition', '?x=1', '')).toBe('/compare?x=1');
    expect(legacyRedirect('/', '', '#services')).toBe('/more#services');
    expect(legacyRedirect('/', '', '#about')).toBe('/more#about');
    expect(legacyRedirect('/', '', '#contact')).toBe('/more#contact');
    expect(legacyRedirect('/', '?payment=success&session_id=cs_1', '')).toBeNull();
    expect(legacyRedirect('/', '?payment=cancelled', '')).toBeNull();
    expect(legacyRedirect('/', '', '#faq')).toBeNull();
    expect(legacyRedirect('/app', '', '')).toBe('/');
    expect(legacyRedirect('/app/compare', '?x=1', '')).toBe('/compare?x=1');
    expect(legacyRedirect('/application', '', '')).toBeNull();
  });
});
