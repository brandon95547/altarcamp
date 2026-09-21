import {
  ALTAR_PARTY_ID,
  ALTAR_PARTY_NAME,
  bpsToPercent,
  distributeEvenly,
  percentToBps,
  validateSplit,
  type SplitLine,
} from '@altar/shared';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Callout } from '../ui/Callout.js';
import { SplitBar, SplitTotal, swatchFor } from './SplitBar.js';
import { cn } from '../../lib/cn.js';

export interface Participant {
  id: string;
  name: string;
  role?: string;
}

/**
 * The split builder — spec §8, §9, §10.
 *
 * It refuses to be vague: the total is always on screen, the shortfall is named in
 * percentage points, and the same validator the API uses produces the message. A split can
 * be saved only at exactly 100%.
 */
export function SplitBuilder({
  label,
  participants,
  lines,
  onChange,
  includeAltar = true,
  helpText,
}: {
  label: string;
  participants: Participant[];
  lines: SplitLine[];
  onChange: (lines: SplitLine[]) => void;
  includeAltar?: boolean;
  helpText?: React.ReactNode;
}) {
  const available = [
    ...participants,
    ...(includeAltar ? [{ id: ALTAR_PARTY_ID, name: ALTAR_PARTY_NAME, role: 'label' }] : []),
  ].filter((participant) => !lines.some((line) => line.participantId === participant.id));

  const validation = validateSplit(lines, label);

  const update = (index: number, bps: number) => {
    onChange(lines.map((line, position) => (position === index ? { ...line, bps } : line)));
  };

  const add = (participantId: string) => {
    const participant = [...participants, { id: ALTAR_PARTY_ID, name: ALTAR_PARTY_NAME }].find(
      (candidate) => candidate.id === participantId,
    );
    if (!participant) return;
    onChange([
      ...lines,
      { participantId: participant.id, participantName: participant.name, bps: 0 },
    ]);
  };

  const remove = (index: number) => onChange(lines.filter((_, position) => position !== index));

  const splitEvenly = () => {
    const shares = distributeEvenly(lines.length);
    onChange(lines.map((line, index) => ({ ...line, bps: shares[index] ?? 0 })));
  };

  return (
    <div className="grid gap-4">
      {helpText ? <p className="text-sm text-ink-600">{helpText}</p> : null}

      <SplitBar lines={lines} showLegend={false} />

      <ul className="grid gap-2">
        {lines.map((line, index) => (
          <li
            key={`${line.participantId}-${index}`}
            className="flex items-center gap-3 rounded-lg border border-ink-200 bg-white px-3 py-2.5"
          >
            <span className={cn('size-3 shrink-0 rounded-sm', swatchFor(index))} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-ink-900">{line.participantName}</span>
            <div className="flex items-center gap-1">
              <label className="sr-only" htmlFor={`share-${index}`}>
                {line.participantName} share
              </label>
              <input
                id={`share-${index}`}
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                value={bpsToPercent(line.bps)}
                onChange={(event) => {
                  const next = Number.parseFloat(event.target.value);
                  update(
                    index,
                    Number.isNaN(next) ? 0 : percentToBps(Math.min(Math.max(next, 0), 100)),
                  );
                }}
                className="w-24 rounded-lg border border-ink-300 px-2.5 py-1.5 text-right tabular-nums focus:border-ember-600 focus:outline-none focus:ring-2 focus:ring-ember-600/25"
              />
              <span className="w-4 text-ink-600">%</span>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className="-mr-1 rounded p-1.5 text-ink-500 hover:bg-clay-50 hover:text-clay-700"
              aria-label={`Remove ${line.participantName}`}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {lines.length === 0 ? (
          <li className="rounded-lg border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-600">
            Nobody is in this split yet.
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        {available.length > 0 ? (
          <select
            value=""
            onChange={(event) => add(event.target.value)}
            className="h-9 rounded-lg border border-ink-300 bg-white px-3 text-sm focus:border-ember-600 focus:outline-none focus:ring-2 focus:ring-ember-600/25"
            aria-label={`Add someone to ${label.toLowerCase()}`}
          >
            <option value="" disabled>
              Add someone…
            </option>
            {available.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
                {participant.role ? ` — ${participant.role.replace(/_/g, ' ')}` : ''}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-600">
            <Plus className="size-4" aria-hidden />
            Everyone on this song is in the split.
          </span>
        )}

        {lines.length > 1 ? (
          <Button type="button" variant="ghost" size="sm" onClick={splitEvenly}>
            Split evenly
          </Button>
        ) : null}
      </div>

      <SplitTotal lines={lines} />

      {validation.errors.length > 0 ? (
        <Callout tone="blocker" title="This split cannot be saved yet">
          <ul className="list-disc pl-4">
            {validation.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {validation.warnings.length > 0 ? (
        <Callout tone="warning">
          <ul className="list-disc pl-4">
            {validation.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </Callout>
      ) : null}
    </div>
  );
}
