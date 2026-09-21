/**
 * The plain-English artefacts: the deal summary (spec §12), the fair-deal disclosure
 * (spec §17) and Your Five Answers (spec §35).
 *
 * These are derived views over the stored splits and terms. They are computed rather than
 * authored so they cannot drift from what the agreement actually says.
 */

import type { DealPath, MasterStructure } from './enums.js';
import { MASTER_STRUCTURE_LABELS } from './enums.js';
import type { RecoupmentTerms } from './expenses.js';
import { formatMoney } from './expenses.js';
import { RECOUPMENT_SOURCE_LABELS } from './enums.js';
import type { RevenueCategory } from './revenue.js';
import { REVENUE_CATEGORY_LABELS } from './revenue.js';
import { formatBps, type SplitLine } from './splits.js';

export const ALTAR_PARTY_ID = 'altar';
export const ALTAR_PARTY_NAME = 'Altar.Camp';

export interface DealInput {
  path: DealPath;
  songTitle: string | null;
  termDescription: string;
  masterStructure: MasterStructure;
  masterSplits: SplitLine[];
  compositionSplits: SplitLine[];
  publishingAdministrator: string | null;
  revenueSplits: { category: RevenueCategory; lines: SplitLine[] }[];
  recoupment: RecoupmentTerms;
  services: string[];
  artistPartyIds: string[];
}

export interface DealSummaryRow {
  label: string;
  value: string;
  /** Extra plain-English line under the value. */
  note?: string;
}

export interface DealSummary {
  heading: string;
  rows: DealSummaryRow[];
}

function describeSplit(lines: readonly SplitLine[]): string {
  if (lines.length === 0) return 'Not set';
  return lines.map((line) => `${line.participantName} — ${formatBps(line.bps)}`).join(', ');
}

function shareOf(lines: readonly SplitLine[], participantId: string): number {
  return lines
    .filter((line) => line.participantId === participantId)
    .reduce((total, line) => total + line.bps, 0);
}

export function buildDealSummary(input: DealInput): DealSummary {
  const rows: DealSummaryRow[] = [];

  rows.push({
    label: input.path === 'single_song' ? 'Song' : 'Commitment',
    value: input.songTitle ?? 'One-year Altar.Camp artist & missionary',
  });
  rows.push({ label: 'Agreement length', value: input.termDescription });
  rows.push({
    label: 'Master ownership',
    value: describeSplit(input.masterSplits),
    note: MASTER_STRUCTURE_LABELS[input.masterStructure],
  });
  rows.push({
    label: 'Songwriting',
    value: describeSplit(input.compositionSplits),
    note: 'Songwriting is the song itself — separate from who owns the recording.',
  });

  for (const split of input.revenueSplits) {
    rows.push({
      label: REVENUE_CATEGORY_LABELS[split.category],
      value: describeSplit(split.lines),
    });
  }

  rows.push({
    label: 'Publishing',
    value: input.publishingAdministrator
      ? `Administered by ${input.publishingAdministrator}`
      : 'Artist retains and administers their own publishing.',
  });

  rows.push({
    label: 'Altar.Camp investment',
    value:
      input.recoupment.investmentCapMinor === null
        ? 'Agreed per project in writing.'
        : `Up to ${formatMoney(input.recoupment.investmentCapMinor)}`,
  });

  rows.push({
    label: 'Recoupment',
    value: input.recoupment.recoupable
      ? RECOUPMENT_SOURCE_LABELS[input.recoupment.recoupedFrom]
      : 'Nothing is recouped.',
    note: input.recoupment.artistPersonallyLiable
      ? 'If revenue does not cover these costs, the balance remains owed.'
      : 'If revenue never covers these costs, Altar.Camp absorbs the difference. You do not personally owe the money.',
  });

  return {
    heading: input.path === 'single_song' ? 'Your Altar.Camp song deal' : 'Your Altar.Camp year',
    rows,
  };
}

export interface FairDealDisclosure {
  youKeep: string[];
  youShare: string[];
  altarReceives: string[];
  altarProvides: string[];
}

