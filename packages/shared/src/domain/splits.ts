/**
 * Percentage math.
 *
 * Percentages are stored and transported as **basis points** (integers, 10_000 = 100%).
 * Floating-point percentages drift: 33.33 + 33.33 + 33.34 is not reliably 100 in binary
 * floating point, and a split sheet that is 99.99999% complete must never block a release
 * for a rounding reason — nor silently pass when it is genuinely short.
 *
 * Rule from spec §30: a percentage is never a bare number on a person. It is always
 * qualified by agreement, asset, right, revenue category, participant, and effective
 * period. The types here carry those qualifiers.
 */

export const BPS_TOTAL = 10_000;

export type Bps = number;

/** 25 -> 2500. Accepts up to two decimal places, e.g. 33.33 -> 3333. */
export function percentToBps(percent: number): Bps {
  return Math.round(percent * 100);
}

/** 2500 -> 25. */
export function bpsToPercent(bps: Bps): number {
  return bps / 100;
}

/** 3333 -> "33.33%", 5000 -> "50%". Trailing zeros are dropped. */
export function formatBps(bps: Bps, options: { withSign?: boolean } = {}): string {
  const percent = bpsToPercent(bps);
  const text = Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/0+$/, '');
  return options.withSign === false ? text : `${text}%`;
}

export function sumBps(values: readonly number[]): Bps {
  return values.reduce((total, value) => total + value, 0);
}

/** A single participant's stake in one right or one revenue category. */
export interface SplitLine {
  /** Participant identity: a contributor id, or the reserved 'altar' party. */
  participantId: string;
  /** Display name, denormalised for the split builder and the rendered agreement. */
  participantName: string;
  bps: Bps;
}

export interface SplitValidation {
  totalBps: Bps;
  isBalanced: boolean;
  /** Positive when the split is over 100%, negative when short. */
  differenceBps: Bps;
  errors: string[];
  warnings: string[];
}

/**
 * A split is only complete at exactly 100% — spec §8 ("should not allow final completion
 * until songwriting percentages equal exactly 100%") and §34.
 */
export function validateSplit(lines: readonly SplitLine[], label = 'This split'): SplitValidation {
  const totalBps = sumBps(lines.map((line) => line.bps));
  const differenceBps = totalBps - BPS_TOTAL;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (lines.length === 0) {
    errors.push(`${label} has no participants yet.`);
  }

  if (differenceBps !== 0) {
    const gap = formatBps(Math.abs(differenceBps));
    errors.push(
      differenceBps > 0
        ? `${label} adds up to ${formatBps(totalBps)} — that is ${gap} too much. It must total exactly 100%.`
        : `${label} adds up to ${formatBps(totalBps)} — ${gap} is unassigned. It must total exactly 100%.`,
    );
  }

  for (const line of lines) {
    if (line.bps < 0) {
      errors.push(`${line.participantName} has a negative percentage.`);
    }
    if (line.bps === 0) {
      warnings.push(
        `${line.participantName} is listed at 0%. Remove them, or give them a share, so the agreement is unambiguous.`,
      );
    }
  }

  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.participantId)) {
      errors.push(`${line.participantName} appears more than once in ${label.toLowerCase()}.`);
    }
    seen.add(line.participantId);
  }

  return {
    totalBps,
    isBalanced: differenceBps === 0 && errors.length === 0,
    differenceBps,
    errors,
    warnings,
  };
}

/**
 * Split the remainder evenly, giving the odd basis points to the earliest participants so
 * the total is exactly 100%. Used by the "split evenly" button in the split builder.
 */
export function distributeEvenly(count: number): Bps[] {
  if (count <= 0) return [];
  const base = Math.floor(BPS_TOTAL / count);
  const remainder = BPS_TOTAL - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Apply a share to an amount in minor units (cents), rounding half away from zero. */
export function applyBps(amountMinor: number, bps: Bps): number {
  const raw = (amountMinor * bps) / BPS_TOTAL;
  return raw < 0 ? -Math.round(-raw) : Math.round(raw);
}

/**
 * Allocate an amount across lines so the parts add back to the whole exactly.
 * Rounding crumbs go to the largest shares first (largest-remainder method).
 */
export function allocate(amountMinor: number, lines: readonly SplitLine[]): number[] {
  if (lines.length === 0) return [];
  const exact = lines.map((line) => (amountMinor * line.bps) / BPS_TOTAL);
  const floors = exact.map((value) => Math.floor(value));
  let remainder = amountMinor - floors.reduce((total, value) => total + value, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  const result = [...floors];
  for (const { index } of order) {
    if (remainder <= 0) break;
    result[index] = (result[index] ?? 0) + 1;
    remainder -= 1;
  }
  return result;
}
