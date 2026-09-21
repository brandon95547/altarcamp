import { DOCUMENT_FOLDERS, schemas } from '@altar/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { query, queryOne } from '../../db/pool.js';
import { recordAudit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { buildStorageKey, getStorage } from '../../lib/storage.js';

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * The document vault — spec §31. Files never sit in a public directory: every read is an
 * authorised API call, and every signed agreement is filed here automatically.
 */
export const documentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/',
    {
      schema: {
        tags: ['documents'],
        summary: 'The artist document vault',
        querystring: z.object({ folder: z.enum(DOCUMENT_FOLDERS).optional() }),
      },
    },
    async (request) => {
      const user = request.requireArtist();
      const documents = await query(
        `SELECT id, folder::text, filename, content_type, byte_size, sha256, song_id, agreement_id,
                is_system, created_at
           FROM documents
          WHERE artist_id = $1 AND ($2::document_folder IS NULL OR folder = $2::document_folder)
          ORDER BY created_at DESC`,
        [user.artistId, request.query.folder ?? null],
      );
      return {
        folders: DOCUMENT_FOLDERS.map((folder) => ({
          key: folder,
          count: documents.filter((document) => document['folder'] === folder).length,
        })),
        documents,
      };
    },
  );

  app.post(
    '/',
    {
      config: { rateLimit: { max: 30, timeWindow: '10 minutes' } },
      schema: {
        tags: ['documents'],
        summary: 'Upload a document',
        body: schemas.agreements.documentUploadRequest,
      },
    },
    async (request, reply) => {
      const user = request.requireArtist();
      const data = Buffer.from(request.body.data, 'base64');
      if (data.byteLength === 0) throw badRequest('That file is empty.');
      if (data.byteLength > MAX_BYTES) {
        throw badRequest('Files in the vault are limited to 15 MB in this phase.');
      }

      const storage = getStorage();
      const key = buildStorageKey(user.artistId, request.body.folder, request.body.filename);
      const stored = await storage.put(key, data);

      const document = await queryOne<{ id: string }>(
        `INSERT INTO documents (artist_id, folder, filename, content_type, byte_size, storage_key,
                                sha256, song_id, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          user.artistId,
          request.body.folder,
          request.body.filename,
          request.body.contentType,
          stored.byteSize,
          stored.storageKey,
          stored.sha256,
          request.body.songId ?? null,
          user.id,
        ],
      );

      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'document.uploaded',
        entityType: 'document',
        entityId: document?.id ?? null,
        metadata: { folder: request.body.folder, filename: request.body.filename },
      });

      return reply.status(201).send({ document });
    },
  );

  app.get(
    '/:documentId/content',
    {
      schema: {
        tags: ['documents'],
        summary: 'Download a document',
        params: z.object({ documentId: z.uuid() }),
      },
    },
    async (request, reply) => {
      const user = request.requireUser();
      const document = await queryOne<{
        artist_id: string;
        filename: string;
        content_type: string;
        storage_key: string;
      }>(`SELECT artist_id, filename, content_type, storage_key FROM documents WHERE id = $1`, [
        request.params.documentId,
      ]);
      if (!document) throw notFound('That document does not exist.');
      if (document.artist_id !== user.artistId) request.requireStaff();

      const data = await getStorage().get(document.storage_key);
      await recordAudit({
        actorUserId: user.id,
        actorRole: user.role,
        action: 'document.downloaded',
        entityType: 'document',
        entityId: request.params.documentId,
        ip: request.ip,
      });

      return reply
        .header('content-type', document.content_type)
        .header(
          'content-disposition',
          `attachment; filename="${document.filename.replace(/"/g, '')}"`,
        )
        .send(data);
    },
  );

  app.delete(
    '/:documentId',
    {
      schema: {
        tags: ['documents'],
        summary: 'Delete an uploaded document',
        params: z.object({ documentId: z.uuid() }),
        response: { 200: schemas.common.okResponse },
      },
    },
    async (request) => {
      const user = request.requireArtist();
      const document = await queryOne<{
        artist_id: string;
        is_system: boolean;
        storage_key: string;
      }>(`SELECT artist_id, is_system, storage_key FROM documents WHERE id = $1`, [
        request.params.documentId,
      ]);
      if (!document) throw notFound('That document does not exist.');
      if (document.artist_id !== user.artistId) throw forbidden('That document is not yours.');
      if (document.is_system) {
        throw badRequest(
          'Signed agreements stay in your vault permanently. That is the point of having them here.',
        );
      }
      await query(`DELETE FROM documents WHERE id = $1`, [request.params.documentId]);
      await getStorage().remove(document.storage_key);
      return { ok: true as const };
    },
  );
};