/** Spec §17 — four columns, written so someone new to the industry can read them. */
export function buildFairDealDisclosure(input: DealInput): FairDealDisclosure {
  const youKeep: string[] = [];
  const youShare: string[] = [];
  const altarReceives: string[] = [];

  const altarMaster = shareOf(input.masterSplits, ALTAR_PARTY_ID);
  const artistMaster = input.artistPartyIds.reduce(
    (total, id) => total + shareOf(input.masterSplits, id),
    0,
  );
  const altarComposition = shareOf(input.compositionSplits, ALTAR_PARTY_ID);
  const artistComposition = input.artistPartyIds.reduce(
    (total, id) => total + shareOf(input.compositionSplits, id),
    0,
  );

  if (artistMaster > 0) {
    youKeep.push(
      artistMaster === 10_000
        ? 'You own the recording outright.'
        : `${formatBps(artistMaster)} of the recording.`,
    );
  }
  if (artistComposition > 0) {
    youKeep.push(
      artistComposition === 10_000
        ? 'You own the song — the lyrics, melody and composition.'
        : `${formatBps(artistComposition)} of the songwriting.`,
    );
  }
  if (altarComposition === 0) {
    youKeep.push('Altar.Camp takes no share of your songwriting.');
  }
  youKeep.push('Your name, your voice, your audience and your catalog outside this agreement.');

  if (altarMaster > 0 && artistMaster > 0) {
    youShare.push(
      `The recording: you ${formatBps(artistMaster)}, Altar.Camp ${formatBps(altarMaster)}.`,
    );
  }
  for (const split of input.revenueSplits) {
    const altarShare = shareOf(split.lines, ALTAR_PARTY_ID);
    if (altarShare > 0) {
      youShare.push(
        `${REVENUE_CATEGORY_LABELS[split.category]} — Altar.Camp receives ${formatBps(altarShare)}.`,
      );
    }
  }
  if (input.recoupment.recoupable) {
    youShare.push(
      `Costs Altar.Camp pays up front come back out of ${RECOUPMENT_SOURCE_LABELS[
        input.recoupment.recoupedFrom
      ].toLowerCase()}.`,
    );
  }

  if (altarMaster > 0) {
    altarReceives.push(`${formatBps(altarMaster)} of the master recording.`);
  }
  if (
    input.masterStructure === 'exclusive_license' ||
    input.masterStructure === 'limited_term_license'
  ) {
    altarReceives.push(MASTER_STRUCTURE_LABELS[input.masterStructure] + '.');
  }
  for (const split of input.revenueSplits) {
    const altarShare = shareOf(split.lines, ALTAR_PARTY_ID);
    if (altarShare > 0) {
      altarReceives.push(
        `${formatBps(altarShare)} of ${REVENUE_CATEGORY_LABELS[split.category].toLowerCase()}.`,
      );
    }
  }
  altarReceives.push('The right to distribute and promote the work this agreement covers.');

  return {
    youKeep,
    youShare: youShare.length > 0 ? youShare : ['Nothing is shared under this agreement.'],
    altarReceives,
    altarProvides: input.services,
  };
}

export interface FiveAnswers {
  masterOwner: string;
  songOwner: string;
  whoGetsPaid: string;
  whoCollects: string;
  provingDocuments: string[];
}

/** Spec §35 — the last page of every deal. */
export function buildFiveAnswers(
  input: DealInput,
  documents: string[],
  collectingParty: string,
): FiveAnswers {
  const primaryRevenue = input.revenueSplits[0];
  return {
    masterOwner: describeSplit(input.masterSplits),
    songOwner: describeSplit(input.compositionSplits),
    whoGetsPaid: primaryRevenue
      ? `${REVENUE_CATEGORY_LABELS[primaryRevenue.category]}: ${describeSplit(primaryRevenue.lines)}`
      : 'Not set',
    whoCollects: collectingParty,
    provingDocuments: documents,
  };
}
