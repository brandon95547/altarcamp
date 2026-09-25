/**
 * @altar/shared — the vocabulary, the maths and the wire contracts both the API and the web
 * app depend on. Nothing here touches a database, a request or the DOM.
 */

export * from './domain/enums.js';
export * from './domain/splits.js';
export * from './domain/revenue.js';
export * from './domain/expenses.js';
export * from './domain/validation.js';
export * from './domain/contact.js';
export * from './domain/countries.js';
export * from './domain/deal.js';

export * from './content/glossary.js';
export * from './content/education.js';
export * from './content/services.js';
export * from './content/questions.js';

export * as schemas from './schemas/index.js';

/** Wire types used across both apps, re-exported so callers do not reach into schemas. */
export type { SessionUser, SignupRequest, LoginRequest } from './schemas/auth.js';
export type {
  ArtistProfileRequest,
  ArtistSummary,
  ExistingRightsRequest,
  MissionProfileRequest,
} from './schemas/artists.js';
export type {
  AddContributorRequest,
  CreateSongRequest,
  InvitationResponseRequest,
  RecoupmentTermsRequest,
  SetRevenueSplitRequest,
  SetSplitRequest,
} from './schemas/songs.js';
export type {
  AgreementSummary,
  DocumentUploadRequest,
  GenerateAgreementRequest,
  SignAgreementRequest,
} from './schemas/agreements.js';
