import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn.js';

/**
 * `dark` — dark mark and wordmark, for light surfaces.
 * `light` — solid ember mark and light wordmark, for a flat dark surface (the footer).
 * `outline` — ember-outlined mark and light wordmark, for the marketing header, which sits
 *   over the hero photograph: a solid tile there competes with the sunrise for attention.
 */
export function Brand({
  className,
  tone = 'dark',
}: {
  className?: string;
  tone?: 'dark' | 'light' | 'outline';
}) {
  const glyph = tone === 'light' ? 'stroke-ink-950' : 'stroke-ember-400';

  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        {tone === 'outline' ? (
          <rect
            x="0.75"
            y="0.75"
            width="30.5"
            height="30.5"
            rx="6.5"
            className="fill-ink-950 stroke-ember-500"
            strokeWidth="1.5"
          />
        ) : (
          <rect
            width="32"
            height="32"
            rx="7"
            className={tone === 'dark' ? 'fill-ink-950' : 'fill-ember-400'}
          />
        )}
        <path
          d="M16 6l7 14H9l7-14z"
          fill="none"
          className={glyph}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M11 24h10" className={glyph} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span
        className={cn(
          'text-xl font-bold tracking-tight',
          tone === 'dark' ? 'text-ink-950' : 'text-ink-50',
        )}
      >
        Altar<span className={tone === 'dark' ? 'text-ember-600' : 'text-ember-400'}>.</span>Camp
      </span>
    </Link>
  );
}
