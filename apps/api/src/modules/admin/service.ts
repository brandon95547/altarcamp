import {
  revenueCategoriesFor,
  servicesFor,
  YEAR_ACTIVITIES,
  type ActivityCommitment,
  type RevenueCategory,
} from '@altar/shared';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { notify } from '../../lib/notifications.js';
import { replaceSplitDimension } from '../songs/repo.js';

/** Spec §26 — the numbers on the admin landing page, each one a link to a work queue. */
export async function adminOverview() {
  const [artists, releases, contracts, rights] = await Promise.all([
    queryOne<Record<string, number>>(
      `SELECT
         COUNT(*) FILTER (WHERE application_status IN ('started','profile_complete','mission_application_complete'))::int AS applicants,
         COUNT(*) FILTER (WHERE deal_path = 'single_song')::int AS single_song,
         COUNT(*) FILTER (WHERE deal_path = 'one_year')::int AS one_year,
         COUNT(*) FILTER (WHERE application_status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE application_status = 'altar_review')::int AS awaiting_review,
         COUNT(*)::int AS total
       FROM artists`,
    ),
    queryOne<Record<string, number>>(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('created','collaborators_added','splits_proposed'))::int AS rights_incomplete,
         COUNT(*) FILTER (WHERE status = 'splits_approved')::int AS needs_review,
         COUNT(*) FILTER (WHERE status IN ('agreement_signed','production'))::int AS in_production,
         COUNT(*) FILTER (WHERE status = 'released')::int AS released,
         COUNT(*)::int AS total
       FROM songs`,
    ),
    queryOne<Record<string, number>>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
         COUNT(*) FILTER (WHERE status = 'viewed')::int AS viewed,
         COUNT(*) FILTER (WHERE status = 'partially_signed')::int AS partially_signed,
         COUNT(*) FILTER (WHERE status = 'signed')::int AS signed,
         COUNT(*) FILTER (WHERE status = 'amendment_required')::int AS amendment_required
       FROM agreements`,
    ),
    queryOne<Record<string, number>>(
      `SELECT COUNT(DISTINCT artist_id)::int AS artists_with_open_conflicts
         FROM rights_disclosures WHERE has_conflict = TRUE AND reviewed_at IS NULL`,
    ),
  ]);

  // Songs whose splits do not balance — the queue that prevents disputes later (spec §34).
  const unbalanced = await query<{ id: string; title: string; artist_name: string; issue: string }>(
    `SELECT s.id, s.title, a.artist_name,
            CASE
              WHEN COALESCE(c.total_bps, 0) <> 10000 THEN 'Songwriting does not total 100%'
              ELSE 'Master ownership does not total 100%'
            END AS issue
       FROM songs s
       JOIN artists a ON a.id = s.artist_id
       LEFT JOIN v_ownership_totals c ON c.song_id = s.id AND c.right_type = 'composition'
       LEFT JOIN v_ownership_totals m ON m.song_id = s.id AND m.right_type = 'master'
      WHERE COALESCE(c.total_bps, 0) <> 10000 OR COALESCE(m.total_bps, 0) <> 10000
      ORDER BY s.created_at DESC
      LIMIT 25`,
  );

  return { artists, releases, contracts, rights, unbalanced };
}

export async function listArtists(filter: { status?: string; path?: string } = {}) {
  return query(
    `SELECT a.id, a.artist_name, u.legal_name, u.email, a.deal_path::text, a.onboarding_step::text,
            a.application_status::text, a.created_at,
            (SELECT COUNT(*) FROM songs s WHERE s.artist_id = a.id)::int AS song_count,
            (SELECT COUNT(*) FROM agreements ag WHERE ag.artist_id = a.id AND ag.status = 'signed')::int AS signed_count,
            EXISTS (SELECT 1 FROM rights_disclosures r
                     WHERE r.artist_id = a.id AND r.has_conflict AND r.reviewed_at IS NULL) AS has_conflict
       FROM artists a JOIN users u ON u.id = a.user_id
      WHERE ($1::text IS NULL OR a.application_status::text = $1)
        AND ($2::text IS NULL OR a.deal_path::text = $2)
      ORDER BY a.created_at DESC`,
    [filter.status ?? null, filter.path ?? null],
  );
}

