import {
  ALTAR_PARTY_ID,
  ALTAR_PARTY_NAME,
  buildDealSummary,
  buildFairDealDisclosure,
  buildFiveAnswers,
  buildRecoupmentExample,
  evaluateDeal,
  REVENUE_CATEGORY_LABELS,
  revenueCategoriesFor,
  servicesFor,
  validateSplit,
  type CollaborationType,
  type DealInput,
  type DealIssue,
  type ExpenseCategory,
  type ExpensePayer,
  type MasterStructure,
  type RecordingStatus,
  type RecoupmentSource,
  type RevenueCategory,
  type RightType,
  type SplitLine,
} from '@altar/shared';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { badRequest, forbidden, unprocessable } from '../../lib/errors.js';
import { hasOpenRightsConflict } from '../artists/service.js';
import {
  findSong,
  getAgreementServices,
  getMasterTerms,
  getRecoupmentTerms,
  listContributors,
  listSplits,
  ownershipLines,
  replaceSplitDimension,
  revenueLines,
  touchSong,
  type ContributorRow,
  type SongRow,
} from './repo.js';

export interface SongDeal {
  song: SongRow;
  contributors: ContributorRow[];
  masterSplits: SplitLine[];
  compositionSplits: SplitLine[];
  publishingSplits: SplitLine[];
  revenueSplits: { category: string; lines: SplitLine[] }[];
  masterTerms: Awaited<ReturnType<typeof getMasterTerms>>;
  recoupment: Awaited<ReturnType<typeof getRecoupmentTerms>>;
  services: string[];
  issues: DealIssue[];
}

/** Every artist-facing route that touches a song goes through this first. */
export async function assertSongAccess(songId: string, artistId: string): Promise<SongRow> {
  const song = await findSong(songId);
  if (song.artist_id !== artistId) {
    throw forbidden('That song belongs to another artist.');
  }
  return song;
}

/**
 * One read that assembles the whole deal: the splits, the terms, the people, and the list of
 * everything still standing between this song and a signature.
 */
export async function loadSongDeal(songId: string): Promise<SongDeal> {
  const song = await findSong(songId);
  const [contributors, splits, masterTerms, recoupment, services, conflicts] = await Promise.all([
    listContributors(songId),
    listSplits(songId),
    getMasterTerms(songId),
    getRecoupmentTerms(songId),
    getAgreementServices(songId),
    hasOpenRightsConflict(song.artist_id),
  ]);

  const masterSplits = ownershipLines(splits, 'master');
  const compositionSplits = ownershipLines(splits, 'composition');
  const publishingSplits = ownershipLines(splits, 'publishing');
  const revenue = revenueLines(splits);

  const issues = evaluateDeal({
    songTitle: song.title,
    contributors: contributors.map((contributor) => ({
      id: contributor.id,
      name: contributor.stage_name || contributor.legal_name,
      role: contributor.role,
      approvalStatus: contributor.approval_status,
      requiresApproval: contributor.requires_approval,
    })),
    compositionSplits,
    masterSplits,
    revenueSplits: revenue,
    producerTermsRecorded: revenue.some((split) =>
      split.lines.some((line) =>
        contributors.some(
          (contributor) => contributor.id === line.participantId && contributor.role === 'producer',
        ),
      ),
    ),
    publishingOwnershipStated: publishingSplits.length > 0 || compositionSplits.length > 0,
    samplesDeclared: song.samples_declared,
    samplesCleared: song.samples_cleared,
    existingLabelConflict: conflicts.label,
    existingDistributionConflict: conflicts.distribution,
    existingPublishingConflict: conflicts.publishing,
    expensesAcknowledged: Boolean(recoupment.acknowledgedAt),
  });

  return {
    song,
    contributors,
    masterSplits,
    compositionSplits,
    publishingSplits,
    revenueSplits: revenue,
    masterTerms,
    recoupment,
    services:
      services.length > 0 ? services : servicesFor('single_song').map((service) => service.key),
    issues,
  };
}

