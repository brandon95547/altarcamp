import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn.js';

export function Brand({
  className,
  tone = 'dark',
}: {
  className?: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <Link to="/" className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect
          width="32"
          height="32"
          rx="7"
          className={tone === 'dark' ? 'fill-ink-950' : 'fill-ember-400'}
        />
        <path
          d="M16 6l7 14H9l7-14z"
          fill="none"
          className={tone === 'dark' ? 'stroke-ember-400' : 'stroke-ink-950'}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M11 24h10"
          className={tone === 'dark' ? 'stroke-ember-400' : 'stroke-ink-950'}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={cn(
          'font-display text-xl font-semibold tracking-tight',
          tone === 'dark' ? 'text-ink-950' : 'text-ink-50',
        )}
      >
        Altar<span className="text-ember-600">.</span>Camp
      </span>
    </Link>
  );
}
