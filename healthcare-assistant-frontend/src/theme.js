// Shared colour tokens. Contrast ratios (WCAG 2.1) are noted where text uses them.
export const BRAND = {
  primary: '#1B3A5C', // 11.6:1 on white
  accent: '#17766C', // teal for text, links and buttons: 5.5:1 on white, white text on it 5.5:1
  accentBright: '#2AA89A', // decorative only (icons, borders); too light for text on white
  accentLight: '#E6F7F5',
  accentOnDark: '#5EEAD4', // 7.9:1 on primary
  warm: '#F9A826',
  warmLight: '#FFF8EB',
  bg: '#FAFBFD',
  text: '#1E293B',
  muted: '#64748B', // 4.6:1 on bg
  border: '#E2E8F0',
};

// Primary button: solid teal, 48px tall tap target, visible focus ring.
export const primaryButton =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-7 py-3 rounded-full text-base font-semibold text-white ' +
  'shadow-md hover:shadow-lg transition-all focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 ' +
  'focus-visible:outline-[#1B3A5C]';

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-full text-base font-semibold border-2 ' +
  'bg-white transition-all focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 ' +
  'focus-visible:outline-[#1B3A5C]';
