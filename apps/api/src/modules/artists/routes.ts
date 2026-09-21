import { schemas } from '@altar/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { recordAudit } from '../../lib/audit.js';
import { buildDashboard } from './dashboard.js';
import {
  choosePath,
  getArtist,
  getEducationProgress,
  getMissionApplication,
  getProfile,
  getRightsDisclosures,
  recordEducationAnswer,
  saveMissionAnswers,
  saveProfile,
  saveRightsDisclosures,
} from './service.js';

export const artistRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me',
    {
      schema: { tags: ['artists'], summary: 'The signed-in artist, profile and onboarding state' },
    },
    async (request) => {
      const user = request.requireArtist();
      const [artist, profile, rights, education] = await Promise.all([
        getArtist(user.artistId),
        getProfile(user.artistId),
        getRightsDisclosures(user.artistId),
        getEducationProgress(user.artistId),
      ]);
      return { artist, ...profile, rights, education };
    },
  );

  app.put(
    '/me/profile',
    {
      schema: {
        tags: ['artists'],
        summary: 'Save the artist profile (spec §6 step 2)',
        body: schemas.artists.artistProfileRequest,
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await saveProfile(user.artistId, request.body);
      return { ok: true as const };
    },
  );

  app.put(
    '/me/existing-rights',
    {
      schema: {
        tags: ['artists'],
        summary:
          'Record existing label, distribution, publishing and management commitments (spec §6 step 3)',
        body: schemas.artists.existingRightsRequest,
        response: { 200: z.object({ conflicts: z.array(z.string()) }) },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      const result = await saveRightsDisclosures(user.artistId, request.body.answers);
      if (result.conflicts.length > 0) {
        await recordAudit({
          actorUserId: user.id,
          actorRole: user.role,
          action: 'rights.conflict_declared',
          entityType: 'artist',
          entityId: user.artistId,
          metadata: { conflicts: result.conflicts },
        });
      }
      return result;
    },
  );

  app.post(
    '/me/education',
    {
      schema: {
        tags: ['artists'],
        summary: 'Answer an orientation check (spec §7)',
        body: schemas.artists.educationProgressRequest,
      },
    },
    async (request) => {
      const user = request.requireArtist();
      return recordEducationAnswer(
        user.artistId,
        request.body.lessonSlug,
        request.body.selectedOptionId,
      );
    },
  );

  app.post(
    '/me/path',
    {
      schema: {
        tags: ['artists'],
        summary: 'Choose One Song or One Year (spec §5)',
        body: schemas.artists.choosePathRequest,
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await choosePath(user.artistId, request.body.path);
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'path.chosen',
        entityType: 'artist',
        entityId: user.artistId,
        metadata: { path: request.body.path },
      });
      return { ok: true as const };
    },
  );

  app.get(
    '/me/mission-application',
    { schema: { tags: ['artists'], summary: 'The one-year mission application (spec §14)' } },
    async (request) => {
      const user = request.requireArtist();
      return { application: await getMissionApplication(user.artistId) };
    },
  );

  app.put(
    '/me/mission-application',
    {
      schema: {
        tags: ['artists'],
        summary: 'Save or submit the mission application',
        body: schemas.artists.missionProfileRequest,
      },
    },
    async (request) => {
      const user = request.requireArtist();
      const result = await saveMissionAnswers(
        user.artistId,
        request.body.answers,
        request.body.submit,
      );
      if (request.body.submit) {
        await recordAudit({
          actorUserId: user.id,
          actorRole: user.role,
          action: 'mission_application.submitted',
          entityType: 'artist',
          entityId: user.artistId,
        });
      }
      return result;
    },
  );

  app.get(
    '/me/dashboard',
    { schema: { tags: ['artists'], summary: 'Artist dashboard (spec §24)' } },
    async (request) => {
      const user = request.requireArtist();
      return buildDashboard(user.artistId);
    },
  );

  app.get(
    '/me/notifications',
    { schema: { tags: ['artists'], summary: 'In-app notifications (spec §32)' } },
    async (request) => {
      const user = request.requireUser();
      const { query } = await import('../../db/pool.js');
      const notifications = await query(
        `SELECT id, type, title, body, link, read_at, created_at
           FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [user.id],
      );
      return { notifications };
    },
  );

  app.post(
    '/me/notifications/read',
    {
      schema: {
        tags: ['artists'],
        summary: 'Mark notifications read',
        body: z.object({ ids: z.array(z.uuid()).max(100).optional() }),
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireUser();
      const { query } = await import('../../db/pool.js');
      if (request.body.ids && request.body.ids.length > 0) {
        await query(
          `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND id = ANY($2::uuid[]) AND read_at IS NULL`,
          [user.id, request.body.ids],
        );
      } else {
        await query(
          `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
          [user.id],
        );
      }
      return { ok: true as const };
    },
  );
};
