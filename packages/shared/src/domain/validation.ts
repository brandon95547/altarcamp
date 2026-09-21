/**
 * Dispute prevention — spec §34.
 *
 * One evaluator, used in three places: the API refuses to generate or countersign an
 * agreement while a blocker stands, the artist-facing deal page lists the same issues in
 * plain English, and the admin rights view sorts by them. Keeping it in shared means the
 * browser can show the identical sentence the server would have refused with.
 */

import type { RevenueCategory } from './revenue.js';
import { REVENUE_CATEGORY_LABELS } from './revenue.js';
import { type SplitLine, validateSplit, BPS_TOTAL, sumBps, formatBps } from './splits.js';

export type IssueSeverity = 'blocker' | 'warning';

export interface DealIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  /** Which step of the flow fixes it — the UI turns this into a "Fix this" link. */
  fixStep:
    | 'contributors'
    | 'composition'
    | 'master'
    | 'revenue'
    | 'expenses'
    | 'clearances'
    | 'existing_rights'
    | 'signatures';
}

export interface DealSnapshot {
  songTitle: string;
  contributors: {
    id: string;
    name: string;
    role: string;
    /** A songwriter has to approve their own percentage — spec §8, §33. */
    approvalStatus: 'pending' | 'accepted' | 'change_requested' | 'declined';
    requiresApproval: boolean;
  }[];
  compositionSplits: SplitLine[];
  masterSplits: SplitLine[];
  revenueSplits: { category: RevenueCategory; lines: SplitLine[] }[];
  producerTermsRecorded: boolean;
  publishingOwnershipStated: boolean;
  samplesDeclared: boolean;
  samplesCleared: boolean;
  /** From the existing-rights questionnaire — spec §6. */
  existingLabelConflict: boolean;
  existingDistributionConflict: boolean;
  existingPublishingConflict: boolean;
  expensesAcknowledged: boolean;
}

export function evaluateDeal(snapshot: DealSnapshot): DealIssue[] {
  const issues: DealIssue[] = [];

  const composition = validateSplit(snapshot.compositionSplits, 'Songwriting ownership');
  for (const error of composition.errors) {
    issues.push({
      code: 'composition_not_100',
      severity: 'blocker',
      message: error,
      fixStep: 'composition',
    });
  }
  for (const warning of composition.warnings) {
    issues.push({
      code: 'composition_zero_line',
      severity: 'warning',
      message: warning,
      fixStep: 'composition',
    });
  }

  const master = validateSplit(snapshot.masterSplits, 'Master ownership');
  for (const error of master.errors) {
    issues.push({ code: 'master_not_100', severity: 'blocker', message: error, fixStep: 'master' });
  }
  for (const warning of master.warnings) {
    issues.push({
      code: 'master_zero_line',
      severity: 'warning',
      message: warning,
      fixStep: 'master',
    });
  }

  for (const split of snapshot.revenueSplits) {
    const total = sumBps(split.lines.map((line) => line.bps));
    if (split.lines.length > 0 && total !== BPS_TOTAL) {
      issues.push({
        code: 'revenue_not_100',
        severity: 'blocker',
        message: `${REVENUE_CATEGORY_LABELS[split.category]} adds up to ${formatBps(total)}. Every revenue category must total exactly 100% before anyone signs.`,
        fixStep: 'revenue',
      });
    }
  }

  const unapproved = snapshot.contributors.filter(
    (contributor) => contributor.requiresApproval && contributor.approvalStatus !== 'accepted',
  );
  for (const contributor of unapproved) {
    issues.push({
      code: 'contributor_not_approved',
      severity: contributor.approvalStatus === 'declined' ? 'blocker' : 'blocker',
      message:
        contributor.approvalStatus === 'change_requested'
          ? `${contributor.name} asked for a different percentage. Settle it before the agreement is generated.`
          : `${contributor.name} has not approved their share of "${snapshot.songTitle}" yet.`,
      fixStep: 'contributors',
    });
  }

  const hasProducer = snapshot.contributors.some((contributor) => contributor.role === 'producer');
  if (hasProducer && !snapshot.producerTermsRecorded) {
    issues.push({
      code: 'producer_terms_missing',
      severity: 'warning',
      message:
        'A producer is credited but no producer terms are recorded. Producer points are the most common source of a dispute after release.',
      fixStep: 'revenue',
    });
  }

  if (!snapshot.publishingOwnershipStated) {
    issues.push({
      code: 'publishing_unclear',
      severity: 'warning',
      message:
        'Publishing ownership is not stated. Owning the recording does not give anyone the song, so say plainly who controls the publishing.',
      fixStep: 'composition',
    });
  }

  if (snapshot.samplesDeclared && !snapshot.samplesCleared) {
    issues.push({
      code: 'sample_uncleared',
      severity: 'blocker',
      message: 'This recording uses a sample or interpolation that has not been cleared.',
      fixStep: 'clearances',
    });
  }

  if (snapshot.existingLabelConflict) {
    issues.push({
      code: 'existing_label',
      severity: 'blocker',
      message:
        'Another label may control this recording. Altar.Camp must review that agreement before this one can be signed.',
      fixStep: 'existing_rights',
    });
  }
  if (snapshot.existingDistributionConflict) {
    issues.push({
      code: 'existing_distribution',
      severity: 'warning',
      message:
        'An exclusive distribution agreement is on file. Two distributors cannot deliver the same recording — confirm which one releases this song.',
      fixStep: 'existing_rights',
    });
  }
  if (snapshot.existingPublishingConflict) {
    issues.push({
      code: 'existing_publishing',
      severity: 'warning',
      message:
        'A publishing agreement is on file. Confirm that it leaves you free to grant the publishing terms in this deal.',
      fixStep: 'existing_rights',
    });
  }

  if (!snapshot.expensesAcknowledged) {
    issues.push({
      code: 'expenses_not_acknowledged',
      severity: 'blocker',
      message: 'The expense and recoupment terms have not been reviewed yet.',
      fixStep: 'expenses',
    });
  }

  return issues;
}

export function blockers(issues: readonly DealIssue[]): DealIssue[] {
  return issues.filter((issue) => issue.severity === 'blocker');
}

export function isSignable(issues: readonly DealIssue[]): boolean {
  return blockers(issues).length === 0;
}
