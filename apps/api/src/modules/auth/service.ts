import type { SessionUser, UserRole } from '@altar/shared';
import type { schemas } from '@altar/shared';
import type { z } from 'zod';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { hashPassword, needsRehash, verifyPassword } from '../../lib/password.js';

type SignupRequest = z.infer<typeof schemas.auth.signupRequest>;

interface UserRow {
  id: string;
  email: string;
  legal_name: string;
  role: UserRole;
  password_hash: string;
  email_verified: boolean;
  mfa_enabled: boolean;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT id, email, legal_name, role, password_hash, email_verified, mfa_enabled
       FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
}

/**
 * Account and artist are created together: in this product an artist cannot exist without a
 * login, and a signup that half-succeeds leaves someone unable to sign in or start again.
 */
export async function createArtistAccount(input: SignupRequest): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (client) => {
    const user = await queryOne<{ id: string; email: string; legal_name: string; role: UserRole }>(
      `INSERT INTO users (email, password_hash, legal_name, phone, role)
       VALUES ($1, $2, $3, $4, 'artist')
       RETURNING id, email, legal_name, role`,
      [input.email.toLowerCase(), passwordHash, input.legalName, input.phone ?? null],
      client,
    );
    if (!user) throw new Error('Failed to create user');

    const artist = await queryOne<{ id: string; artist_name: string }>(
      `INSERT INTO artists (user_id, artist_name, country, region, website, age_confirmed, onboarding_step)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'profile')
       RETURNING id, artist_name`,
      [user.id, input.artistName, input.country, input.region ?? null, input.website || null],
      client,
    );
    if (!artist) throw new Error('Failed to create artist');

    await query(`INSERT INTO artist_profiles (artist_id) VALUES ($1)`, [artist.id], client);

    for (const social of input.socialProfiles ?? []) {
      if (!social.url) continue;
      await query(
        `INSERT INTO artist_social_profiles (artist_id, platform, url) VALUES ($1, $2, $3)`,
        [artist.id, social.platform, social.url],
        client,
      );
    }

    return {
      id: user.id,
      email: user.email,
      legalName: user.legal_name,
      role: user.role,
      artistId: artist.id,
      artistName: artist.artist_name,
      emailVerified: false,
      mfaRequired: false,
    };
  });
}

export async function verifyLogin(email: string, password: string): Promise<SessionUser | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    // Burn comparable time so a missing account is not detectable by response time.
    await hashPassword(password);
    return null;
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  if (needsRehash(user.password_hash)) {
    await changePassword(user.id, password);
  }

  const artist = await queryOne<{ id: string; artist_name: string }>(
    `SELECT id, artist_name FROM artists WHERE user_id = $1`,
    [user.id],
  );

  return {
    id: user.id,
    email: user.email,
    legalName: user.legal_name,
    role: user.role,
    artistId: artist?.id ?? null,
    artistName: artist?.artist_name ?? null,
    emailVerified: user.email_verified,
    mfaRequired: ['admin', 'finance_admin', 'legal_admin'].includes(user.role) && !user.mfa_enabled,
  };
}

export async function changePassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [
    passwordHash,
    userId,
  ]);
  // Every other session for this user is ended: a password change should log out a thief.
  await query('UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [
    userId,
  ]);
}
