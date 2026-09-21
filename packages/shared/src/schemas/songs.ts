import { z } from 'zod';
import {
  collaborationType,
  contributorRole,
  expenseCategory,
  expensePayer,
  masterStructure,
  moneyMinor,
  recordingStatus,
  recoupmentSource,
  revenueCategory,
  rightType,
  splitLine,
  uuid,
} from './common.js';

export const createSongRequest = z.object({
  title: z.string().min(1).max(200),
  collaborationType: collaborationType.optional(),
  recordingStatus: recordingStatus.default('idea'),
  expectedReleaseDate: z.iso.date().nullish(),
  notes: z.string().max(2000).optional(),
});
export type CreateSongRequest = z.infer<typeof createSongRequest>;

export const updateSongRequest = createSongRequest.partial();

export const addContributorRequest = z.object({
  legalName: z.string().min(2).max(200),
  stageName: z.string().max(200).optional(),
  email: z.union([z.email(), z.literal('')]).optional(),
  role: contributorRole,
  proAffiliation: z.string().max(60).optional(),
  publisherName: z.string().max(200).optional(),
  /** Songwriters and featured artists approve their own share — spec §33. */
  requiresApproval: z.boolean().default(true),
});
export type AddContributorRequest = z.infer<typeof addContributorRequest>;

export const setSplitRequest = z.object({
  rightType,
  lines: z.array(splitLine).max(30),
  masterStructure: masterStructure.optional(),
  /** Free text when the structure is a licence or "other" — spec §9. */
  structureNote: z.string().max(1000).optional(),
});
export type SetSplitRequest = z.infer<typeof setSplitRequest>;

export const setRevenueSplitRequest = z.object({
  splits: z
    .array(
      z.object({
        category: revenueCategory,
        label: z.string().max(120).optional(),
        lines: z.array(splitLine).max(30),
      }),
    )
    .max(20),
});
export type SetRevenueSplitRequest = z.infer<typeof setRevenueSplitRequest>;

export const recoupmentTermsRequest = z.object({
  payer: expensePayer,
  recoupable: z.boolean(),
  recoupedFrom: recoupmentSource,
  artistPersonallyLiable: z.boolean(),
  afterRecoupment: z.string().max(1000),
  investmentCapMinor: moneyMinor.nullable(),
  plannedExpenses: z
    .array(
      z.object({
        category: expenseCategory,
        description: z.string().max(300),
        amountMinor: moneyMinor.min(0),
        recoupable: z.boolean(),
      }),
    )
    .max(50)
    .default([]),
  acknowledged: z.boolean().default(false),
});
export type RecoupmentTermsRequest = z.infer<typeof recoupmentTermsRequest>;

export const clearancesRequest = z.object({
  samplesDeclared: z.boolean(),
  samplesCleared: z.boolean(),
  sampleNotes: z.string().max(2000).optional(),
});

export const invitationResponseRequest = z.object({
  action: z.enum(['accept', 'request_change', 'decline']),
  requestedBps: z.number().int().min(0).max(10_000).optional(),
  message: z.string().max(1000).optional(),
});
export type InvitationResponseRequest = z.infer<typeof invitationResponseRequest>;

export const songIdParam = z.object({ songId: uuid });
