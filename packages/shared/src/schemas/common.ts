import { z } from 'zod';
import {
  AGREEMENT_TYPES,
  COLLABORATION_TYPES,
  CONTRIBUTOR_ROLES,
  DEAL_PATHS,
  DOCUMENT_FOLDERS,
  EXPENSE_PAYERS,
  MASTER_STRUCTURES,
  RECORDING_STATUSES,
  RECOUPMENT_SOURCES,
  RIGHT_TYPES,
  USER_ROLES,
} from '../domain/enums.js';
import { EXPENSE_CATEGORIES } from '../domain/expenses.js';
import { REVENUE_CATEGORIES } from '../domain/revenue.js';
import { BPS_TOTAL } from '../domain/splits.js';

export const uuid = z.uuid();
export const bps = z.int().min(0).max(BPS_TOTAL);
export const moneyMinor = z.int();

export const userRole = z.enum(USER_ROLES);
export const dealPath = z.enum(DEAL_PATHS);
export const recordingStatus = z.enum(RECORDING_STATUSES);
export const collaborationType = z.enum(COLLABORATION_TYPES);
export const contributorRole = z.enum(CONTRIBUTOR_ROLES);
export const rightType = z.enum(RIGHT_TYPES);
export const masterStructure = z.enum(MASTER_STRUCTURES);
export const revenueCategory = z.enum(REVENUE_CATEGORIES);
export const expenseCategory = z.enum(EXPENSE_CATEGORIES);
export const expensePayer = z.enum(EXPENSE_PAYERS);
export const recoupmentSource = z.enum(RECOUPMENT_SOURCES);
export const agreementType = z.enum(AGREEMENT_TYPES);
export const documentFolder = z.enum(DOCUMENT_FOLDERS);

/** Participants are either a contributor row or the label itself. */
export const participantId = z.union([uuid, z.literal('altar')]);

export const splitLine = z.object({
  participantId,
  participantName: z.string().min(1).max(200),
  bps,
});
export type SplitLineInput = z.infer<typeof splitLine>;

export const errorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponse>;

export const okResponse = z.object({ ok: z.literal(true) });
