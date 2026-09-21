import { BPS_TOTAL, bpsToPercent, formatBps, type SplitLine } from '@altar/shared';
import { cn } from '../../lib/cn.js';

/**
 * The picture of a split. Colour is assigned by position and repeated in the legend beside
 * the name and the number, so the bar is never the only thing carrying the meaning.
 */
const SWATCHES = [
  'bg-ember-500',
  'bg-dusk-500',
  'bg-moss-500',
  'bg-clay-500',
  'bg-ink-600',
  'bg-ember-700',
  'bg-dusk-700',
  'bg-moss-700',
];

export function swatchFor(index: number): string {
  return SWATCHES[index % SWATCHES.length] as string;
}

export function SplitBar({
  lines,
  className,
  showLegend = true,
}: {
  lines: readonly SplitLine[];
  className?: string;
  showLegend?: boolean;
}) {
  const total = lines.reduce((sum, line) => sum + line.bps, 0);
  const unassigned = Math.max(0, BPS_TOTAL - total);
  const scale = Math.max(total, BPS_TOTAL);

  return (
    <div className={className}>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-ink-200"
        role="img"
        aria-label={lines
          .map((line) => `${line.participantName} ${formatBps(line.bps)}`)
          .join(', ')}
      >
        {lines.map((line, index) => (
          <div
            key={`${line.participantId}-${index}`}
            className={cn(swatchFor(index), 'h-full')}
            style={{ width: `${(line.bps / scale) * 100}%` }}
          />
        ))}
        {unassigned > 0 ? (
          <div
            className="h-full bg-[repeating-linear-gradient(45deg,var(--color-ink-300)_0_6px,var(--color-ink-200)_6px_12px)]"
            style={{ width: `${(unassigned / scale) * 100}%` }}
          />
        ) : null}
      </div>

      {showLegend ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          {lines.map((line, index) => (
            <li key={`${line.participantId}-legend-${index}`} className="flex items-center gap-2">
              <span className={cn('size-2.5 shrink-0 rounded-sm', swatchFor(index))} aria-hidden />
              <span className="text-ink-800">{line.participantName}</span>
              <span className="font-semibold text-ink-950 tabular-nums">{formatBps(line.bps)}</span>
            </li>
          ))}
          {unassigned > 0 ? (
            <li className="flex items-center gap-2 text-ink-600">
              <span className="size-2.5 shrink-0 rounded-sm bg-ink-300" aria-hidden />
              Unassigned
              <span className="font-semibold tabular-nums">{formatBps(unassigned)}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function SplitTotal({ lines }: { lines: readonly SplitLine[] }) {
  const total = lines.reduce((sum, line) => sum + line.bps, 0);
  const balanced = total === BPS_TOTAL;
  const difference = total - BPS_TOTAL;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold',
        balanced ? 'bg-moss-50 text-moss-800' : 'bg-clay-50 text-clay-800',
      )}
    >
      <span>Total</span>
      <span className="tabular-nums">
        {bpsToPercent(total).toFixed(bpsToPercent(total) % 1 === 0 ? 0 : 2)}%
        {balanced ? null : (
          <span className="ml-2 font-normal">
            ({difference > 0 ? 'over by ' : 'short by '}
            {formatBps(Math.abs(difference))})
          </span>
        )}
      </span>
    </div>
  );
}
