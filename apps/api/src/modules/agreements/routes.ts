import { schemas, SIGNING_AFFIRMATIONS } from '@altar/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { query, queryOne } from '../../db/pool.js';
import { recordAudit } from '../../lib/audit.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { generateAgreement } from './service.js';
import { getSignatureCertificates, resolveSigner, signAgreement } from './signing.js';

const agreementParam = z.object({ agreementId: z.uuid() });

async function loadAgreement(agreementId: string) {
  const agreement = await queryOne<{
    id: string;
    type: string;
    status: string;
    path: string;
    title: string;
    artist_id: string;
    song_id: string | null;
    song_title: string | null;
    commitment_id: string | null;
    special_terms: string | null;
    created_at: string;
    sent_at: string | null;
    completed_at: string | null;
  }>(
    `SELECT a.id, a.type::text, a.status::text, a.path::text, a.title, a.artist_id, a.song_id,
            s.title AS song_title, a.commitment_id, a.special_terms, a.created_at, a.sent_at, a.completed_at
       FROM agreements a LEFT JOIN songs s ON s.id = a.song_id
      WHERE a.id = $1`,
    [agreementId],
  );
  if (!agreement) throw notFound('That agreement does not exist.');

  const version = await queryOne<{
    id: string;
    version: number;
    rendered_simple: string;
    rendered_deal_sheet: string;
    rendered_legal: string;
    document_hash: string;
    terms_snapshot: unknown;
    created_at: string;
  }>(
    `SELECT id, version, rendered_simple, rendered_deal_sheet, rendered_legal, document_hash,
            terms_snapshot, created_at
       FROM agreement_versions WHERE agreement_id = $1 ORDER BY version DESC LIMIT 1`,
    [agreementId],
  );

  const signers = await query<{
    id: string;
    party: string;
    name: string;
    email: string | null;
    is_required: boolean;
    signed_at: string | null;
    has_token: boolean;
  }>(
    `SELECT id, party::text, name, email, is_required, signed_at, (token_hash IS NOT NULL) AS has_token
       FROM agreement_signers WHERE agreement_id = $1 ORDER BY order_index`,
    [agreementId],
  );

  return { agreement, version, signers };
}

