import { cn } from '../../lib/cn.js';
import { titleCase } from '../../lib/format.js';

type Tone = 'neutral' | 'ember' | 'moss' | 'clay' | 'dusk';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 ring-ink-200',
  ember: 'bg-ember-50 text-ember-800 ring-ember-200',
  moss: 'bg-moss-50 text-moss-800 ring-moss-200',
  clay: 'bg-clay-50 text-clay-800 ring-clay-200',
  dusk: 'bg-dusk-50 text-dusk-800 ring-dusk-200',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status words carry meaning; the colour repeats it rather than replacing it. */
const STATUS_TONES: Record<string, Tone> = {
  signed: 'moss',
  accepted: 'moss',
  active: 'moss',
  released: 'moss',
  agreement_signed: 'moss',
  splits_approved: 'moss',
  partially_signed: 'ember',
  sent: 'ember',
  viewed: 'ember',
  pending: 'ember',
  terms_proposed: 'ember',
  artist_reviewing: 'ember',
  altar_review: 'dusk',
  interview: 'dusk',
  draft: 'neutral',
  created: 'neutral',
  started: 'neutral',
  expired: 'clay',
  declined: 'clay',
  change_requested: 'clay',
  amendment_required: 'clay',
  void: 'clay',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} className={className}>
      {titleCase(status)}
    </Badge>
  );
}
