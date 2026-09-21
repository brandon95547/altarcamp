import type { DealPath, SongStatus } from '@altar/shared';
import { query, queryOne } from '../../db/pool.js';

export interface ActionItem {
  id: string;
  label: string;
  detail: string;
  href: string;
  severity: 'blocker' | 'todo';
}

/**
 * Spec §24. One query set, assembled into the five panels the artist sees on sign-in.
 * Everything here is derived — the dashboard never stores its own copy of a status.
 */
export async function buildDashboard(artistId: string) {
  const artist = await queryOne<{
    artist_name: string;
    deal_path: DealPath | null;
    onboarding_step: string;
    application_status: string | null;
  }>(
    `SELECT artist_name, deal_path, onboarding_step, application_status FROM artists WHERE id = $1`,
    [artistId],
  );

  const songs = await query<{
    id: string;
    title: string;
    status: SongStatus;
    recording_status: string;
    expected_release_date: string | null;
    composition_total: number | null;
    master_total: number | null;
    pending_contributors: number;
  }>(
    `SELECT s.id, s.title, s.status, s.recording_status, s.expected_release_date,
            (SELECT total_bps FROM v_ownership_totals o WHERE o.song_id = s.id AND o.right_type = 'composition') AS composition_total,
            (SELECT total_bps FROM v_ownership_totals o WHERE o.song_id = s.id AND o.right_type = 'master') AS master_total,
            (SELECT COUNT(*) FROM contributors c
              WHERE c.song_id = s.id AND c.requires_approval AND c.approval_status <> 'accepted')::int AS pending_contributors
       FROM songs s
      WHERE s.artist_id = $1
      ORDER BY s.created_at DESC`,
    [artistId],
  );

  const agreements = await query<{
    id: string;
    type: string;
    title: string;
    status: string;
    song_id: string | null;
    song_title: string | null;
    created_at: string;
    signed_by_me: boolean;
  }>(
    `SELECT ag.id, ag.type::text, ag.title, ag.status::text, ag.song_id, s.title AS song_title, ag.created_at,
            EXISTS (
              SELECT 1 FROM agreement_signers sg
               WHERE sg.agreement_id = ag.id AND sg.party = 'artist' AND sg.signed_at IS NOT NULL
            ) AS signed_by_me
       FROM agreements ag
       LEFT JOIN songs s ON s.id = ag.song_id
      WHERE ag.artist_id = $1 AND ag.status <> 'void'
      ORDER BY ag.created_at DESC`,
    [artistId],
  );

  const commitment = await queryOne<{
    id: string;
    start_date: string;
    end_date: string;
    status: string;
  }>(
    `SELECT id, start_date, end_date, status::text FROM commitments
      WHERE artist_id = $1 ORDER BY start_date DESC LIMIT 1`,
    [artistId],
  );

  const conflicts = await query<{ question_key: string }>(
    `SELECT question_key FROM rights_disclosures
      WHERE artist_id = $1 AND has_conflict = TRUE AND reviewed_at IS NULL`,
    [artistId],
  );

  const documentCount = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM documents WHERE artist_id = $1`,
    [artistId],
  );

  const actions: ActionItem[] = [];

  for (const song of songs) {
    if (song.pending_contributors > 0) {
      actions.push({
        id: `song-${song.id}-contributors`,
        label: 'Waiting on a collaborator',
        detail: `${song.pending_contributors} ${
          song.pending_contributors === 1 ? 'person has' : 'people have'
        } not approved their share of "${song.title}" yet.`,
        href: `/songs/${song.id}/contributors`,
        severity: 'todo',
      });
    }
    if ((song.composition_total ?? 0) !== 10_000) {
      actions.push({
        id: `song-${song.id}-composition`,
        label: 'Finish the songwriting split',
        detail: `"${song.title}" does not add up to 100% yet.`,
        href: `/songs/${song.id}/songwriting`,
        severity: 'blocker',
      });
    }
    if ((song.master_total ?? 0) !== 10_000) {
      actions.push({
        id: `song-${song.id}-master`,
        label: 'Set master ownership',
        detail: `Say who owns the recording of "${song.title}".`,
        href: `/songs/${song.id}/master`,
        severity: 'blocker',
      });
    }
  }

  for (const agreement of agreements) {
    if (
      !agreement.signed_by_me &&
      ['sent', 'viewed', 'partially_signed'].includes(agreement.status)
    ) {
      actions.push({
        id: `agreement-${agreement.id}`,
        label: 'Sign your agreement',
        detail: agreement.title,
        href: `/agreements/${agreement.id}`,
        severity: 'todo',
      });
    }
  }

  if (conflicts.length > 0) {
    actions.push({
      id: 'rights-review',
      label: 'Altar.Camp is reviewing your existing commitments',
      detail:
        'You told us about an existing label, distribution, publishing or management agreement. We review those before an agreement can be signed.',
      href: '/onboarding/existing-rights',
      severity: 'blocker',
    });
  }

  const today = new Date();
  const year = commitment
    ? {
        ...commitment,
        dayOfYear: Math.max(
          1,
          Math.min(
            365,
            Math.ceil((today.getTime() - new Date(commitment.start_date).getTime()) / 86_400_000) +
              1,
          ),
        ),
        totalDays: Math.round(
          (new Date(commitment.end_date).getTime() - new Date(commitment.start_date).getTime()) /
            86_400_000,
        ),
      }
    : null;

  return {
    artist: {
      name: artist?.artist_name ?? '',
      path: artist?.deal_path ?? null,
      onboardingStep: artist?.onboarding_step ?? 'account',
      applicationStatus: artist?.application_status ?? null,
    },
    year,
    actions,
    songs,
    agreements,
    documentCount: documentCount?.count ?? 0,
    /**
     * Spec §25 is phase 3. Rather than showing invented zeroes as if they were accounting,
     * phase 1 states plainly that the ledger opens when the first release earns.
     */
    money: {
      available: false,
      message:
        'Royalty accounting opens when your first release starts earning. Until then, every percentage that will be used to calculate it is already visible in your deal.',
    },
    mission: {
      available: Boolean(commitment),
      message: commitment
        ? 'Mission scheduling arrives with release management in the next phase.'
        : 'Mission activity appears here once your year begins.',
    },
  };
}
