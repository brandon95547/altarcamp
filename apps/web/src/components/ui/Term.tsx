import { GLOSSARY_BY_KEY } from '@altar/shared';
import { HelpCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn.js';

/**
 * Spec §43: every music-business term carries "? What does this mean?".
 *
 * The definition comes from the shared glossary, so the same sentence explains the term
 * everywhere it appears — marketing page, split builder or signed deal summary.
 */
export function Term({
  termKey,
  children,
  className,
}: {
  termKey: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY_BY_KEY[termKey];
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (!entry) return <>{children ?? termKey}</>;

  return (
    <span ref={wrapper} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-baseline gap-1 rounded border-b border-dashed border-ink-400 font-medium text-ink-900 hover:border-ember-600 hover:text-ember-700"
      >
        {children ?? entry.term}
        <HelpCircle className="size-3.5 shrink-0 translate-y-0.5 text-ink-500" aria-hidden />
        <span className="sr-only">What does this mean?</span>
      </button>

      {open ? (
        <span
          role="dialog"
          aria-label={`What does ${entry.term} mean?`}
          className="absolute left-0 top-full z-30 mt-2 block w-80 max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-ink-200 bg-white p-4 text-left shadow-lg"
        >
          <span className="mb-1 flex items-start justify-between gap-2">
            <span className="text-base font-semibold text-ink-950">{entry.term}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-m-1 rounded p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>
          </span>
          <span className="block text-sm text-ink-700">{entry.long}</span>
          {entry.gotcha ? (
            <span className="mt-2 block rounded border-l-2 border-ember-500 bg-ember-50 px-3 py-2 text-sm text-ink-800">
              {entry.gotcha}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
