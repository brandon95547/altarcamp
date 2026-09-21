import { describe, expect, it } from 'vitest';
import { blockers, evaluateDeal, isSignable, type DealSnapshot } from './validation.js';

function snapshot(overrides: Partial<DealSnapshot> = {}): DealSnapshot {
  return {
    songTitle: 'Amazing Grace Again',
    contributors: [
      {
        id: 'a',
        name: 'Artist',
        role: 'primary_artist',
        approvalStatus: 'accepted',
        requiresApproval: false,
      },
      {
        id: 'b',
        name: 'Mary Jones',
        role: 'songwriter',
        approvalStatus: 'accepted',
        requiresApproval: true,
      },
    ],
    compositionSplits: [
      { participantId: 'a', participantName: 'Artist', bps: 7500 },
      { participantId: 'b', participantName: 'Mary Jones', bps: 2500 },
    ],
    masterSplits: [
      { participantId: 'a', participantName: 'Artist', bps: 5000 },
      { participantId: 'altar', participantName: 'Altar.Camp', bps: 5000 },
    ],
    revenueSplits: [
      {
        category: 'master_streaming',
        lines: [
          { participantId: 'a', participantName: 'Artist', bps: 5000 },
          { participantId: 'altar', participantName: 'Altar.Camp', bps: 5000 },
        ],
      },
    ],
    producerTermsRecorded: true,
    publishingOwnershipStated: true,
    samplesDeclared: false,
    samplesCleared: false,
    existingLabelConflict: false,
    existingDistributionConflict: false,
    existingPublishingConflict: false,
    expensesAcknowledged: true,
    ...overrides,
  };
}

describe('evaluateDeal', () => {
  it('passes a complete deal', () => {
    expect(isSignable(evaluateDeal(snapshot()))).toBe(true);
  });

  it('blocks when songwriting does not total 100%', () => {
    const issues = evaluateDeal(
      snapshot({
        compositionSplits: [{ participantId: 'a', participantName: 'Artist', bps: 9000 }],
      }),
    );
    expect(blockers(issues).some((issue) => issue.code === 'composition_not_100')).toBe(true);
  });

  it('blocks when a contributor has not approved their share', () => {
    const issues = evaluateDeal(
      snapshot({
        contributors: [
          {
            id: 'b',
            name: 'Mary Jones',
            role: 'songwriter',
            approvalStatus: 'pending',
            requiresApproval: true,
          },
        ],
      }),
    );
    const issue = blockers(issues).find(
      (candidate) => candidate.code === 'contributor_not_approved',
    );
    expect(issue?.message).toContain('Mary Jones');
    expect(issue?.fixStep).toBe('contributors');
  });

  it('blocks a declared but uncleared sample', () => {
    const issues = evaluateDeal(snapshot({ samplesDeclared: true, samplesCleared: false }));
    expect(blockers(issues).some((issue) => issue.code === 'sample_uncleared')).toBe(true);
  });

  it('allows a cleared sample', () => {
    const issues = evaluateDeal(snapshot({ samplesDeclared: true, samplesCleared: true }));
    expect(isSignable(issues)).toBe(true);
  });

  it('blocks while another label may control the recording', () => {
    const issues = evaluateDeal(snapshot({ existingLabelConflict: true }));
    expect(blockers(issues).some((issue) => issue.code === 'existing_label')).toBe(true);
  });

  it('warns, without blocking, on an unrecorded producer arrangement', () => {
    const issues = evaluateDeal(
      snapshot({
        contributors: [
          {
            id: 'p',
            name: 'D. Lee',
            role: 'producer',
            approvalStatus: 'accepted',
            requiresApproval: true,
          },
        ],
        producerTermsRecorded: false,
      }),
    );
    const producer = issues.find((issue) => issue.code === 'producer_terms_missing');
    expect(producer?.severity).toBe('warning');
    expect(isSignable(issues)).toBe(true);
  });

  it('blocks until the expense terms have been read', () => {
    const issues = evaluateDeal(snapshot({ expensesAcknowledged: false }));
    expect(blockers(issues).some((issue) => issue.code === 'expenses_not_acknowledged')).toBe(true);
  });

  it('blocks a revenue category that does not total 100%', () => {
    const issues = evaluateDeal(
      snapshot({
        revenueSplits: [
          {
            category: 'publishing',
            lines: [{ participantId: 'a', participantName: 'Artist', bps: 4000 }],
          },
        ],
      }),
    );
    expect(blockers(issues).some((issue) => issue.code === 'revenue_not_100')).toBe(true);
  });
});
