import { describe, expect, it } from 'vitest';
import { buildRecoupmentExample, formatMoney } from './expenses.js';

const base = {
  grossRevenueMinor: 1_000_000,
  distributionCostMinor: 100_000,
  recoupableExpensesMinor: 200_000,
  artistShareBps: 5_000,
};

describe('buildRecoupmentExample', () => {
  it('recoups from gross master revenue before the split', () => {
    const result = buildRecoupmentExample({
      ...base,
      terms: { recoupedFrom: 'master_revenue', artistPersonallyLiable: false },
    });
    expect(result.amountSubjectToSplitMinor).toBe(700_000);
    expect(result.artistShareMinor).toBe(350_000);
    expect(result.altarShareMinor).toBe(350_000);
    expect(result.unrecoupedBalanceMinor).toBe(0);
  });

  it("recoups from the artist's share only, which is a materially different deal", () => {
    const result = buildRecoupmentExample({
      ...base,
      terms: { recoupedFrom: 'artist_share_only', artistPersonallyLiable: false },
    });
    // The split happens first: $900k / 2 = $450k each, then $200k comes out of the artist.
    expect(result.amountSubjectToSplitMinor).toBe(900_000);
    expect(result.altarShareMinor).toBe(450_000);
    expect(result.artistShareMinor).toBe(250_000);
  });

  it('never leaves a personal debt when the artist is not personally liable', () => {
    const result = buildRecoupmentExample({
      ...base,
      grossRevenueMinor: 100_000,
      recoupableExpensesMinor: 500_000,
      terms: { recoupedFrom: 'master_revenue', artistPersonallyLiable: false },
    });
    expect(result.unrecoupedBalanceMinor).toBeGreaterThan(0);
    expect(result.artistOwesMinor).toBe(0);
  });

  it('reports the debt when the artist is personally liable', () => {
    const result = buildRecoupmentExample({
      ...base,
      grossRevenueMinor: 100_000,
      recoupableExpensesMinor: 500_000,
      terms: { recoupedFrom: 'master_revenue', artistPersonallyLiable: true },
    });
    expect(result.artistOwesMinor).toBe(result.unrecoupedBalanceMinor);
  });

  it('skips the recoupment line entirely when nothing is recouped', () => {
    const result = buildRecoupmentExample({
      ...base,
      terms: { recoupedFrom: 'not_recoupable', artistPersonallyLiable: false },
    });
    expect(result.rows.some((row) => row.label === 'Recoupable expenses')).toBe(false);
    expect(result.amountSubjectToSplitMinor).toBe(900_000);
  });

  it('can name the counterparty accurately when others are in the split', () => {
    const result = buildRecoupmentExample({
      ...base,
      counterpartyLabel: 'Altar.Camp and other participants',
      terms: { recoupedFrom: 'master_revenue', artistPersonallyLiable: false },
    });
    expect(result.rows.some((row) => row.label === 'Altar.Camp and other participants')).toBe(true);
  });
});

describe('formatMoney', () => {
  it('drops cents when they are zero', () => {
    expect(formatMoney(500_000)).toBe('$5,000');
    expect(formatMoney(123_456)).toBe('$1,234.56');
  });
});
