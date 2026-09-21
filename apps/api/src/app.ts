import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import scalar from '@scalar/fastify-api-reference';
import { createRequire } from 'node:module';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod';
import { loadConfig } from './config.js';
import { adminRoutes } from './modules/admin/routes.js';
import { agreementRoutes } from './modules/agreements/routes.js';
import { artistRoutes } from './modules/artists/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { collaboratorRoutes } from './modules/collaborators/routes.js';
import { documentRoutes } from './modules/documents/routes.js';
import { educationRoutes } from './modules/education/routes.js';
import { songRoutes } from './modules/songs/routes.js';
import { authPlugin } from './plugins/auth.js';
import { errorsPlugin } from './plugins/errors.js';
import { getPool } from './db/pool.js';

/**
 * Pretty logs are a development nicety and pino-pretty is a dev dependency. If it is not
 * installed, log as JSON rather than refusing to start.
 */
function prettyTransport(): { target: string; options: Record<string, unknown> } | undefined {
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    };
  } catch {
    return undefined;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.isProduction ? undefined : prettyTransport(),
      redact: {
        // Contracts and passwords must never end up in a log file.
        paths: ['req.headers.cookie', 'req.headers.authorization', 'req.body.password'],
        remove: true,
      },
    },
    trustProxy: true,
    bodyLimit: 25 * 1024 * 1024,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
  });
  await app.register(cookie, { secret: config.SESSION_SECRET });
  if (config.RATE_LIMIT_ENABLED) {
    // Registered as a plugin rather than enforced per route: with it absent, the per-route
    // `config.rateLimit` blocks are simply inert.
    await app.register(rateLimit, {
      global: false,
      max: 200,
      timeWindow: '1 minute',
    });
  }

  await app.register(errorsPlugin);
  await app.register(authPlugin);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Altar.Camp API',
        version: '0.1.0',
        description:
          'Artist signing and mission label platform. Phase 1: accounts, education, songs, splits, agreements, signatures, vault and admin.',
      },
      tags: [
        { name: 'auth', description: 'Accounts and sessions' },
        { name: 'artists', description: 'Profile, onboarding and dashboard' },
        { name: 'education', description: 'Orientation content and glossary' },
        { name: 'songs', description: 'Songs, contributors, splits and deal views' },
        { name: 'collaborators', description: 'Invitations and split approvals' },
        { name: 'agreements', description: 'Generation, versions and signatures' },
        { name: 'documents', description: 'Document vault' },
        { name: 'admin', description: 'Altar.Camp staff' },
      ],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(scalar, { routePrefix: '/docs' });

  app.get('/health', { schema: { hide: true } }, async () => {
    const started = Date.now();
    await getPool().query('SELECT 1');
    return { status: 'ok', database: 'ok', latencyMs: Date.now() - started };
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(artistRoutes, { prefix: '/api/artists' });
  await app.register(educationRoutes, { prefix: '/api/education' });
  await app.register(songRoutes, { prefix: '/api/songs' });
  await app.register(collaboratorRoutes, { prefix: '/api' });
  await app.register(agreementRoutes, { prefix: '/api/agreements' });
  await app.register(documentRoutes, { prefix: '/api/documents' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
}