export async function createSong(
  artistId: string,
  input: {
    title: string;
    collaborationType?: CollaborationType;
    recordingStatus?: RecordingStatus;
    expectedReleaseDate?: string | null;
    notes?: string;
  },
): Promise<SongRow> {
  return withTransaction(async (client) => {
    const song = await queryOne<SongRow>(
      `INSERT INTO songs (artist_id, title, collaboration_type, recording_status, expected_release_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        artistId,
        input.title,
        input.collaborationType ?? null,
        input.recordingStatus ?? 'idea',
        input.expectedReleaseDate ?? null,
        input.notes ?? null,
      ],
      client,
    );
    if (!song) throw new Error('Failed to create song');

    // The artist is a contributor to their own song from the start: it makes the split
    // builder usable immediately and keeps one representation of "who is on this record".
    const artist = await queryOne<{
      artist_name: string;
      legal_name: string;
      email: string;
      user_id: string;
    }>(
      `SELECT a.artist_name, u.legal_name, u.email, a.user_id
         FROM artists a JOIN users u ON u.id = a.user_id WHERE a.id = $1`,
      [artistId],
      client,
    );
    if (artist) {
      await query(
        `INSERT INTO contributors (song_id, user_id, legal_name, stage_name, email, role, requires_approval, approval_status, approved_at)
         VALUES ($1, $2, $3, $4, $5, 'primary_artist', FALSE, 'accepted', now())`,
        [song.id, artist.user_id, artist.legal_name, artist.artist_name, artist.email],
        client,
      );
    }

    await query(
      `INSERT INTO master_terms (song_id, structure) VALUES ($1, 'artist_owns_all')`,
      [song.id],
      client,
    );

    return song;
  });
}

export async function addContributor(
  songId: string,
  input: {
    legalName: string;
    stageName?: string;
    email?: string;
    role: string;
    proAffiliation?: string;
    publisherName?: string;
    requiresApproval?: boolean;
  },
): Promise<ContributorRow> {
  const contributor = await queryOne<ContributorRow>(
    `INSERT INTO contributors (song_id, legal_name, stage_name, email, role, pro_affiliation, publisher_name, requires_approval)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      songId,
      input.legalName,
      input.stageName ?? null,
      input.email || null,
      input.role,
      input.proAffiliation ?? null,
      input.publisherName ?? null,
      input.requiresApproval ?? true,
    ],
  );
  if (!contributor) throw new Error('Failed to add contributor');
  await touchSong(songId, 'collaborators_added');
  return contributor;
}

export async function removeContributor(songId: string, contributorId: string): Promise<void> {
  const signed = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM signatures s
       JOIN agreement_signers sg ON sg.id = s.signer_id
      WHERE sg.contributor_id = $1`,
    [contributorId],
  );
  if ((signed?.count ?? 0) > 0) {
    throw badRequest(
      'This person has already signed an agreement for this song. Removing them needs an amendment, not a delete.',
    );
  }
  await query(`DELETE FROM contributors WHERE id = $1 AND song_id = $2`, [contributorId, songId]);
}

/** Splits are replaced whole, validated first, and only when nothing is signed yet. */
export async function setOwnershipSplit(
  songId: string,
  userId: string,
  input: {
    rightType: RightType;
    lines: { participantId: string; participantName: string; bps: number }[];
    masterStructure?: MasterStructure;
    structureNote?: string;
  },
): Promise<void> {
  await assertUnsigned(songId);
  const contributors = await listContributors(songId);
  const lines = normaliseLines(input.lines, contributors);

  const label =
    input.rightType === 'master'
      ? 'Master ownership'
      : input.rightType === 'composition'
        ? 'Songwriting ownership'
        : 'Publishing ownership';
  const validation = validateSplit(lines, label);
  if (validation.errors.length > 0) {
    throw unprocessable(
      validation.errors[0] as string,
      validation.errors.map((message) => ({ path: 'lines', message })),
    );
  }

  await withTransaction(async (client) => {
    await replaceSplitDimension(client, {
      songId,
      rightType: input.rightType,
      lines,
      userId,
    });

    if (input.rightType === 'master' && input.masterStructure) {
      await query(
        `INSERT INTO master_terms (song_id, structure, structure_note)
         VALUES ($1, $2, $3)
         -- The uniqueness is a partial index (terms belong to a song OR a commitment), so the
       -- predicate has to be repeated here for Postgres to infer the arbiter index.
       ON CONFLICT (song_id) WHERE song_id IS NOT NULL DO UPDATE SET structure = EXCLUDED.structure,
                                             structure_note = EXCLUDED.structure_note,
                                             updated_at = now()`,
        [songId, input.masterStructure, input.structureNote ?? null],
        client,
      );
    }

    await touchSong(songId, 'splits_proposed', client);
  });
}

export async function setRevenueSplits(
  songId: string,
  userId: string,
  splits: {
    category: RevenueCategory;
    lines: { participantId: string; participantName: string; bps: number }[];
  }[],
): Promise<void> {
  await assertUnsigned(songId);
  const contributors = await listContributors(songId);

  for (const split of splits) {
    const lines = normaliseLines(split.lines, contributors);
    if (lines.length === 0) continue;
    const validation = validateSplit(lines, REVENUE_CATEGORY_LABELS[split.category]);
    if (validation.errors.length > 0) {
      throw unprocessable(validation.errors[0] as string);
    }
  }

  await withTransaction(async (client) => {
    for (const split of splits) {
      await replaceSplitDimension(client, {
        songId,
        revenueCategory: split.category,
        lines: normaliseLines(split.lines, contributors),
        userId,
      });
    }
    await touchSong(songId, 'splits_proposed', client);
  });
}

export async function setRecoupmentTerms(
  songId: string,
  input: {
    payer: ExpensePayer;
    recoupable: boolean;
    recoupedFrom: RecoupmentSource;
    artistPersonallyLiable: boolean;
    afterRecoupment: string;
    investmentCapMinor: number | null;
    plannedExpenses: {
      category: ExpenseCategory;
      description: string;
      amountMinor: number;
      recoupable: boolean;
    }[];
    acknowledged: boolean;
  },
): Promise<void> {
  await assertUnsigned(songId);
  await withTransaction(async (client) => {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO recoupment_terms (song_id, payer, recoupable, recouped_from, artist_personally_liable,
                                     after_recoupment, investment_cap_minor, acknowledged_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $8 THEN now() ELSE NULL END)
       -- The uniqueness is a partial index (terms belong to a song OR a commitment), so the
       -- predicate has to be repeated here for Postgres to infer the arbiter index.
       ON CONFLICT (song_id) WHERE song_id IS NOT NULL DO UPDATE SET
         payer = EXCLUDED.payer, recoupable = EXCLUDED.recoupable, recouped_from = EXCLUDED.recouped_from,
         artist_personally_liable = EXCLUDED.artist_personally_liable,
         after_recoupment = EXCLUDED.after_recoupment,
         investment_cap_minor = EXCLUDED.investment_cap_minor,
         acknowledged_at = COALESCE(EXCLUDED.acknowledged_at, recoupment_terms.acknowledged_at),
         updated_at = now()
       RETURNING id`,
      [
        songId,
        input.payer,
        input.recoupable,
        input.recoupedFrom,
        input.artistPersonallyLiable,
        input.afterRecoupment,
        input.investmentCapMinor,
        input.acknowledged,
      ],
      client,
    );
    if (!row) throw new Error('Failed to save recoupment terms');

    await query(`DELETE FROM planned_expenses WHERE recoupment_terms_id = $1`, [row.id], client);
    for (const expense of input.plannedExpenses) {
      await query(
        `INSERT INTO planned_expenses (recoupment_terms_id, category, description, amount_minor, recoupable)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.id, expense.category, expense.description, expense.amountMinor, expense.recoupable],
        client,
      );
    }
  });
}

export async function setClearances(
  songId: string,
  input: { samplesDeclared: boolean; samplesCleared: boolean; sampleNotes?: string },
): Promise<void> {
  await query(
    `UPDATE songs SET samples_declared = $2, samples_cleared = $3, sample_notes = $4, updated_at = now()
      WHERE id = $1`,
    [
      songId,
      input.samplesDeclared,
      input.samplesDeclared ? input.samplesCleared : false,
      input.sampleNotes ?? null,
    ],
  );
}

/** Once anything is signed, the numbers are frozen — changing them takes an amendment. */
export async function assertUnsigned(songId: string): Promise<void> {
  const signed = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM agreements
      WHERE song_id = $1 AND status IN ('signed', 'partially_signed')`,
    [songId],
  );
  if ((signed?.count ?? 0) > 0) {
    throw badRequest(
      'This song has a signed agreement. Percentages in a signed deal change by amendment, so that everyone affected agrees to the change in writing.',
    );
  }
}

/** Contributors must belong to this song; the label participates as itself. */
function normaliseLines(
  lines: { participantId: string; participantName: string; bps: number }[],
  contributors: ContributorRow[],
): SplitLine[] {
  return lines.map((line) => {
    if (line.participantId === ALTAR_PARTY_ID) {
      return { participantId: ALTAR_PARTY_ID, participantName: ALTAR_PARTY_NAME, bps: line.bps };
    }
    const contributor = contributors.find((candidate) => candidate.id === line.participantId);
    if (!contributor) {
      throw badRequest('That person is not on this song. Add them as a collaborator first.');
    }
    return {
      participantId: contributor.id,
      participantName: contributor.stage_name || contributor.legal_name,
      bps: line.bps,
    };
  });
}

/** Spec §12, §17, §35 — the three plain-English views of the deal. */
export async function buildDealViews(songId: string) {
  const deal = await loadSongDeal(songId);
  const artist = await queryOne<{ artist_name: string; legal_name: string }>(
    `SELECT a.artist_name, u.legal_name FROM artists a JOIN users u ON u.id = a.user_id WHERE a.id = $1`,
    [deal.song.artist_id],
  );

  const artistContributor = deal.contributors.find(
    (contributor) => contributor.role === 'primary_artist',
  );

  const dealInput: DealInput = {
    path: 'single_song',
    songTitle: deal.song.title,
    termDescription: 'This agreement applies only to this recording.',
    masterStructure: deal.masterTerms.structure,
    masterSplits: deal.masterSplits,
    compositionSplits: deal.compositionSplits,
    publishingAdministrator: null,
    revenueSplits: deal.revenueSplits as DealInput['revenueSplits'],
    recoupment: deal.recoupment.terms,
    services: deal.services.map((key) => key),
    artistPartyIds: artistContributor ? [artistContributor.id] : [],
  };

  const documents = await query<{ filename: string }>(
    `SELECT filename FROM documents WHERE song_id = $1 ORDER BY created_at DESC`,
    [songId],
  );

  const recoupableTotal = deal.recoupment.plannedExpenses
    .filter((expense) => expense.recoupable)
    .reduce((total, expense) => total + expense.amountMinor, 0);

  const primaryRevenueSplit =
    deal.revenueSplits.find((split) => split.category === 'master_streaming') ??
    deal.revenueSplits[0];

  // With a producer or featured artist in the split, the remainder after the artist's share
  // is not Altar.Camp's alone, and the example must not imply that it is.
  const counterpartyLabel =
    primaryRevenueSplit && primaryRevenueSplit.lines.length > 2
      ? 'Altar.Camp and other participants'
      : 'Altar.Camp share';

  const artistRevenueBps = (() => {
    const primary =
      deal.revenueSplits.find((split) => split.category === 'master_streaming') ??
      deal.revenueSplits[0];
    if (!primary || !artistContributor) return 5_000;
    return primary.lines
      .filter((line) => line.participantId === artistContributor.id)
      .reduce((total, line) => total + line.bps, 0);
  })();

  return {
    deal,
    summary: buildDealSummary(dealInput),
    disclosure: buildFairDealDisclosure({
      ...dealInput,
      services: servicesFor('single_song')
        .filter((service) => deal.services.includes(service.key))
        .map((service) => service.label),
    }),
    fiveAnswers: buildFiveAnswers(
      dealInput,
      documents.map((document) => document.filename),
      'Altar.Camp collects master revenue through the distributor; writers collect publishing through their own PRO and publisher.',
    ),
    example: buildRecoupmentExample({
      grossRevenueMinor: 1_000_000,
      distributionCostMinor: 100_000,
      recoupableExpensesMinor: recoupableTotal > 0 ? recoupableTotal : 200_000,
      artistShareBps: artistRevenueBps,
      terms: {
        recoupedFrom: deal.recoupment.terms.recoupable
          ? deal.recoupment.terms.recoupedFrom
          : 'not_recoupable',
        artistPersonallyLiable: deal.recoupment.terms.artistPersonallyLiable,
      },
      counterpartyLabel,
    }),
    artist,
    availableRevenueCategories: revenueCategoriesFor('single_song'),
  };
}
