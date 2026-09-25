import { schemas } from '@altar/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { loadConfig } from '../../config.js';
import { recordAudit } from '../../lib/audit.js';
import { badRequest, conflict, unauthorized } from '../../lib/errors.js';
import { sendMail } from '../../lib/mailer.js';
import { changePassword, createArtistAccount, findUserByEmail, verifyLogin } from './service.js';
import { welcomeEmail } from './welcome-email.js';

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/signup',
    {
      config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
      schema: {
        tags: ['auth'],
        summary: 'Create an artist account (spec §6 step 1)',
        body: schemas.auth.signupRequest,
        response: { 201: schemas.auth.sessionResponse, 409: schemas.common.errorResponse },
      },
    },
    async (request, reply) => {
      const existing = await findUserByEmail(request.body.email);
      if (existing) {
        throw conflict('An account already exists with that email. Sign in instead.');
      }
      const user = await createArtistAccount(request.body);
      await recordAudit({
        actorUserId: user.id,
        actorRole: 'artist',
        action: 'account.created',
        entityType: 'user',
        entityId: user.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      });
      await app.startSession(user.id, request, reply);

      // Not awaited: the account exists whether or not the mail server answers, so a slow or
      // failing SMTP server neither delays the signup nor turns it into an error.
      sendMail(welcomeEmail(user, loadConfig().PUBLIC_WEB_URL), request.log).catch((error) =>
        request.log.error({ err: error, userId: user.id }, 'welcome email failed'),
      );

      return reply.status(201).send({ user });
    },
  );

  app.post(
    '/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
      schema: {
        tags: ['auth'],
        summary: 'Sign in',
        body: schemas.auth.loginRequest,
        response: { 200: schemas.auth.sessionResponse, 401: schemas.common.errorResponse },
      },
    },
    async (request, reply) => {
      const user = await verifyLogin(request.body.email, request.body.password);
      if (!user) {
        // Same message for unknown email and wrong password — no account enumeration.
        throw unauthorized('That email and password do not match.');
      }
      await app.startSession(user.id, request, reply);
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'session.started',
        entityType: 'user',
        entityId: user.id,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      });
      return { user };
    },
  );

  app.post(
    '/logout',
    {
      schema: { tags: ['auth'], summary: 'Sign out', response: { 200: schemas.common.okResponse } },
    },
    async (request, reply) => {
      await app.endSession(request, reply);
      return { ok: true as const };
    },
  );

  app.get(
    '/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'The signed-in user',
        response: {
          200: z.object({ user: schemas.auth.sessionUser.nullable() }),
        },
      },
    },
    async (request) => ({ user: request.currentUser }),
  );

  app.post(
    '/password',
    {
      schema: {
        tags: ['auth'],
        summary: 'Change password',
        body: z.object({ currentPassword: z.string().min(1), newPassword: schemas.auth.password }),
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request, reply) => {
      const user = request.requireUser();
      const verified = await verifyLogin(user.email, request.body.currentPassword);
      if (!verified) throw badRequest('Your current password is not right.');
      // changePassword revokes every existing session, including this one — so the browser
      // that made the change gets a fresh cookie and stays signed in.
      await changePassword(user.id, request.body.newPassword);
      await app.startSession(user.id, request, reply);
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'password.changed',
        entityType: 'user',
        entityId: user.id,
        ip: request.ip,
      });
      return { ok: true as const };
    },
  );
};
