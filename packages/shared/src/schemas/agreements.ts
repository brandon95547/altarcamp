import { z } from 'zod';
import { SIGNING_AFFIRMATIONS } from '../content/questions.js';
import { agreementType, dealPath, documentFolder, uuid } from './common.js';
import { AGREEMENT_STATUSES, AGREEMENT_VIEWS } from '../domain/enums.js';

export const generateAgreementRequest = z.object({
  type: agreementType,
  songId: uuid.optional(),
  commitmentId: uuid.optional(),
  /** Staff-only override for a negotiated clause. */
  specialTerms: z.string().max(5000).optional(),
});
export type GenerateAgreementRequest = z.infer<typeof generateAgreementRequest>;

const affirmationKeys = SIGNING_AFFIRMATIONS.map((affirmation) => affirmation.key) as [
  string,
  ...string[],
];

export const signAgreementRequest = z.object({
  /** Typed signature — must match the signer's legal name on file. */
  typedName: z.string().min(2).max(200),
  affirmations: z.array(z.enum(affirmationKeys)).min(affirmationKeys.length),
  /** The hash the browser was shown. The API refuses if the document moved underneath it. */
  documentHash: z.string().length(64),
  agreementVersion: z.int().min(1),
});
export type SignAgreementRequest = z.infer<typeof signAgreementRequest>;

export const agreementSummary = z.object({
  id: uuid,
  type: agreementType,
  status: z.enum(AGREEMENT_STATUSES),
  version: z.int(),
  path: dealPath,
  title: z.string(),
  songId: uuid.nullable(),
  songTitle: z.string().nullable(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
  signedAt: z.string().nullable(),
  signerCount: z.int(),
  signedCount: z.int(),
});
export type AgreementSummary = z.infer<typeof agreementSummary>;

export const agreementViewParam = z.object({ view: z.enum(AGREEMENT_VIEWS).default('simple') });

export const documentUploadRequest = z.object({
  folder: documentFolder,
  filename: z.string().min(1).max(255),
  contentType: z.string().max(120),
  /** Base64 payload. Phase 1 keeps documents small; large audio moves to object storage in phase 2. */
  data: z.string().max(20_000_000),
  songId: uuid.optional(),
});
export type DocumentUploadRequest = z.infer<typeof documentUploadRequest>;
