import '@fastify/cookie';
import type { SessionUser, UserRole } from '@altar/shared';
import { STAFF_ROLES } from '@altar/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { loadConfig } from '../config.js';
import { queryOne, query } from '../db/pool.js';
import { generateToken, hashToken } from '../lib/crypto.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export const SESSION_COOKIE = 'altar_session';

interface SessionRow {
  user_id: string;
  email: string;
  legal_name: string;
  role: UserRole;
  email_verified: boolean;
  mfa_enabled: boolean;
  artist_id: string | null;
  artist_name: string | null;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by the auth hook on every request that carries a valid session. */
    currentUser: SessionUser | null;
    requireUser(): SessionUser;
    requireRole(...roles: UserRole[]): SessionUser;
    requireStaff(): SessionUser;
    requireArtist(): SessionUser & { artistId: string };
  }
  interface FastifyInstance {
    startSession(userId: string, request: FastifyRequest, reply: FastifyReply): Promise<void>;
    endSession(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

async function loadSession(token: string): Promise<SessionUser | null> {
  const row = await queryOne<SessionRow>(
    `SELECT s.user_id, u.email, u.legal_name, u.role, u.email_verified, u.mfa_enabled,
            a.id AS artist_id, a.artist_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN artists a ON a.user_id = u.id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()`,
    [hashToken(token)],
  );
  if (!row) return null;
  return {
    id: row.user_id,
    email: row.email,
    legalName: row.legal_name,
    role: row.role,
    artistId: row.artist_id,
    artistName: row.artist_name,
    emailVerified: row.email_verified,
    // Spec §37: administrators require a second factor. Phase 1 surfaces the requirement
    // rather than pretending it is satisfied.
    mfaRequired: STAFF_ROLES.includes(row.role) && !row.mfa_enabled,
  };
}

export const authPlugin = fp(async (app) => {
  const config = loadConfig();

  app.decorateRequest('currentUser', null);

  app.decorateRequest('requireUser', function requireUser(this: FastifyRequest) {
    if (!this.currentUser) throw unauthorized();
    return this.currentUser;
  });

  app.decorateRequest(
    'requireRole',
    function requireRoleFn(this: FastifyRequest, ...roles: UserRole[]) {
      const user = this.requireUser();
      if (!roles.includes(user.role)) {
        throw forbidden('Your account does not have access to this area.');
      }
      return user;
    },
  );

  app.decorateRequest('requireStaff', function requireStaff(this: FastifyRequest) {
    const user = this.requireUser();
    if (!STAFF_ROLES.includes(user.role)) {
      throw forbidden('This is an Altar.Camp staff area.');
    }
    return user;
  });

  app.decorateRequest('requireArtist', function requireArtist(this: FastifyRequest) {
    const user = this.requireUser();
    if (!user.artistId) {
      throw forbidden('This account does not have an artist profile.');
    }
    return user as SessionUser & { artistId: string };
  });

  app.addHook('onRequest', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    request.currentUser = token ? await loadSession(token) : null;
  });

  app.decorate(
    'startSession',
    async function startSession(userId: string, request: FastifyRequest, reply: FastifyReply) {
      const token = generateToken();
      const expiresAt = new Date(Date.now() + config.SESSION_TTL_HOURS * 60 * 60 * 1000);
      await query(
        `INSERT INTO sessions (user_id, token_hash, expires_at, ip, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, hashToken(token), expiresAt, request.ip, request.headers['user-agent'] ?? null],
      );
      await query('UPDATE users SET last_login_at = now() WHERE id = $1', [userId]);
      reply.setCookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.COOKIE_SECURE,
        domain: config.COOKIE_DOMAIN,
        path: '/',
        expires: expiresAt,
      });
    },
  );

  app.decorate(
    'endSession',
    async function endSession(request: FastifyRequest, reply: FastifyReply) {
      const token = request.cookies[SESSION_COOKIE];
      if (token) {
        await query('UPDATE sessions SET revoked_at = now() WHERE token_hash = $1', [
          hashToken(token),
        ]);
      }
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
    },
  );
});