export async function artistDetail(artistId: string) {
  const artist = await queryOne(
    `SELECT a.*, u.legal_name, u.email, u.phone FROM artists a JOIN users u ON u.id = a.user_id
      WHERE a.id = $1`,
    [artistId],
  );
  if (!artist) throw notFound('Artist not found.');

  const [profile, rights, application, answers, songs, agreements, commitments] = await Promise.all(
    [
      queryOne(`SELECT * FROM artist_profiles WHERE artist_id = $1`, [artistId]),
      query(`SELECT * FROM rights_disclosures WHERE artist_id = $1`, [artistId]),
      queryOne(`SELECT * FROM mission_applications WHERE artist_id = $1`, [artistId]),
      query(
        `SELECT ma.question_key, ma.value FROM mission_answers ma
         JOIN mission_applications m ON m.id = ma.application_id WHERE m.artist_id = $1`,
        [artistId],
      ),
      query(
        `SELECT id, title, status::text, recording_status::text, created_at FROM songs WHERE artist_id = $1`,
        [artistId],
      ),
      query(
        `SELECT id, type::text, status::text, title, created_at FROM agreements WHERE artist_id = $1 ORDER BY created_at DESC`,
        [artistId],
      ),
      query(`SELECT * FROM commitments WHERE artist_id = $1 ORDER BY start_date DESC`, [artistId]),
    ],
  );

  return { artist, profile, rights, application, answers, songs, agreements, commitments };
}

export async function reviewRightsDisclosure(
  artistId: string,
  questionKey: string,
  reviewerId: string,
  notes: string,
): Promise<void> {
  const updated = await query(
    `UPDATE rights_disclosures SET reviewed_at = now(), reviewed_by = $3, review_notes = $4
      WHERE artist_id = $1 AND question_key = $2 RETURNING id`,
    [artistId, questionKey, reviewerId, notes],
  );
  if (updated.length === 0) throw notFound('No disclosure to review.');
}

