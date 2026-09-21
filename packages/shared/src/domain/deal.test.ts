import { describe, expect, it } from 'vitest';
import {
  buildDealSummary,
  buildFairDealDisclosure,
  buildFiveAnswers,
  type DealInput,
} from './deal.js';
import { DEFAULT_RECOUPMENT_TERMS } from './expenses.js';

const input: DealInput = {
  path: 'single_song',
  songTitle: 'Amazing Grace Again',
  termDescription: 'This agreement applies only to this recording.',
  masterStructure: 'shared',
  masterSplits: [
    { participantId: 'artist', participantName: 'River & Rule', bps: 5000 },
    { participantId: 'altar', participantName: 'Altar.Camp', bps: 5000 },
  ],
  compositionSplits: [{ participantId: 'artist', participantName: 'River & Rule', bps: 10_000 }],
  publishingAdministrator: null,
  revenueSplits: [
    {
      category: 'master_streaming',
      lines: [
        { participantId: 'artist', participantName: 'River & Rule', bps: 5000 },
        { participantId: 'altar', participantName: 'Altar.Camp', bps: 5000 },
      ],
    },
  ],
  recoupment: { ...DEFAULT_RECOUPMENT_TERMS, investmentCapMinor: 500_000 },
  services: ['Recording support', 'Distribution'],
  artistPartyIds: ['artist'],
};

describe('buildDealSummary', () => {
  it('keeps master and songwriting on separate rows', () => {
    const summary = buildDealSummary(input);
    const master = summary.rows.find((row) => row.label === 'Master ownership');
    const songwriting = summary.rows.find((row) => row.label === 'Songwriting');
    expect(master?.value).toBe('River & Rule — 50%, Altar.Camp — 50%');
    expect(songwriting?.value).toBe('River & Rule — 100%');
  });

  it('states the investment cap in money, not basis points', () => {
    const summary = buildDealSummary(input);
    expect(summary.rows.find((row) => row.label === 'Altar.Camp investment')?.value).toBe(
      'Up to $5,000',
    );
  });

  it('says plainly that the artist carries no personal debt', () => {
    const summary = buildDealSummary(input);
    expect(summary.rows.find((row) => row.label === 'Recoupment')?.note).toContain(
      'You do not personally owe',
    );
  });
});

describe('buildFairDealDisclosure', () => {
  it('separates what is kept from what is shared', () => {
    const disclosure = buildFairDealDisclosure(input);
    expect(disclosure.youKeep.some((item) => item.includes('song'))).toBe(true);
    expect(disclosure.youShare.some((item) => item.includes('recording'))).toBe(true);
    expect(disclosure.altarReceives.some((item) => item.includes('50%'))).toBe(true);
  });

  it('says outright when Altar.Camp takes no songwriting share', () => {
    const disclosure = buildFairDealDisclosure(input);
    expect(disclosure.youKeep).toContain('Altar.Camp takes no share of your songwriting.');
  });
});

describe('buildFiveAnswers', () => {
  it('answers all five', () => {
    const answers = buildFiveAnswers(
      input,
      ['Agreement.pdf'],
      'Altar.Camp through the distributor',
    );
    expect(answers.masterOwner).toContain('Altar.Camp — 50%');
    expect(answers.songOwner).toBe('River & Rule — 100%');
    expect(answers.whoGetsPaid).toContain('Master streaming revenue');
    expect(answers.whoCollects).toContain('distributor');
    expect(answers.provingDocuments).toEqual(['Agreement.pdf']);
  });
});
