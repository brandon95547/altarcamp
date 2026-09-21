import { schemas } from '@altar/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { recordAudit } from '../../lib/audit.js';
import { listSongs } from './repo.js';
import {
  addContributor,
  assertSongAccess,
  buildDealViews,
  createSong,
  loadSongDeal,
  removeContributor,
  setClearances,
  setOwnershipSplit,
  setRecoupmentTerms,
  setRevenueSplits,
} from './service.js';

const songParam = z.object({ songId: z.uuid() });

export const songRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/', { schema: { tags: ['songs'], summary: 'My songs' } }, async (request) => {
    const user = request.requireArtist();
    return { songs: await listSongs(user.artistId) };
  });

  app.post(
    '/',
    {
      schema: {
        tags: ['songs'],
        summary: 'Create a song (spec §8 step 1)',
        body: schemas.songs.createSongRequest,
      },
    },
    async (request, reply) => {
      const user = request.requireArtist();
      const song = await createSong(user.artistId, request.body);
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'song.created',
        entityType: 'song',
        entityId: song.id,
        metadata: { title: song.title },
      });
      return reply.status(201).send({ song });
    },
  );

  app.get(
    '/:songId',
    {
      schema: {
        tags: ['songs'],
        summary: 'One song with its whole deal and open issues',
        params: songParam,
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      return loadSongDeal(request.params.songId);
    },
  );

  app.patch(
    '/:songId',
    {
      schema: {
        tags: ['songs'],
        summary: 'Update song details',
        params: songParam,
        body: schemas.songs.updateSongRequest,
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      const { query } = await import('../../db/pool.js');
      await query(
        `UPDATE songs SET
           title = COALESCE($2, title),
           collaboration_type = COALESCE($3::collaboration_type, collaboration_type),
           recording_status = COALESCE($4::recording_status, recording_status),
           expected_release_date = COALESCE($5::date, expected_release_date),
           notes = COALESCE($6, notes),
           updated_at = now()
         WHERE id = $1`,
        [
          request.params.songId,
          request.body.title ?? null,
          request.body.collaborationType ?? null,
          request.body.recordingStatus ?? null,
          request.body.expectedReleaseDate ?? null,
          request.body.notes ?? null,
        ],
      );
      return { ok: true as const };
    },
  );

  app.post(
    '/:songId/contributors',
    {
      schema: {
        tags: ['songs'],
        summary: 'Add a collaborator (spec §8)',
        params: songParam,
        body: schemas.songs.addContributorRequest,
      },
    },
    async (request, reply) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      const contributor = await addContributor(request.params.songId, request.body);
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'contributor.added',
        entityType: 'song',
        entityId: request.params.songId,
        metadata: { contributorId: contributor.id, role: contributor.role },
      });
      return reply.status(201).send({ contributor });
    },
  );

  app.delete(
    '/:songId/contributors/:contributorId',
    {
      schema: {
        tags: ['songs'],
        summary: 'Remove a collaborator',
        params: songParam.extend({ contributorId: z.uuid() }),
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      await removeContributor(request.params.songId, request.params.contributorId);
      return { ok: true as const };
    },
  );

  app.put(
    '/:songId/splits',
    {
      schema: {
        tags: ['songs'],
        summary: 'Set master, songwriting or publishing ownership (spec §8, §9)',
        params: songParam,
        body: schemas.songs.setSplitRequest,
        response: { 200: schemas.common.okResponse, 422: schemas.common.errorResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      await setOwnershipSplit(request.params.songId, user.id, request.body);
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'split.set',
        entityType: 'song',
        entityId: request.params.songId,
        metadata: { rightType: request.body.rightType, lines: request.body.lines },
      });
      return { ok: true as const };
    },
  );

  app.put(
    '/:songId/revenue-splits',
    {
      schema: {
        tags: ['songs'],
        summary: 'Set the split for each revenue category (spec §10)',
        params: songParam,
        body: schemas.songs.setRevenueSplitRequest,
        response: { 200: schemas.common.okResponse, 422: schemas.common.errorResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      await setRevenueSplits(request.params.songId, user.id, request.body.splits);
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'revenue_split.set',
        entityType: 'song',
        entityId: request.params.songId,
        metadata: { categories: request.body.splits.map((split) => split.category) },
      });
      return { ok: true as const };
    },
  );

  app.put(
    '/:songId/recoupment',
    {
      schema: {
        tags: ['songs'],
        summary: 'Set expense and recoupment terms (spec §11)',
        params: songParam,
        body: schemas.songs.recoupmentTermsRequest,
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      await setRecoupmentTerms(request.params.songId, request.body);
      return { ok: true as const };
    },
  );

  app.put(
    '/:songId/clearances',
    {
      schema: {
        tags: ['songs'],
        summary: 'Declare samples and interpolations (spec §34)',
        params: songParam,
        body: schemas.songs.clearancesRequest,
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      await setClearances(request.params.songId, request.body);
      return { ok: true as const };
    },
  );

  app.get(
    '/:songId/deal',
    {
      schema: {
        tags: ['songs'],
        summary: 'Deal summary, fair-deal disclosure and Your Five Answers (spec §12, §17, §35)',
        params: songParam,
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      return buildDealViews(request.params.songId);
    },
  );
};