export async function setApplicationStatus(
  artistId: string,
  status: string,
  reviewerId: string,
  notes?: string,
): Promise<void> {
  await withTransaction(async (client) => {
    await query(
      `UPDATE mission_applications SET status = $2::application_status, reviewed_by = $3,
              review_notes = COALESCE($4, review_notes), updated_at = now(),
              decided_at = CASE WHEN $2 IN ('terms_proposed','closed') THEN now() ELSE decided_at END
        WHERE artist_id = $1`,
      [artistId, status, reviewerId, notes ?? null],
      client,
    );
    await query(
      `UPDATE artists SET application_status = $2::application_status, updated_at = now() WHERE id = $1`,
      [artistId, status],
      client,
    );
    const owner = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM artists WHERE id = $1`,
      [artistId],
      client,
    );
    if (owner) {
      await notify(
        {
          userId: owner.user_id,
          type: 'application_status_changed',
          title: 'Your application moved forward',
          body: `Status: ${status.replace(/_/g, ' ')}.`,
          link: '/dashboard',
        },
        client,
      );
    }
  });
}

export interface ProposeTermsInput {
  artistId: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  masterArtistBps: number;
  masterAltarBps: number;
  compositionArtistBps: number;
  compositionAltarBps: number;
  revenue: { category: RevenueCategory; artistBps: number; altarBps: number }[];
  activities: { key: string; level: ActivityCommitment; note?: string }[];
  investmentCapMinor: number | null;
  recoupedFrom: string;
  createdBy: string;
}

/**
 * Spec §27 "Terms Proposed". Builds the one-year framework: a commitment, the framework
 * splits, the activity schedule and the recoupment terms. The agreement itself is generated
 * separately, so staff can review the numbers before anything is rendered.
 */
export async function proposeYearTerms(
  input: ProposeTermsInput,
): Promise<{ commitmentId: string }> {
  const artist = await queryOne<{ id: string; artist_name: string; user_id: string }>(
    `SELECT id, artist_name, user_id FROM artists WHERE id = $1`,
    [input.artistId],
  );
  if (!artist) throw notFound('Artist not found.');

  for (const [label, total] of [
    ['Master ownership', input.masterArtistBps + input.masterAltarBps],
    ['Songwriting ownership', input.compositionArtistBps + input.compositionAltarBps],
  ] as const) {
    if (total !== 10_000) {
      throw badRequest(`${label} must total exactly 100%. It totals ${total / 100}%.`);
    }
  }
  for (const category of input.revenue) {
    if (category.artistBps + category.altarBps !== 10_000) {
      throw badRequest(`${category.category} must total exactly 100%.`);
    }
  }

  return withTransaction(async (client) => {
    const commitment = await queryOne<{ id: string }>(
      `INSERT INTO commitments (artist_id, start_date, end_date, auto_renew, status)
       VALUES ($1, $2, $3, $4, 'terms_proposed') RETURNING id`,
      [input.artistId, input.startDate, input.endDate, input.autoRenew],
      client,
    );
    if (!commitment) throw new Error('Failed to create commitment');

    const artistLine = {
      participantId: artist.id,
      participantName: artist.artist_name,
      kind: 'artist' as const,
    };

    await replaceSplitDimension(client, {
      commitmentId: commitment.id,
      rightType: 'master',
      lines: [
        { ...artistLine, bps: input.masterArtistBps },
        { participantId: 'altar', participantName: 'Altar.Camp', bps: input.masterAltarBps },
      ],
      userId: input.createdBy,
    });

    await replaceSplitDimension(client, {
      commitmentId: commitment.id,
      rightType: 'composition',
      lines: [
        { ...artistLine, bps: input.compositionArtistBps },
        { participantId: 'altar', participantName: 'Altar.Camp', bps: input.compositionAltarBps },
      ],
      userId: input.createdBy,
    });

    for (const category of input.revenue) {
      await replaceSplitDimension(client, {
        commitmentId: commitment.id,
        revenueCategory: category.category,
        lines: [
          { ...artistLine, bps: category.artistBps },
          { participantId: 'altar', participantName: 'Altar.Camp', bps: category.altarBps },
        ],
        userId: input.createdBy,
      });
    }

    for (const activity of input.activities) {
      if (!YEAR_ACTIVITIES.some((candidate) => candidate.key === activity.key)) {
        throw badRequest(`Unknown activity: ${activity.key}`);
      }
      await query(
        `INSERT INTO commitment_activities (commitment_id, activity_key, level, note)
         VALUES ($1, $2, $3::activity_commitment, $4)
         ON CONFLICT (commitment_id, activity_key) DO UPDATE SET level = EXCLUDED.level, note = EXCLUDED.note`,
        [commitment.id, activity.key, activity.level, activity.note ?? null],
        client,
      );
    }

    await query(
      `INSERT INTO recoupment_terms (commitment_id, payer, recoupable, recouped_from,
                                     artist_personally_liable, after_recoupment, investment_cap_minor,
                                     acknowledged_at)
       VALUES ($1, 'altar', TRUE, $2::recoupment_source, FALSE, $3, $4, now())`,
      [
        commitment.id,
        input.recoupedFrom,
        'Once Altar.Camp has recovered what it spent, revenue is split at the agreed percentages with nothing further deducted for those costs.',
        input.investmentCapMinor,
      ],
      client,
    );

    await query(
      `UPDATE artists SET application_status = 'terms_proposed', updated_at = now() WHERE id = $1`,
      [input.artistId],
      client,
    );
    await query(
      `UPDATE mission_applications SET status = 'terms_proposed', updated_at = now() WHERE artist_id = $1`,
      [input.artistId],
      client,
    );

    await notify(
      {
        userId: artist.user_id,
        type: 'application_status_changed',
        title: 'Altar.Camp has proposed your year',
        body: 'Your terms are ready to read. Nothing is signed until you decide.',
        link: '/dashboard',
      },
      client,
    );

    return { commitmentId: commitment.id };
  });
}

export function yearTermDefaults() {
  return {
    revenueCategories: revenueCategoriesFor('one_year'),
    services: servicesFor('one_year'),
    activities: YEAR_ACTIVITIES,
  };
}

export async function listAgreements(status?: string) {
  return query(
    `SELECT ag.id, ag.type::text, ag.status::text, ag.title, ag.created_at, ag.sent_at, ag.completed_at,
            a.artist_name, s.title AS song_title,
            (SELECT COUNT(*) FROM agreement_signers sg WHERE sg.agreement_id = ag.id)::int AS signer_count,
            (SELECT COUNT(*) FROM agreement_signers sg WHERE sg.agreement_id = ag.id AND sg.signed_at IS NOT NULL)::int AS signed_count
       FROM agreements ag
       JOIN artists a ON a.id = ag.artist_id
       LEFT JOIN songs s ON s.id = ag.song_id
      WHERE ($1::text IS NULL OR ag.status::text = $1)
      ORDER BY ag.created_at DESC`,
    [status ?? null],
  );
}

export async function auditTrail(entityType?: string, entityId?: string) {
  return query(
    `SELECT l.id, l.action, l.entity_type, l.entity_id, l.metadata, l.created_at, l.ip,
            u.legal_name AS actor_name, l.actor_role::text
       FROM audit_logs l LEFT JOIN users u ON u.id = l.actor_user_id
      WHERE ($1::text IS NULL OR l.entity_type = $1)
        AND ($2::uuid IS NULL OR l.entity_id = $2)
      ORDER BY l.created_at DESC LIMIT 200`,
    [entityType ?? null, entityId ?? null],
  );
}
