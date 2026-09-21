import {
  ALTAR_PARTY_ID,
  ALTAR_PARTY_NAME,
  DEFAULT_RECOUPMENT_TERMS,
  type CollaborationType,
  type ContributorRole,
  type MasterStructure,
  type RecordingStatus,
  type RecoupmentTerms,
  type RevenueCategory,
  type RightType,
  type SongStatus,
  type SplitLine,
} from '@altar/shared';
import { query, queryOne, type Queryable } from '../../db/pool.js';
import { notFound } from '../../lib/errors.js';

export interface SongRow {
  id: string;
  artist_id: string;
  title: string;
  collaboration_type: CollaborationType | null;
  recording_status: RecordingStatus;
  status: SongStatus;
  expected_release_date: string | null;
  notes: string | null;
  samples_declared: boolean;
  samples_cleared: boolean;
  sample_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributorRow {
  id: string;
  song_id: string;
  user_id: string | null;
  legal_name: string;
  stage_name: string | null;
  email: string | null;
  role: ContributorRole;
  pro_affiliation: string | null;
  publisher_name: string | null;
  requires_approval: boolean;
  approval_status: 'pending' | 'accepted' | 'change_requested' | 'declined';
  created_at: string;
}

export interface SplitRow {
  id: string;
  song_id: string | null;
  commitment_id: string | null;
  agreement_id: string | null;
  right_type: RightType | null;
  revenue_category: RevenueCategory | null;
  participant_kind: 'contributor' | 'label' | 'artist';
  contributor_id: string | null;
  artist_id: string | null;
  participant_name: string;
  bps: number;
  effective_from: string;
  effective_to: string | null;
}

export async function findSong(songId: string): Promise<SongRow> {
  const song = await queryOne<SongRow>(`SELECT * FROM songs WHERE id = $1`, [songId]);
  if (!song) throw notFound('That song does not exist.');
  return song;
}

export async function listSongs(artistId: string): Promise<SongRow[]> {
  return query<SongRow>(`SELECT * FROM songs WHERE artist_id = $1 ORDER BY created_at DESC`, [
    artistId,
  ]);
}

export async function listContributors(
  songId: string,
  client?: Queryable,
): Promise<ContributorRow[]> {
  return query<ContributorRow>(
    `SELECT * FROM contributors WHERE song_id = $1 ORDER BY created_at`,
    [songId],
    client,
  );
}

/** Live splits only: a row with effective_to set has been superseded and is kept for history. */
export async function listSplits(songId: string, client?: Queryable): Promise<SplitRow[]> {
  return query<SplitRow>(
    `SELECT * FROM splits WHERE song_id = $1 AND effective_to IS NULL ORDER BY created_at`,
    [songId],
    client,
  );
}

export async function listCommitmentSplits(
  commitmentId: string,
  client?: Queryable,
): Promise<SplitRow[]> {
  return query<SplitRow>(
    `SELECT * FROM splits WHERE commitment_id = $1 AND effective_to IS NULL ORDER BY created_at`,
    [commitmentId],
    client,
  );
}

export function toSplitLines(rows: readonly SplitRow[]): SplitLine[] {
  return rows.map((row) => ({
    participantId:
      row.participant_kind === 'label'
        ? ALTAR_PARTY_ID
        : ((row.contributor_id ?? row.artist_id) as string),
    participantName: row.participant_name,
    bps: row.bps,
  }));
}

export function ownershipLines(rows: readonly SplitRow[], rightType: RightType): SplitLine[] {
  return toSplitLines(rows.filter((row) => row.right_type === rightType));
}

export function revenueLines(
  rows: readonly SplitRow[],
): { category: RevenueCategory; lines: SplitLine[] }[] {
  const categories = [
    ...new Set(rows.filter((row) => row.revenue_category).map((row) => row.revenue_category)),
  ];
  return categories.map((category) => ({
    category: category as RevenueCategory,
    lines: toSplitLines(rows.filter((row) => row.revenue_category === category)),
  }));
}

/**
 * Replace a whole dimension in one transaction.
 *
 * Superseding rather than deleting keeps the history: "who changed my share, and when" is
 * answerable years later, which is the entire point of the platform (spec §30, §34).
 */
export interface SplitAsset {
  songId?: string;
  commitmentId?: string;
}

export async function replaceSplitDimension(
  client: Queryable,
  options: SplitAsset & {
    rightType?: RightType;
    revenueCategory?: RevenueCategory;
    /** 'artist' participants are the artist party in a one-year framework. */
    lines: {
      participantId: string;
      participantName: string;
      bps: number;
      kind?: 'contributor' | 'artist';
    }[];
    userId: string | null;
  },
): Promise<void> {
  const { songId, commitmentId, rightType, revenueCategory, lines, userId } = options;
  if (!songId && !commitmentId) {
    throw new Error('A split belongs to either a song or a commitment.');
  }
  const assetParams = [songId ?? null, commitmentId ?? null];

  await query(
    `UPDATE splits SET effective_to = CURRENT_DATE + 1, updated_at = now()
      WHERE song_id IS NOT DISTINCT FROM $1 AND commitment_id IS NOT DISTINCT FROM $2
        AND effective_to IS NULL
        AND ($3::right_type IS NULL OR right_type = $3::right_type)
        AND ($4::revenue_category IS NULL OR revenue_category = $4::revenue_category)
        AND (($3::right_type IS NOT NULL AND right_type IS NOT NULL)
          OR ($4::revenue_category IS NOT NULL AND revenue_category IS NOT NULL))`,
    [...assetParams, rightType ?? null, revenueCategory ?? null],
    client,
  );

  // A superseded row and its replacement share an asset, dimension and participant, so the
  // uniqueness index is satisfied by dropping rows that were superseded the same day.
  await query(
    `DELETE FROM splits
      WHERE song_id IS NOT DISTINCT FROM $1 AND commitment_id IS NOT DISTINCT FROM $2
        AND effective_to = CURRENT_DATE + 1 AND effective_from = CURRENT_DATE
        AND ($3::right_type IS NULL OR right_type = $3::right_type)
        AND ($4::revenue_category IS NULL OR revenue_category = $4::revenue_category)`,
    [...assetParams, rightType ?? null, revenueCategory ?? null],
    client,
  );

  for (const line of lines) {
    const isLabel = line.participantId === ALTAR_PARTY_ID;
    const kind = isLabel ? 'label' : (line.kind ?? 'contributor');
    await query(
      `INSERT INTO splits (song_id, commitment_id, right_type, revenue_category, participant_kind,
                           contributor_id, artist_id, participant_name, bps, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        songId ?? null,
        commitmentId ?? null,
        rightType ?? null,
        revenueCategory ?? null,
        kind,
        kind === 'contributor' ? line.participantId : null,
        kind === 'artist' ? line.participantId : null,
        isLabel ? ALTAR_PARTY_NAME : line.participantName,
        line.bps,
        userId,
      ],
      client,
    );
  }
}

export async function getMasterTerms(songId: string): Promise<{
  structure: MasterStructure;
  structure_note: string | null;
  license_term_months: number | null;
}> {
  const terms = await queryOne<{
    structure: MasterStructure;
    structure_note: string | null;
    license_term_months: number | null;
  }>(`SELECT structure, structure_note, license_term_months FROM master_terms WHERE song_id = $1`, [
    songId,
  ]);
  return terms ?? { structure: 'artist_owns_all', structure_note: null, license_term_months: null };
}

export async function getRecoupmentTerms(songId: string): Promise<{
  terms: RecoupmentTerms;
  acknowledgedAt: string | null;
  plannedExpenses: {
    category: string;
    description: string;
    amountMinor: number;
    recoupable: boolean;
  }[];
}> {
  const row = await queryOne<{
    id: string;
    payer: RecoupmentTerms['payer'];
    recoupable: boolean;
    recouped_from: RecoupmentTerms['recoupedFrom'];
    artist_personally_liable: boolean;
    after_recoupment: string;
    investment_cap_minor: number | null;
    acknowledged_at: string | null;
  }>(`SELECT * FROM recoupment_terms WHERE song_id = $1`, [songId]);

  if (!row) {
    return { terms: DEFAULT_RECOUPMENT_TERMS, acknowledgedAt: null, plannedExpenses: [] };
  }

  const expenses = await query<{
    category: string;
    description: string;
    amount_minor: number;
    recoupable: boolean;
  }>(
    `SELECT category::text, description, amount_minor, recoupable
       FROM planned_expenses WHERE recoupment_terms_id = $1 ORDER BY created_at`,
    [row.id],
  );

  return {
    terms: {
      payer: row.payer,
      recoupable: row.recoupable,
      recoupedFrom: row.recouped_from,
      artistPersonallyLiable: row.artist_personally_liable,
      afterRecoupment: row.after_recoupment,
      investmentCapMinor: row.investment_cap_minor,
    },
    acknowledgedAt: row.acknowledged_at,
    plannedExpenses: expenses.map((expense) => ({
      category: expense.category,
      description: expense.description,
      amountMinor: expense.amount_minor,
      recoupable: expense.recoupable,
    })),
  };
}

export async function getAgreementServices(songId: string): Promise<string[]> {
  const rows = await query<{ service_key: string }>(
    `SELECT DISTINCT s.service_key
       FROM agreement_services s
       JOIN agreements a ON a.id = s.agreement_id
      WHERE a.song_id = $1`,
    [songId],
  );
  return rows.map((row) => row.service_key);
}

export async function touchSong(
  songId: string,
  status?: SongStatus,
  client?: Queryable,
): Promise<void> {
  await query(
    `UPDATE songs SET updated_at = now(),
            status = CASE
              WHEN $2::song_status IS NULL THEN status
              WHEN array_position(enum_range(NULL::song_status), $2::song_status)
                 > array_position(enum_range(NULL::song_status), status) THEN $2::song_status
              ELSE status END
      WHERE id = $1`,
    [songId, status ?? null],
    client,
  );
}
