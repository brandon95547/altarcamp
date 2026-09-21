import { schemas } from '@altar/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { recordAudit } from '../../lib/audit.js';
import { assertSongAccess } from '../songs/service.js';
import {
  inviteContributor,
  listInvitationsForSong,
  respondToInvitation,
  viewInvitation,
} from './service.js';

export const collaboratorRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/songs/:songId/contributors/:contributorId/invite',
    {
      schema: {
        tags: ['collaborators'],
        summary: 'Invite a collaborator to approve their split (spec §33)',
        params: z.object({ songId: z.uuid(), contributorId: z.uuid() }),
        body: z.object({ message: z.string().max(1000).optional() }),
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      const invitation = await inviteContributor(
        request.params.songId,
        request.params.contributorId,
        user.id,
        request.body.message,
      );
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'invitation.sent',
        entityType: 'contributor',
        entityId: request.params.contributorId,
      });
      // Phase 1 has no mail transport, so the link comes back for the artist to pass on.
      return invitation;
    },
  );

  app.get(
    '/songs/:songId/invitations',
    {
      schema: {
        tags: ['collaborators'],
        summary: 'Invitation status for a song',
        params: z.object({ songId: z.uuid() }),
      },
    },
    async (request) => {
      const user = request.requireArtist();
      await assertSongAccess(request.params.songId, user.artistId);
      return { invitations: await listInvitationsForSong(request.params.songId) };
    },
  );

  // Public: a collaborator answers with the link, without needing an account first.
  app.get(
    '/invitations/:token',
    {
      schema: {
        tags: ['collaborators'],
        summary: 'Open an invitation',
        params: z.object({ token: z.string().min(10).max(200) }),
      },
    },
    async (request) => ({ invitation: await viewInvitation(request.params.token) }),
  );

  app.post(
    '/invitations/:token/respond',
    {
      config: { rateLimit: { max: 20, timeWindow: '10 minutes' } },
      schema: {
        tags: ['collaborators'],
        summary: 'Accept, request a change, or decline (spec §33)',
        params: z.object({ token: z.string().min(10).max(200) }),
        body: schemas.songs.invitationResponseRequest,
      },
    },
    async (request) => {
      const result = await respondToInvitation(
        request.params.token,
        request.body.action,
        request.body.requestedBps,
        request.body.message,
      );
      await recordAudit({
        action: `invitation.${request.body.action}`,
        entityType: 'invitation',
        metadata: { requestedBps: request.body.requestedBps ?? null },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
      });
      return result;
    },
  );
};
