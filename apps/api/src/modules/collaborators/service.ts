import { ALTAR_PARTY_ID, formatBps, type InvitationStatus } from '@altar/shared';
import { loadConfig } from '../../config.js';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { generateToken, hashToken } from '../../lib/crypto.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { notify } from '../../lib/notifications.js';
import { listSplits } from '../songs/repo.js';

const INVITATION_TTL_DAYS = 30;

export interface InvitationView {
  id: string;
  status: InvitationStatus;
  songTitle: string;
  artistName: string;
  contributorName: string;
  contributorRole: string;
  proposedBps: number | null;
  requestedBps: number | null;
  message: string | null;
  expiresAt: string;
  respondedAt: string | null;
}

/**
 * Spec §33. The invitation carries the proposed percentage, because "approve your split"
 * with no number on the screen is exactly the ambiguity this product exists to remove.
 */
export async function inviteContributor(
  songId: string,
  contributorId: string,
  invitedBy: string,
  message?: string,
): Promise<{ token: string; url: string }> {
  const contributor = await queryOne<{
    id: string;
    legal_name: string;
    email: string | null;
    song_id: string;
  }>(`SELECT id, legal_name, email, song_id FROM contributors WHERE id = $1 AND song_id = $2`, [
    contributorId,
    songId,
  ]);
  if (!contributor) throw notFound('That collaborator is not on this song.');

  const splits = await listSplits(songId);
  const proposedBps = splits
    .filter((split) => split.contributor_id === contributorId && split.right_type === 'composition')
    .reduce((total, split) => total + split.bps, 0);

  const token = generateToken();
  await withTransaction(async (client) => {
    await query(
      `UPDATE invitations SET status = 'expired'
        WHERE contributor_id = $1 AND status = 'pending'`,
      [contributorId],
      client,
    );
    await query(
      `INSERT INTO invitations (song_id, contributor_id, invited_by, token_hash, proposed_bps, message, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval)`,
      [
        songId,
        contributorId,
        invitedBy,
        hashToken(token),
        proposedBps || null,
        message ?? null,
        INVITATION_TTL_DAYS,
      ],
      client,
    );

    // If the collaborator already has an Altar.Camp account, they also get it in-app.
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE lower(email) = lower($1)`,
      [contributor.email ?? ''],
      client,
    );
    if (existing) {
      await notify(
        {
          userId: existing.id,
          type: 'collaborator_invited',
          title: 'You were invited to collaborate',
          body: `Your proposed songwriting share is ${formatBps(proposedBps)}.`,
          link: `/invitations/${token}`,
        },
        client,
      );
    }
  });

  const config = loadConfig();
  return { token, url: `${config.PUBLIC_WEB_URL}/invitations/${token}` };
}

export async function viewInvitation(token: string): Promise<InvitationView> {
  const invitation = await queryOne<{
    id: string;
    status: InvitationStatus;
    song_title: string;
    artist_name: string;
    contributor_name: string;
    contributor_role: string;
    proposed_bps: number | null;
    requested_bps: number | null;
    message: string | null;
    expires_at: string;
    responded_at: string | null;
  }>(
    `SELECT i.id, i.status, s.title AS song_title, a.artist_name,
            COALESCE(c.stage_name, c.legal_name) AS contributor_name, c.role::text AS contributor_role,
            i.proposed_bps, i.requested_bps, i.message, i.expires_at, i.responded_at
       FROM invitations i
       JOIN contributors c ON c.id = i.contributor_id
       JOIN songs s ON s.id = i.song_id
       JOIN artists a ON a.id = s.artist_id
      WHERE i.token_hash = $1`,
    [hashToken(token)],
  );
  if (!invitation) throw notFound('That invitation link is not valid.');
  return {
    id: invitation.id,
    status: invitation.status,
    songTitle: invitation.song_title,
    artistName: invitation.artist_name,
    contributorName: invitation.contributor_name,
    contributorRole: invitation.contributor_role,
    proposedBps: invitation.proposed_bps,
    requestedBps: invitation.requested_bps,
    message: invitation.message,
    expiresAt: invitation.expires_at,
    respondedAt: invitation.responded_at,
  };
}

/**
 * Accept, or ask for a different number. A change request does not silently rewrite the
 * split — it records what was asked for and tells the artist, because the song cannot reach
 * an agreement until the people in it agree (spec §33).
 */
export async function respondToInvitation(
  token: string,
  action: 'accept' | 'request_change' | 'decline',
  requestedBps?: number,
  message?: string,
): Promise<{ status: InvitationStatus }> {
  const invitation = await queryOne<{
    id: string;
    song_id: string;
    contributor_id: string;
    status: InvitationStatus;
    proposed_bps: number | null;
    expires_at: string;
  }>(
    `SELECT id, song_id, contributor_id, status, proposed_bps, expires_at
       FROM invitations WHERE token_hash = $1`,
    [hashToken(token)],
  );
  if (!invitation) throw notFound('That invitation link is not valid.');
  if (invitation.status !== 'pending') {
    throw badRequest('This invitation has already been answered.');
  }
  if (new Date(invitation.expires_at) < new Date()) {
    await query(`UPDATE invitations SET status = 'expired' WHERE id = $1`, [invitation.id]);
    throw badRequest('This invitation has expired. Ask the artist to send a new one.');
  }
  if (action === 'request_change' && requestedBps === undefined) {
    throw badRequest('Tell us what percentage you think is right.');
  }

  const status: InvitationStatus =
    action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'change_requested';
  const approval =
    action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'change_requested';

  await withTransaction(async (client) => {
    await query(
      `UPDATE invitations SET status = $2, requested_bps = $3, message = COALESCE($4, message), responded_at = now()
        WHERE id = $1`,
      [invitation.id, status, requestedBps ?? null, message ?? null],
      client,
    );
    await query(
      `UPDATE contributors SET approval_status = $2::approval_status,
              approved_at = CASE WHEN $2 = 'accepted' THEN now() ELSE NULL END
        WHERE id = $1`,
      [invitation.contributor_id, approval],
      client,
    );

    const owner = await queryOne<{ user_id: string; title: string; name: string }>(
      `SELECT a.user_id, s.title, COALESCE(c.stage_name, c.legal_name) AS name
         FROM songs s
         JOIN artists a ON a.id = s.artist_id
         JOIN contributors c ON c.id = $2
        WHERE s.id = $1`,
      [invitation.song_id, invitation.contributor_id],
      client,
    );
    if (owner) {
      await notify(
        {
          userId: owner.user_id,
          type: action === 'request_change' ? 'split_disputed' : 'split_approved',
          title:
            action === 'accept'
              ? `${owner.name} approved their split`
              : action === 'decline'
                ? `${owner.name} declined`
                : `${owner.name} asked for a different split`,
          body:
            action === 'request_change'
              ? `${formatBps(invitation.proposed_bps ?? 0)} was proposed; ${formatBps(
                  requestedBps ?? 0,
                )} was requested on "${owner.title}".`
              : `On "${owner.title}".`,
          link: `/songs/${invitation.song_id}/songwriting`,
        },
        client,
      );
    }
  });

  return { status };
}

export async function listInvitationsForSong(songId: string) {
  return query(
    `SELECT i.id, i.status, i.proposed_bps, i.requested_bps, i.message, i.sent_at, i.responded_at,
            i.contributor_id, COALESCE(c.stage_name, c.legal_name) AS contributor_name
       FROM invitations i
       JOIN contributors c ON c.id = i.contributor_id
      WHERE i.song_id = $1
      ORDER BY i.sent_at DESC`,
    [songId],
  );
}

export { ALTAR_PARTY_ID };
