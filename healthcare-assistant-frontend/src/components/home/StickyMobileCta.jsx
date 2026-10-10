import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from '../../router';
import { BRAND, primaryButton } from '../../theme';

/** Phone-only bar with the primary CTA, shown once the hero CTA has scrolled out of view. */
export default function StickyMobileCta({ watchRef, onVisibleChange }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = watchRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [watchRef]);

  useEffect(() => {
    onVisibleChange?.(visible);
    return () => onVisibleChange?.(false);
  }, [visible, onVisibleChange]);

  if (!visible) return null;
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-4 pt-3"
         style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      <Link to="/compare" className={`${primaryButton} w-full`} style={{ background: BRAND.accent }}>
        Compare my options <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  );
}
