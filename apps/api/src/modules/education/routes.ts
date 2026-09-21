import {
  ALTAR_PROMISE,
  EDUCATION_LESSONS,
  GLOSSARY,
  MISSION_QUESTIONS,
  REVENUE_CATEGORY_DEFINITIONS,
  RIGHTS_QUESTIONS,
  RIGHTS_CONFLICT_WARNING,
  SERVICES,
  SERVICE_GROUPS,
  SIGNING_AFFIRMATIONS,
  YEAR_ACTIVITIES,
} from '@altar/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

/**
 * Content the web app renders: the orientation, the glossary and the questionnaires.
 *
 * It is served rather than duplicated in the front end so the wording an artist reads is
 * the same wording the API validates against, and so it can move into the database when
 * Altar.Camp wants to edit it without a deploy.
 */
export const educationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/lessons',
    { schema: { tags: ['education'], summary: 'Orientation lessons (spec §7)' } },
    async () => ({ lessons: EDUCATION_LESSONS }),
  );

  app.get(
    '/glossary',
    { schema: { tags: ['education'], summary: 'Plain-English definitions (spec §43)' } },
    async () => ({ glossary: GLOSSARY }),
  );

  app.get(
    '/reference',
    { schema: { tags: ['education'], summary: 'Questionnaires, services and revenue categories' } },
    async () => ({
      rightsQuestions: RIGHTS_QUESTIONS,
      rightsConflictWarning: RIGHTS_CONFLICT_WARNING,
      missionQuestions: MISSION_QUESTIONS,
      services: SERVICES,
      serviceGroups: SERVICE_GROUPS,
      revenueCategories: REVENUE_CATEGORY_DEFINITIONS,
      yearActivities: YEAR_ACTIVITIES,
      affirmations: SIGNING_AFFIRMATIONS,
      promise: ALTAR_PROMISE,
    }),
  );
};
