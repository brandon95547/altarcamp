import { z } from 'zod';
import { MISSION_QUESTIONS, RIGHTS_QUESTIONS } from '../content/questions.js';
import { dealPath, uuid } from './common.js';
import { APPLICATION_STATUSES, ONBOARDING_STEPS } from '../domain/enums.js';

export const artistProfileRequest = z.object({
  bio: z.string().max(4000).optional(),
  photoUrl: z.string().max(500).optional(),
  genre: z.string().max(120).optional(),
  influences: z.string().max(500).optional(),
  missionInterests: z.string().max(1000).optional(),
  musicLinks: z.array(z.string().max(300)).max(10).optional(),
  currentDistributor: z.string().max(200).optional(),
  currentLabel: z.string().max(200).optional(),
  currentPublisher: z.string().max(200).optional(),
  proAffiliation: z.string().max(60).optional(),
  managementName: z.string().max(200).optional(),
  managementEmail: z.union([z.email(), z.literal('')]).optional(),
  attorneyName: z.string().max(200).optional(),
  attorneyEmail: z.union([z.email(), z.literal('')]).optional(),
});
export type ArtistProfileRequest = z.infer<typeof artistProfileRequest>;

const rightsKeys = RIGHTS_QUESTIONS.map((question) => question.key) as [string, ...string[]];

export const existingRightsRequest = z.object({
  answers: z
    .array(
      z.object({
        key: z.enum(rightsKeys),
        answer: z.boolean(),
        detail: z.string().max(300).optional(),
      }),
    )
    .min(rightsKeys.length),
});
export type ExistingRightsRequest = z.infer<typeof existingRightsRequest>;

const missionKeys = MISSION_QUESTIONS.map((question) => question.key) as [string, ...string[]];

export const missionProfileRequest = z.object({
  answers: z.array(
    z.object({
      key: z.enum(missionKeys),
      value: z.string().max(4000),
    }),
  ),
  submit: z.boolean().default(false),
});
export type MissionProfileRequest = z.infer<typeof missionProfileRequest>;

export const educationProgressRequest = z.object({
  lessonSlug: z.string().max(80),
  selectedOptionId: z.string().max(10),
});

export const choosePathRequest = z.object({ path: dealPath });

export const artistSummary = z.object({
  id: uuid,
  artistName: z.string(),
  legalName: z.string(),
  email: z.string(),
  path: dealPath.nullable(),
  onboardingStep: z.enum(ONBOARDING_STEPS),
  applicationStatus: z.enum(APPLICATION_STATUSES).nullable(),
  educationCompletedAt: z.string().nullable(),
  hasRightsConflict: z.boolean(),
  createdAt: z.string(),
});
export type ArtistSummary = z.infer<typeof artistSummary>;
