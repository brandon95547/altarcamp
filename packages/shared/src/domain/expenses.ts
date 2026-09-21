/**
 * Expenses and recoupment — spec §11.
 *
 * Before signing, an artist should be able to answer: who pays, does it come back out of
 * revenue, out of which revenue, and do I personally owe money if the song never earns it.
 */

import type { ExpensePayer, RecoupmentSource } from './enums.js';
import { applyBps, type Bps } from './splits.js';

export const EXPENSE_CATEGORIES = [
  'recording',
  'production',
  'mixing',
  'mastering',
  'music_video',
  'marketing',
  'publicity',
  'artwork',
  'tour_support',
  'advance',
  'distribution',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  recording: 'Recording',
  production: 'Production',
  mixing: 'Mixing',
  mastering: 'Mastering',
  music_video: 'Music video',
  marketing: 'Marketing',
  publicity: 'Publicity',
  artwork: 'Artwork',
  tour_support: 'Tour support',
  advance: 'Advance',
  distribution: 'Distribution',
  other: 'Other',
};

/** The six questions every deal has to answer about money spent — spec §11. */
export interface RecoupmentTerms {
  /** Who writes the cheque. */
  payer: ExpensePayer;
  /** Whether Altar.Camp takes the money back out of revenue before splitting. */
  recoupable: boolean;
  /** Which revenue it is recouped from. */
  recoupedFrom: RecoupmentSource;
  /**
   * False means the artist never owes a personal debt: if the music does not earn it back,
   * Altar.Camp absorbs the shortfall. Phase 1 defaults to false, and the deal summary says so
   * in plain words.
   */
  artistPersonallyLiable: boolean;
  /** What happens once the investment is repaid — free text shown in the deal summary. */
  afterRecoupment: string;
  /** Ceiling on what Altar.Camp will spend under this agreement, in minor units (cents). */
  investmentCapMinor: number | null;
}

export const DEFAULT_RECOUPMENT_TERMS: RecoupmentTerms = {
  payer: 'altar',
  recoupable: true,
  recoupedFrom: 'master_revenue',
  artistPersonallyLiable: false,
  afterRecoupment:
    'Once Altar.Camp has recovered what it spent, revenue is split at the agreed percentages with nothing further deducted for these costs.',
  investmentCapMinor: null,
};

export interface RecoupmentExampleInput {
  grossRevenueMinor: number;
  distributionCostMinor: number;
  recoupableExpensesMinor: number;
  artistShareBps: Bps;
  terms: Pick<RecoupmentTerms, 'recoupedFrom' | 'artistPersonallyLiable'>;
  /**
   * What to call the other side of the split. With a producer or featured artist in the
   * split, the remainder is not Altar.Camp's alone, and the row should not pretend it is.
   */
  counterpartyLabel?: string;
}

export interface RecoupmentExampleRow {
  label: string;
  amountMinor: number;
  kind: 'input' | 'deduction' | 'subtotal' | 'share';
  note?: string;
}

export interface RecoupmentExample {
  rows: RecoupmentExampleRow[];
  amountSubjectToSplitMinor: number;
  artistShareMinor: number;
  altarShareMinor: number;
  /** Expenses still outstanding when revenue did not cover them. */
  unrecoupedBalanceMinor: number;
  artistOwesMinor: number;
}

/**
 * The worked example shown before signing — spec §11 ("The interface should show an example
 * before signing") and §25.
 *
 * The waterfall follows the terms rather than one hard-coded order: recouping before the
 * split and recouping from the artist's share are materially different deals.
 */
export function buildRecoupmentExample(input: RecoupmentExampleInput): RecoupmentExample {
  const { grossRevenueMinor, distributionCostMinor, recoupableExpensesMinor, artistShareBps } =
    input;

  const rows: RecoupmentExampleRow[] = [
    { label: 'Total master revenue', amountMinor: grossRevenueMinor, kind: 'input' },
    { label: 'Distribution costs', amountMinor: -distributionCostMinor, kind: 'deduction' },
  ];

  const afterDistribution = grossRevenueMinor - distributionCostMinor;
  const recoupBeforeSplit =
    input.terms.recoupedFrom === 'master_revenue' || input.terms.recoupedFrom === 'all_revenue';

  let amountSubjectToSplit = afterDistribution;
  let recoupedBeforeSplit = 0;
  let unrecouped = 0;

  if (recoupBeforeSplit) {
    recoupedBeforeSplit = Math.min(recoupableExpensesMinor, Math.max(afterDistribution, 0));
    unrecouped = recoupableExpensesMinor - recoupedBeforeSplit;
    amountSubjectToSplit = afterDistribution - recoupedBeforeSplit;
    rows.push({
      label: 'Recoupable expenses',
      amountMinor: -recoupedBeforeSplit,
      kind: 'deduction',
      note: 'Recovered before the revenue is split.',
    });
  }

  rows.push({
    label: 'Amount subject to split',
    amountMinor: amountSubjectToSplit,
    kind: 'subtotal',
  });

  let artistShare = applyBps(amountSubjectToSplit, artistShareBps);
  const altarShare = amountSubjectToSplit - artistShare;

  rows.push({ label: 'Artist share', amountMinor: artistShare, kind: 'share' });
  rows.push({
    label: input.counterpartyLabel ?? 'Altar.Camp share',
    amountMinor: altarShare,
    kind: 'share',
  });

  if (input.terms.recoupedFrom === 'artist_share_only') {
    const fromArtist = Math.min(recoupableExpensesMinor, Math.max(artistShare, 0));
    unrecouped = recoupableExpensesMinor - fromArtist;
    artistShare -= fromArtist;
    rows.push({
      label: 'Recoupable expenses',
      amountMinor: -fromArtist,
      kind: 'deduction',
      note: "Recovered from the artist's share only, after the split.",
    });
    rows.push({ label: 'Artist share after recoupment', amountMinor: artistShare, kind: 'share' });
  }

  return {
    rows,
    amountSubjectToSplitMinor: amountSubjectToSplit,
    artistShareMinor: artistShare,
    altarShareMinor: altarShare,
    unrecoupedBalanceMinor: unrecouped,
    artistOwesMinor: input.terms.artistPersonallyLiable ? unrecouped : 0,
  };
}

export function formatMoney(minor: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
