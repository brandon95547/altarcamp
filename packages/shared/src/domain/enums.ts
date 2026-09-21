/**
 * Altar.Camp domain vocabulary.
 *
 * Every string union here is mirrored by a Postgres enum or a CHECK constraint in
 * apps/api/src/db/migrations. Keep the two in sync — the database is the source of
 * truth for what is storable, this file is the source of truth for what the product
 * calls it.
 */

/** Account roles — spec §4. */
export const USER_ROLES = [
  'artist',
  'collaborator',
  'admin',
  'finance_admin',
  'legal_admin',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_ROLES: readonly UserRole[] = ['admin', 'finance_admin', 'legal_admin'];

export const ROLE_LABELS: Record<UserRole, string> = {
  artist: 'Artist',
  collaborator: 'Collaborator',
  admin: 'Altar.Camp Administrator',
  finance_admin: 'Finance / Royalty Administrator',
  legal_admin: 'Legal / Agreement Administrator',
};

/** The two ways to work with Altar.Camp — spec §1. */
export const DEAL_PATHS = ['single_song', 'one_year'] as const;
export type DealPath = (typeof DEAL_PATHS)[number];

export const DEAL_PATH_LABELS: Record<DealPath, string> = {
  single_song: 'One Song',
  one_year: 'One Year',
};

/** Onboarding steps every artist completes before choosing a path — spec §6, §7. */
export const ONBOARDING_STEPS = [
  'account',
  'profile',
  'existing_rights',
  'education',
  'choose_path',
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Recording status — spec §8 step 1. */
export const RECORDING_STATUSES = [
  'idea',
  'demo',
  'recording',
  'mixing',
  'mastering',
  'ready_for_release',
] as const;
export type RecordingStatus = (typeof RECORDING_STATUSES)[number];

export const RECORDING_STATUS_LABELS: Record<RecordingStatus, string> = {
  idea: 'Idea',
  demo: 'Demo',
  recording: 'Recording',
  mixing: 'Mixing',
  mastering: 'Mastering',
  ready_for_release: 'Ready for release',
};

/** Collaboration shapes — spec §8 step 2. */
export const COLLABORATION_TYPES = [
  'artist_artist',
  'artist_producer',
  'artist_altar',
  'multi_artist',
] as const;
export type CollaborationType = (typeof COLLABORATION_TYPES)[number];

export const COLLABORATION_TYPE_LABELS: Record<CollaborationType, string> = {
  artist_artist: 'Artist + Artist',
  artist_producer: 'Artist + Producer',
  artist_altar: 'Artist + Altar.Camp',
  multi_artist: 'Multiple Artist Collaboration',
};

/** How a person participates in a recording — spec §4 (Collaborator). */
export const CONTRIBUTOR_ROLES = [
  'primary_artist',
  'featured_artist',
  'songwriter',
  'producer',
  'musician',
  'vocalist',
  'engineer',
  'label',
] as const;
export type ContributorRole = (typeof CONTRIBUTOR_ROLES)[number];

export const CONTRIBUTOR_ROLE_LABELS: Record<ContributorRole, string> = {
  primary_artist: 'Primary artist',
  featured_artist: 'Featured artist',
  songwriter: 'Songwriter',
  producer: 'Producer',
  musician: 'Musician',
  vocalist: 'Vocalist',
  engineer: 'Engineer',
  label: 'Altar.Camp',
};

/**
 * Which information a collaborator is asked for.
 * "A collaborator should only be required to complete information relevant to their
 * participation." — spec §4.
 */
export const CONTRIBUTOR_REQUIRED_FIELDS: Record<ContributorRole, readonly string[]> = {
  primary_artist: ['legal_name', 'stage_name', 'email', 'pro_affiliation'],
  featured_artist: ['legal_name', 'stage_name', 'email'],
  songwriter: ['legal_name', 'email', 'pro_affiliation', 'publisher_name'],
  producer: ['legal_name', 'email'],
  musician: ['legal_name', 'email'],
  vocalist: ['legal_name', 'email'],
  engineer: ['legal_name', 'email'],
  label: ['legal_name'],
};

/** The rights a split can describe — kept separate on purpose, spec §2 and §9. */
export const RIGHT_TYPES = ['master', 'composition', 'publishing'] as const;
export type RightType = (typeof RIGHT_TYPES)[number];

export const RIGHT_TYPE_LABELS: Record<RightType, string> = {
  master: 'Master ownership',
  composition: 'Songwriting ownership',
  publishing: 'Publishing ownership / administration',
};

/** Master ownership structures — spec §9. */
export const MASTER_STRUCTURES = [
  'artist_owns_all',
  'altar_owns_all',
  'shared',
  'exclusive_license',
  'limited_term_license',
  'other',
] as const;
export type MasterStructure = (typeof MASTER_STRUCTURES)[number];

export const MASTER_STRUCTURE_LABELS: Record<MasterStructure, string> = {
  artist_owns_all: 'Artist owns 100%',
  altar_owns_all: 'Altar.Camp owns 100%',
  shared: 'Shared ownership',
  exclusive_license: 'Altar.Camp receives an exclusive license',
  limited_term_license: 'Altar.Camp receives a limited-term license',
  other: 'Other negotiated arrangement',
};

/** Agreement types — spec §20. Phase 1 generates the starred ones. */
export const AGREEMENT_TYPES = [
  'single_song_collaboration',
  'songwriter_split_sheet',
  'one_year_altar',
  'featured_artist',
  'producer',
  'musician_vocalist_release',
  'master_license',
  'amendment',
  'release_authorization',
  'artwork_photography_release',
] as const;
export type AgreementType = (typeof AGREEMENT_TYPES)[number];

export const AGREEMENT_TYPE_LABELS: Record<AgreementType, string> = {
  single_song_collaboration: 'Single Song Collaboration Agreement',
  songwriter_split_sheet: 'Songwriter Split Sheet',
  one_year_altar: 'One-Year Altar.Camp Agreement',
  featured_artist: 'Featured Artist Agreement',
  producer: 'Producer Agreement',
  musician_vocalist_release: 'Musician / Vocalist Release',
  master_license: 'Master License Agreement',
  amendment: 'Amendment',
  release_authorization: 'Release Authorization',
  artwork_photography_release: 'Artwork / Photography Release',
};

/** Agreement lifecycle — spec §26 (CONTRACTS). */
export const AGREEMENT_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'partially_signed',
  'signed',
  'expired',
  'amendment_required',
  'void',
] as const;
export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  partially_signed: 'Partially signed',
  signed: 'Signed',
  expired: 'Expired',
  amendment_required: 'Amendment required',
  void: 'Void',
};

