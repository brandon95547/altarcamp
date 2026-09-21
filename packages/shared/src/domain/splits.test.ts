import { describe, expect, it } from 'vitest';
import {
  allocate,
  applyBps,
  BPS_TOTAL,
  bpsToPercent,
  distributeEvenly,
  formatBps,
  percentToBps,
  validateSplit,
  type SplitLine,
} from './splits.js';

const line = (id: string, bps: number): SplitLine => ({
  participantId: id,
  participantName: id,
  bps,
});

describe('percentage conversion', () => {
  it('round-trips whole and fractional percentages', () => {
    expect(percentToBps(25)).toBe(2500);
    expect(percentToBps(33.33)).toBe(3333);
    expect(bpsToPercent(3333)).toBe(33.33);
  });

  it('formats without trailing noise', () => {
    expect(formatBps(5000)).toBe('50%');
    expect(formatBps(3333)).toBe('33.33%');
    expect(formatBps(2550)).toBe('25.5%');
  });
});

describe('validateSplit', () => {
  it('accepts a split that totals exactly 100%', () => {
    const result = validateSplit([line('a', 5000), line('b', 2500), line('c', 2500)]);
    expect(result.isBalanced).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('names the shortfall in percentage points', () => {
    const result = validateSplit([line('a', 5000), line('b', 2500)], 'Songwriting');
    expect(result.isBalanced).toBe(false);
    expect(result.differenceBps).toBe(-2500);
    expect(result.errors[0]).toContain('25% is unassigned');
  });

  it('rejects a split that is over', () => {
    const result = validateSplit([line('a', 6000), line('b', 5000)]);
    expect(result.errors[0]).toContain('10% too much');
  });

  it('rejects the same participant twice', () => {
    const result = validateSplit([line('a', 5000), line('a', 5000)]);
    expect(result.errors.some((error) => error.includes('more than once'))).toBe(true);
  });

  it('warns about a zero share rather than silently allowing it', () => {
    const result = validateSplit([line('a', 10_000), line('b', 0)]);
    expect(result.warnings[0]).toContain('0%');
  });

  it('treats an empty split as unfinished', () => {
    const result = validateSplit([]);
    expect(result.isBalanced).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('distributeEvenly', () => {
  it('always totals exactly 100%', () => {
    for (const count of [1, 2, 3, 6, 7, 9, 11]) {
      const shares = distributeEvenly(count);
      expect(shares).toHaveLength(count);
      expect(shares.reduce((total, value) => total + value, 0)).toBe(BPS_TOTAL);
    }
  });

  it('gives the odd basis points to the earliest participants', () => {
    expect(distributeEvenly(3)).toEqual([3334, 3333, 3333]);
  });
});

describe('money allocation', () => {
  it('applies a share to an amount in cents', () => {
    expect(applyBps(1_000_000, 4500)).toBe(450_000);
  });

  it('allocates without losing or inventing a cent', () => {
    const lines = [line('a', 3334), line('b', 3333), line('c', 3333)];
    const parts = allocate(10_001, lines);
    expect(parts.reduce((total, value) => total + value, 0)).toBe(10_001);
  });

  it('handles an amount of zero', () => {
    expect(allocate(0, [line('a', 5000), line('b', 5000)])).toEqual([0, 0]);
  });
});