export const agreementRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/', { schema: { tags: ['agreements'], summary: 'My agreements' } }, async (request) => {
    const user = request.requireArtist();
    const agreements = await query(
      `SELECT a.id, a.type::text, a.status::text, a.title, a.created_at, a.sent_at, a.completed_at,
              s.title AS song_title,
              (SELECT COUNT(*) FROM agreement_signers sg WHERE sg.agreement_id = a.id)::int AS signer_count,
              (SELECT COUNT(*) FROM agreement_signers sg WHERE sg.agreement_id = a.id AND sg.signed_at IS NOT NULL)::int AS signed_count
         FROM agreements a LEFT JOIN songs s ON s.id = a.song_id
        WHERE a.artist_id = $1 AND a.status <> 'void'
        ORDER BY a.created_at DESC`,
      [user.artistId],
    );
    return { agreements };
  });

  app.post(
    '/',
    {
      schema: {
        tags: ['agreements'],
        summary: 'Generate an agreement from the stored deal (spec §20)',
        body: schemas.agreements.generateAgreementRequest,
        response: { 201: z.object({ agreementId: z.uuid() }), 422: schemas.common.errorResponse },
      },
    },
    async (request, reply) => {
      const user = request.requireUser();

      // Artists generate their own single-song agreements; the one-year agreement is
      // proposed by Altar.Camp after the mission application is reviewed (spec §27).
      if (request.body.type === 'one_year_altar') {
        request.requireStaff();
      } else if (user.artistId) {
        const song = await queryOne<{ artist_id: string }>(
          `SELECT artist_id FROM songs WHERE id = $1`,
          [request.body.songId ?? null],
        );
        if (!song || song.artist_id !== user.artistId) {
          request.requireStaff();
        }
      } else {
        request.requireStaff();
      }

      const result = await generateAgreement({ ...request.body, createdBy: user.id });
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'agreement.generated',
        entityType: 'agreement',
        entityId: result.agreementId,
        metadata: { type: request.body.type },
      });
      return reply.status(201).send(result);
    },
  );

  app.get(
    '/:agreementId',
    {
      schema: {
        tags: ['agreements'],
        summary: 'One agreement in all three views (spec §21)',
        params: agreementParam,
      },
    },
    async (request) => {
      const user = request.requireUser();
      const loaded = await loadAgreement(request.params.agreementId);
      const isOwner = user.artistId === loaded.agreement.artist_id;
      const isSigner = loaded.signers.some((signer) => signer.name === user.legalName);
      if (!isOwner && !isSigner) request.requireStaff();

      if (isOwner && !loaded.agreement.completed_at && loaded.agreement.status === 'sent') {
        await query(
          `UPDATE agreements SET status = 'viewed', first_viewed_at = COALESCE(first_viewed_at, now())
            WHERE id = $1 AND status = 'sent'`,
          [request.params.agreementId],
        );
        loaded.agreement.status = 'viewed';
      }

      return { ...loaded, affirmations: SIGNING_AFFIRMATIONS };
    },
  );

  app.post(
    '/:agreementId/sign',
    {
      config: { rateLimit: { max: 20, timeWindow: '10 minutes' } },
      schema: {
        tags: ['agreements'],
        summary: 'Sign electronically (spec §21)',
        params: agreementParam,
        body: schemas.agreements.signAgreementRequest.extend({
          /** A signer without an account uses their one-time link instead. */
          signingToken: z.string().min(10).max(200).optional(),
        }),
      },
    },
    async (request) => {
      const user = request.currentUser;
      const signer = await resolveSigner(request.params.agreementId, {
        userId: user?.id,
        role: user?.role,
        token: request.body.signingToken,
      });

      return signAgreement({
        agreementId: request.params.agreementId,
        signer,
        typedName: request.body.typedName,
        affirmations: request.body.affirmations,
        documentHash: request.body.documentHash,
        agreementVersion: request.body.agreementVersion,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        actorUserId: user?.id ?? null,
      });
    },
  );

  app.post(
    '/:agreementId/signers/:signerId/link',
    {
      schema: {
        tags: ['agreements'],
        summary: 'Issue a one-time signing link for a signer without an account',
        params: agreementParam.extend({ signerId: z.uuid() }),
        response: { 200: z.object({ url: z.string(), expiresAt: z.string() }) },
      },
    },
    async (request) => {
      const user = request.requireUser();
      const loaded = await loadAgreement(request.params.agreementId);
      // The artist whose deal it is can issue links; so can staff.
      if (user.artistId !== loaded.agreement.artist_id) request.requireStaff();

      const signer = loaded.signers.find((candidate) => candidate.id === request.params.signerId);
      if (!signer) throw notFound('That signer is not on this agreement.');
      if (signer.signed_at) throw badRequest(`${signer.name} has already signed.`);
      if (signer.party === 'artist' || signer.party === 'altar') {
        throw badRequest(`${signer.name} signs by signing in to Altar.Camp, not through a link.`);
      }

      const { generateToken, hashToken } = await import('../../lib/crypto.js');
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await query(
        `UPDATE agreement_signers SET token_hash = $2, token_expires_at = $3 WHERE id = $1`,
        [signer.id, hashToken(token), expiresAt],
      );
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'signing_link.issued',
        entityType: 'agreement',
        entityId: request.params.agreementId,
        metadata: { signerId: signer.id },
      });

      const { loadConfig } = await import('../../config.js');
      return {
        url: `${loadConfig().PUBLIC_WEB_URL}/sign/${token}`,
        expiresAt: expiresAt.toISOString(),
      };
    },
  );

  app.get(
    '/:agreementId/certificate',
    {
      schema: {
        tags: ['agreements'],
        summary: 'Signature audit trail (spec §21, §37)',
        params: agreementParam,
      },
    },
    async (request) => {
      const user = request.requireUser();
      const loaded = await loadAgreement(request.params.agreementId);
      if (user.artistId !== loaded.agreement.artist_id) request.requireStaff();
      return { certificates: await getSignatureCertificates(request.params.agreementId) };
    },
  );

  // Public signing link for a collaborator with no Altar.Camp account.
  app.get(
    '/sign/:token',
    {
      schema: {
        tags: ['agreements'],
        summary: 'Open an agreement with a signing link',
        params: z.object({ token: z.string().min(10).max(200) }),
      },
    },
    async (request) => {
      const { hashToken } = await import('../../lib/crypto.js');
      const signer = await queryOne<{
        id: string;
        agreement_id: string;
        name: string;
        signed_at: string | null;
      }>(`SELECT id, agreement_id, name, signed_at FROM agreement_signers WHERE token_hash = $1`, [
        hashToken(request.params.token),
      ]);
      if (!signer) throw notFound('That signing link is not valid.');
      const loaded = await loadAgreement(signer.agreement_id);
      await query(
        `UPDATE agreement_signers SET viewed_at = COALESCE(viewed_at, now()) WHERE id = $1`,
        [signer.id],
      );
      return {
        ...loaded,
        affirmations: SIGNING_AFFIRMATIONS,
        signer: { id: signer.id, name: signer.name, signedAt: signer.signed_at },
      };
    },
  );
};
