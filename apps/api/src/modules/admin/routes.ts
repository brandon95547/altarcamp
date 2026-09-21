import { APPLICATION_STATUSES, DEAL_PATHS, REVENUE_CATEGORIES, schemas } from '@altar/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { recordAudit } from '../../lib/audit.js';
import {
  adminOverview,
  artistDetail,
  auditTrail,
  listAgreements,
  listArtists,
  proposeYearTerms,
  reviewRightsDisclosure,
  setApplicationStatus,
  yearTermDefaults,
} from './service.js';

/** Spec §26. Every route here is staff-only; the hook runs before each handler. */
export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', async (request) => {
    request.requireStaff();
  });

  app.get('/overview', { schema: { tags: ['admin'], summary: 'Admin dashboard (spec §26)' } }, () =>
    adminOverview(),
  );

  app.get(
    '/artists',
    {
      schema: {
        tags: ['admin'],
        summary: 'Artists and applicants',
        querystring: z.object({
          status: z.enum(APPLICATION_STATUSES).optional(),
          path: z.enum(DEAL_PATHS).optional(),
        }),
      },
    },
    async (request) => ({ artists: await listArtists(request.query) }),
  );

  app.get(
    '/artists/:artistId',
    {
      schema: {
        tags: ['admin'],
        summary: 'One artist, with application, rights, songs and agreements',
        params: z.object({ artistId: z.uuid() }),
      },
    },
    async (request) => artistDetail(request.params.artistId),
  );

  app.post(
    '/artists/:artistId/rights/:questionKey/review',
    {
      schema: {
        tags: ['admin'],
        summary: 'Clear an existing-rights conflict after review (spec §6)',
        params: z.object({ artistId: z.uuid(), questionKey: z.string().max(60) }),
        body: z.object({ notes: z.string().max(2000) }),
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireStaff();
      await reviewRightsDisclosure(
        request.params.artistId,
        request.params.questionKey,
        user.id,
        request.body.notes,
      );
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'rights.reviewed',
        entityType: 'artist',
        entityId: request.params.artistId,
        metadata: { questionKey: request.params.questionKey },
      });
      return { ok: true as const };
    },
  );

  app.post(
    '/artists/:artistId/application-status',
    {
      schema: {
        tags: ['admin'],
        summary: 'Move an application through the workflow (spec §27)',
        params: z.object({ artistId: z.uuid() }),
        body: z.object({
          status: z.enum(APPLICATION_STATUSES),
          notes: z.string().max(2000).optional(),
        }),
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireStaff();
      await setApplicationStatus(
        request.params.artistId,
        request.body.status,
        user.id,
        request.body.notes,
      );
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'application.status_changed',
        entityType: 'artist',
        entityId: request.params.artistId,
        metadata: { status: request.body.status },
      });
      return { ok: true as const };
    },
  );

  app.get(
    '/year-term-defaults',
    {
      schema: {
        tags: ['admin'],
        summary: 'Revenue categories, services and activities for a year',
      },
    },
    async () => yearTermDefaults(),
  );

  app.post(
    '/artists/:artistId/propose-year',
    {
      schema: {
        tags: ['admin'],
        summary: 'Propose one-year terms (spec §18, §19, §27)',
        params: z.object({ artistId: z.uuid() }),
        body: z.object({
          startDate: z.iso.date(),
          endDate: z.iso.date(),
          autoRenew: z.boolean().default(false),
          masterArtistBps: z.int().min(0).max(10_000),
          masterAltarBps: z.int().min(0).max(10_000),
          compositionArtistBps: z.int().min(0).max(10_000),
          compositionAltarBps: z.int().min(0).max(10_000),
          revenue: z
            .array(
              z.object({
                category: z.enum(REVENUE_CATEGORIES),
                artistBps: z.int().min(0).max(10_000),
                altarBps: z.int().min(0).max(10_000),
              }),
            )
            .min(1),
          activities: z
            .array(
              z.object({
                key: z.string().max(60),
                level: z.enum(['required', 'opportunity', 'not_included']),
                note: z.string().max(500).optional(),
              }),
            )
            .default([]),
          investmentCapMinor: z.int().min(0).nullable().default(null),
          recoupedFrom: z
            .enum(['master_revenue', 'artist_share_only', 'all_revenue', 'not_recoupable'])
            .default('master_revenue'),
        }),
        response: { 201: z.object({ commitmentId: z.uuid() }) },
      },
    },
    async (request, reply) => {
      const user = request.requireStaff();
      const result = await proposeYearTerms({
        ...request.body,
        artistId: request.params.artistId,
        createdBy: user.id,
      });
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'year_terms.proposed',
        entityType: 'commitment',
        entityId: result.commitmentId,
        metadata: { artistId: request.params.artistId },
      });
      return reply.status(201).send(result);
    },
  );

  app.get(
    '/agreements',
    {
      schema: {
        tags: ['admin'],
        summary: 'Contract pipeline (spec §26)',
        querystring: z.object({ status: z.string().max(40).optional() }),
      },
    },
    async (request) => ({ agreements: await listAgreements(request.query.status) }),
  );

  app.get(
    '/audit',
    {
      schema: {
        tags: ['admin'],
        summary: 'Audit log (spec §37)',
        querystring: z.object({
          entityType: z.string().max(40).optional(),
          entityId: z.uuid().optional(),
        }),
      },
    },
    async (request) => ({
      entries: await auditTrail(request.query.entityType, request.query.entityId),
    }),
  );
};