/** Single-song workflow — spec §28. */
export const SONG_STATUSES = [
  'created',
  'collaborators_added',
  'splits_proposed',
  'splits_approved',
  'agreement_generated',
  'agreement_signed',
  'production',
  'rights_clearance',
  'distribution_ready',
  'released',
  'accounting_active',
] as const;
export type SongStatus = (typeof SONG_STATUSES)[number];

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  created: 'Song created',
  collaborators_added: 'Collaborators added',
  splits_proposed: 'Splits proposed',
  splits_approved: 'Splits approved',
  agreement_generated: 'Agreement generated',
  agreement_signed: 'Agreement signed',
  production: 'Production',
  rights_clearance: 'Rights clearance',
  distribution_ready: 'Distribution ready',
  released: 'Released',
  accounting_active: 'Accounting active',
};

/** One-year application workflow — spec §27. */
export const APPLICATION_STATUSES = [
  'started',
  'profile_complete',
  'mission_application_complete',
  'altar_review',
  'interview',
  'terms_proposed',
  'artist_reviewing',
  'agreement_signed',
  'active',
  'year_complete',
  'closed',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  started: 'Application started',
  profile_complete: 'Profile complete',
  mission_application_complete: 'Mission application complete',
  altar_review: 'Altar.Camp review',
  interview: 'Interview',
  terms_proposed: 'Terms proposed',
  artist_reviewing: 'Artist reviewing',
  agreement_signed: 'Agreement signed',
  active: 'Active Altar.Camp artist',
  year_complete: 'Year complete',
  closed: 'Renew / graduate / continue independently',
};

/** Collaborator invitation lifecycle — spec §33. */
export const INVITATION_STATUSES = [
  'pending',
  'accepted',
  'change_requested',
  'declined',
  'expired',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** Who carries a cost and whether it comes back out of revenue — spec §11. */
export const EXPENSE_PAYERS = ['artist', 'altar', 'shared', 'third_party'] as const;
export type ExpensePayer = (typeof EXPENSE_PAYERS)[number];

export const RECOUPMENT_SOURCES = [
  'master_revenue',
  'artist_share_only',
  'all_revenue',
  'not_recoupable',
] as const;
export type RecoupmentSource = (typeof RECOUPMENT_SOURCES)[number];

export const RECOUPMENT_SOURCE_LABELS: Record<RecoupmentSource, string> = {
  master_revenue: 'Master revenue, before the split',
  artist_share_only: "The artist's share, after the split",
  all_revenue: 'All revenue this agreement covers',
  not_recoupable: 'Not recouped — Altar.Camp absorbs it',
};

/** Document vault folders — spec §31. */
export const DOCUMENT_FOLDERS = [
  'agreements',
  'songs',
  'split_sheets',
  'masters',
  'publishing',
  'artwork',
  'distribution',
  'accounting',
  'mission',
] as const;
export type DocumentFolder = (typeof DOCUMENT_FOLDERS)[number];

export const DOCUMENT_FOLDER_LABELS: Record<DocumentFolder, string> = {
  agreements: 'Agreements',
  songs: 'Songs',
  split_sheets: 'Split Sheets',
  masters: 'Masters',
  publishing: 'Publishing',
  artwork: 'Artwork',
  distribution: 'Distribution',
  accounting: 'Accounting',
  mission: 'Mission',
};

/** Notification kinds — spec §32. */
export const NOTIFICATION_TYPES = [
  'collaborator_invited',
  'split_proposed',
  'split_disputed',
  'split_approved',
  'agreement_available',
  'agreement_signed',
  'missing_information',
  'application_status_changed',
  'release_approved',
  'release_date_approaching',
  'royalty_statement_available',
  'payment_issued',
  'mission_event_added',
  'year_nearing_completion',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** The three ways to read an agreement — spec §21. */
export const AGREEMENT_VIEWS = ['simple', 'deal_sheet', 'legal'] as const;
export type AgreementView = (typeof AGREEMENT_VIEWS)[number];

export const AGREEMENT_VIEW_LABELS: Record<AgreementView, string> = {
  simple: 'Simple',
  deal_sheet: 'Deal sheet',
  legal: 'Legal agreement',
};
