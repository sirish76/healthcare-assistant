import React, { useId } from 'react';

/**
 * Header logo. Same artwork as public/zumanely-wordmark.svg, rendered inline:
 * an SVG loaded through <img> can't use the page's web fonts, so the "zumanely"
 * text would fall back to Helvetica/Arial. Inline, it uses Inter 600, which
 * index.html loads (subset to these letters). Keep the two in sync if the logo changes.
 */
export default function Wordmark({ className = '' }) {
  // Gradient ids must be unique in the document; useId's colons aren't safe in url(#...)
  const gradientId = `zm-wordmark-bg-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 336 100" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1F3A5F" />
          <stop offset="1" stopColor="#1E6F73" />
        </linearGradient>
      </defs>
      <g transform="translate(6 10) scale(0.8)">
        <rect width="100" height="100" rx="24" fill={`url(#${gradientId})`} />
        <path d="M30 34 H66 L32 66 C44 73 56 73 68 66" fill="none" stroke="#FFFFFF" strokeWidth="9"
              strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="77.5" cy="23.5" r="5.5" fill="#F4A261" />
      </g>
      <text x="104" y="66" fontFamily="Inter, Helvetica, Arial, sans-serif" fontWeight="600" fontSize="46"
            letterSpacing="-0.5" fill="#1F3A5F">
        zumanely
      </text>
    </svg>
  );
}
