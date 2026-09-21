-- Altar.Camp — Phase 1 schema (spec §29, §30).
--
-- Design rule, spec §30: there is no column anywhere named artist_percentage. Every
-- percentage lives in `splits`, qualified by agreement, asset (song), right OR revenue
-- category, participant, and effective period. A percentage with no context is a dispute
-- waiting to happen.
--
-- Money is stored in minor units (cents) as BIGINT. Percentages are basis points
-- (INTEGER, 10000 = 100%).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Vocabulary. Mirrors packages/shared/src/domain/enums.ts.
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('artist', 'collaborator', 'admin', 'finance_admin', 'legal_admin');
CREATE TYPE deal_path AS ENUM ('single_song', 'one_year');
CREATE TYPE onboarding_step AS ENUM ('account', 'profile', 'existing_rights', 'education', 'choose_path');
CREATE TYPE recording_status AS ENUM ('idea', 'demo', 'recording', 'mixing', 'mastering', 'ready_for_release');
CREATE TYPE collaboration_type AS ENUM ('artist_artist', 'artist_producer', 'artist_altar', 'multi_artist');
CREATE TYPE contributor_role AS ENUM ('primary_artist', 'featured_artist', 'songwriter', 'producer', 'musician', 'vocalist', 'engineer', 'label');
CREATE TYPE right_type AS ENUM ('master', 'composition', 'publishing');
CREATE TYPE master_structure AS ENUM ('artist_owns_all', 'altar_owns_all', 'shared', 'exclusive_license', 'limited_term_license', 'other');
CREATE TYPE revenue_category AS ENUM ('master_streaming', 'downloads', 'physical', 'publishing', 'sync_licensing', 'neighboring_rights', 'live_performance', 'merchandise', 'sponsorship', 'brand_partnership', 'content_monetization', 'donations', 'other');
CREATE TYPE participant_kind AS ENUM ('contributor', 'label', 'artist');
CREATE TYPE agreement_type AS ENUM ('single_song_collaboration', 'songwriter_split_sheet', 'one_year_altar', 'featured_artist', 'producer', 'musician_vocalist_release', 'master_license', 'amendment', 'release_authorization', 'artwork_photography_release');
CREATE TYPE agreement_status AS ENUM ('draft', 'sent', 'viewed', 'partially_signed', 'signed', 'expired', 'amendment_required', 'void');
CREATE TYPE song_status AS ENUM ('created', 'collaborators_added', 'splits_proposed', 'splits_approved', 'agreement_generated', 'agreement_signed', 'production', 'rights_clearance', 'distribution_ready', 'released', 'accounting_active');
CREATE TYPE application_status AS ENUM ('started', 'profile_complete', 'mission_application_complete', 'altar_review', 'interview', 'terms_proposed', 'artist_reviewing', 'agreement_signed', 'active', 'year_complete', 'closed');
CREATE TYPE approval_status AS ENUM ('pending', 'accepted', 'change_requested', 'declined');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'change_requested', 'declined', 'expired');
CREATE TYPE expense_payer AS ENUM ('artist', 'altar', 'shared', 'third_party');
CREATE TYPE expense_category AS ENUM ('recording', 'production', 'mixing', 'mastering', 'music_video', 'marketing', 'publicity', 'artwork', 'tour_support', 'advance', 'distribution', 'other');
CREATE TYPE recoupment_source AS ENUM ('master_revenue', 'artist_share_only', 'all_revenue', 'not_recoupable');
CREATE TYPE document_folder AS ENUM ('agreements', 'songs', 'split_sheets', 'masters', 'publishing', 'artwork', 'distribution', 'accounting', 'mission');
CREATE TYPE activity_commitment AS ENUM ('required', 'opportunity', 'not_included');
CREATE TYPE signer_party AS ENUM ('artist', 'contributor', 'altar');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT NOT NULL,
  password_hash    TEXT NOT NULL,
  legal_name       TEXT NOT NULL,
  phone            TEXT,
  role             user_role NOT NULL DEFAULT 'artist',
  email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  -- Spec §37: MFA is required for administrators. Phase 1 records the requirement and
  -- enforces the flag; the second factor itself is wired up with the auth provider.
  mfa_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Only the hash is stored: a leaked database row cannot be replayed as a session.
  token_hash   TEXT NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  ip           TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- ---------------------------------------------------------------------------
-- Artists
-- ---------------------------------------------------------------------------
CREATE TABLE artists (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  artist_name         TEXT NOT NULL,
  country             TEXT NOT NULL,
  region              TEXT,
  website             TEXT,
  age_confirmed       BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_step     onboarding_step NOT NULL DEFAULT 'account',
  deal_path           deal_path,
  application_status  application_status,
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE artist_profiles (
  artist_id            UUID PRIMARY KEY REFERENCES artists(id) ON DELETE CASCADE,
  bio                  TEXT,
  photo_url            TEXT,
  genre                TEXT,
  influences           TEXT,
  mission_interests    TEXT,
  music_links          JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_distributor  TEXT,
  current_label        TEXT,
  current_publisher    TEXT,
  pro_affiliation      TEXT,
  management_name      TEXT,
  management_email     TEXT,
  attorney_name        TEXT,
  attorney_email       TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE artist_social_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id  UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL,
  url        TEXT NOT NULL
);
CREATE INDEX artist_social_profiles_artist_idx ON artist_social_profiles (artist_id);

-- Spec §6 step 3. A conflicting answer gates the deal until staff review it.
CREATE TABLE rights_disclosures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  question_key  TEXT NOT NULL,
  answer        BOOLEAN NOT NULL,
  detail        TEXT,
  has_conflict  BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at   TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES users(id),
  review_notes  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, question_key)
);

-- Spec §7. An artist cannot enter percentages until the orientation is passed.
CREATE TABLE education_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id           UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  lesson_slug         TEXT NOT NULL,
  selected_option_id  TEXT NOT NULL,
  is_correct          BOOLEAN NOT NULL,
  completed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artist_id, lesson_slug)
);

-- ---------------------------------------------------------------------------
-- One-year mission application (spec §14, §27)
-- ---------------------------------------------------------------------------
CREATE TABLE mission_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     UUID NOT NULL UNIQUE REFERENCES artists(id) ON DELETE CASCADE,
  status        application_status NOT NULL DEFAULT 'started',
  submitted_at  TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES users(id),
  review_notes  TEXT,
  interview_at  TIMESTAMPTZ,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mission_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES mission_applications(id) ON DELETE CASCADE,
  question_key    TEXT NOT NULL,
  value           TEXT NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, question_key)
);

-- Spec §15. The framework for the year; individual songs keep their own ownership records.
CREATE TABLE commitments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id         UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  auto_renew        BOOLEAN NOT NULL DEFAULT FALSE,
  status            application_status NOT NULL DEFAULT 'terms_proposed',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE TABLE commitment_activities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id  UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
  activity_key   TEXT NOT NULL,
  level          activity_commitment NOT NULL DEFAULT 'opportunity',
  note           TEXT,
  UNIQUE (commitment_id, activity_key)
);

-- ---------------------------------------------------------------------------
-- Songs, contributors, rights
-- ---------------------------------------------------------------------------
CREATE TABLE songs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id             UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  commitment_id         UUID REFERENCES commitments(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  collaboration_type    collaboration_type,
  recording_status      recording_status NOT NULL DEFAULT 'idea',
  status                song_status NOT NULL DEFAULT 'created',
  expected_release_date DATE,
  notes                 TEXT,
  samples_declared      BOOLEAN NOT NULL DEFAULT FALSE,
  samples_cleared       BOOLEAN NOT NULL DEFAULT FALSE,
  sample_notes          TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX songs_artist_idx ON songs (artist_id);

CREATE TABLE contributors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id          UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  legal_name       TEXT NOT NULL,
  stage_name       TEXT,
  email            TEXT,
  role             contributor_role NOT NULL,
  pro_affiliation  TEXT,
  publisher_name   TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  approval_status  approval_status NOT NULL DEFAULT 'pending',
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX contributors_song_idx ON contributors (song_id);

-- Spec §9: how the recording is held, separately from the percentages themselves.
CREATE TABLE master_terms (
  song_id              UUID PRIMARY KEY REFERENCES songs(id) ON DELETE CASCADE,
  structure            master_structure NOT NULL DEFAULT 'artist_owns_all',
  structure_note       TEXT,
  license_term_months  INTEGER,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (license_term_months IS NULL OR license_term_months > 0)
);

-- THE percentages table. Spec §30.
--
-- A split is qualified by: the asset (a song, or the one-year framework), the agreement that
-- froze it, the dimension (an ownership right OR a revenue category — never both), the
-- participant, and the period it is effective for.
CREATE TABLE splits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id           UUID REFERENCES songs(id) ON DELETE CASCADE,
  commitment_id     UUID REFERENCES commitments(id) ON DELETE CASCADE,
  agreement_id      UUID,                       -- set when an agreement freezes this split
  right_type        right_type,                 -- ownership dimension …
  revenue_category  revenue_category,           -- … or revenue dimension, never both
  participant_kind  participant_kind NOT NULL,
  contributor_id    UUID REFERENCES contributors(id) ON DELETE CASCADE,
  artist_id         UUID REFERENCES artists(id) ON DELETE CASCADE,
  participant_name  TEXT NOT NULL,
  bps               INTEGER NOT NULL,
  effective_from    DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to      DATE,
  note              TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT splits_one_asset CHECK ((song_id IS NOT NULL) <> (commitment_id IS NOT NULL)),
  CONSTRAINT splits_one_dimension CHECK ((right_type IS NOT NULL) <> (revenue_category IS NOT NULL)),
  CONSTRAINT splits_participant CHECK (
    (participant_kind = 'label' AND contributor_id IS NULL AND artist_id IS NULL) OR
    (participant_kind = 'contributor' AND contributor_id IS NOT NULL AND artist_id IS NULL) OR
    (participant_kind = 'artist' AND artist_id IS NOT NULL AND contributor_id IS NULL)
  ),
  CONSTRAINT splits_bps_range CHECK (bps >= 0 AND bps <= 10000),
  CONSTRAINT splits_period CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE INDEX splits_song_idx ON splits (song_id);
CREATE INDEX splits_commitment_idx ON splits (commitment_id);
CREATE INDEX splits_agreement_idx ON splits (agreement_id);

-- One live line per participant, per dimension, per asset, per period.
CREATE UNIQUE INDEX splits_unique_ownership ON splits (
  COALESCE(song_id, commitment_id),
  right_type,
  participant_kind,
  COALESCE(contributor_id, artist_id, '00000000-0000-0000-0000-000000000000'::uuid),
  effective_from
) WHERE right_type IS NOT NULL;

CREATE UNIQUE INDEX splits_unique_revenue ON splits (
  COALESCE(song_id, commitment_id),
  revenue_category,
  participant_kind,
  COALESCE(contributor_id, artist_id, '00000000-0000-0000-0000-000000000000'::uuid),
  effective_from
) WHERE revenue_category IS NOT NULL;

-- Publisher / PRO metadata per writer — the money-collection side of the composition.
CREATE TABLE publishing_interests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id          UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  contributor_id   UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  publisher_name   TEXT,
  pro_affiliation  TEXT,
  administered_by  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (song_id, contributor_id)
);

-- ---------------------------------------------------------------------------
-- Money in (spec §11). Phase 1 records the terms and the plan; phase 3 adds the ledger.
-- ---------------------------------------------------------------------------
CREATE TABLE recoupment_terms (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id                   UUID REFERENCES songs(id) ON DELETE CASCADE,
  commitment_id             UUID REFERENCES commitments(id) ON DELETE CASCADE,
  payer                     expense_payer NOT NULL DEFAULT 'altar',
  recoupable                BOOLEAN NOT NULL DEFAULT TRUE,
  recouped_from             recoupment_source NOT NULL DEFAULT 'master_revenue',
  artist_personally_liable  BOOLEAN NOT NULL DEFAULT FALSE,
  after_recoupment          TEXT NOT NULL DEFAULT '',
  investment_cap_minor      BIGINT,
  acknowledged_at           TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((song_id IS NOT NULL) <> (commitment_id IS NOT NULL)),
  CHECK (investment_cap_minor IS NULL OR investment_cap_minor >= 0)
);
CREATE UNIQUE INDEX recoupment_terms_song_key ON recoupment_terms (song_id) WHERE song_id IS NOT NULL;
CREATE UNIQUE INDEX recoupment_terms_commitment_key ON recoupment_terms (commitment_id) WHERE commitment_id IS NOT NULL;

CREATE TABLE planned_expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recoupment_terms_id UUID NOT NULL REFERENCES recoupment_terms(id) ON DELETE CASCADE,
  category            expense_category NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  amount_minor        BIGINT NOT NULL DEFAULT 0,
  recoupable          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (amount_minor >= 0)
);
CREATE INDEX planned_expenses_terms_idx ON planned_expenses (recoupment_terms_id);

-- ---------------------------------------------------------------------------
-- Agreements (spec §20, §21)
-- ---------------------------------------------------------------------------
CREATE TABLE agreement_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            agreement_type NOT NULL,
  version         INTEGER NOT NULL,
  title           TEXT NOT NULL,
  -- Three views of the same deal, spec §21.
  simple_body     TEXT NOT NULL,
  deal_sheet_body TEXT NOT NULL,
  legal_body      TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, version)
);

CREATE TABLE agreements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type           agreement_type NOT NULL,
  status         agreement_status NOT NULL DEFAULT 'draft',
  path           deal_path NOT NULL,
  artist_id      UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  song_id        UUID REFERENCES songs(id) ON DELETE CASCADE,
  commitment_id  UUID REFERENCES commitments(id) ON DELETE CASCADE,
  template_id    UUID NOT NULL REFERENCES agreement_templates(id),
  title          TEXT NOT NULL,
  special_terms  TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at        TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  void_reason    TEXT
);
CREATE INDEX agreements_artist_idx ON agreements (artist_id);
CREATE INDEX agreements_song_idx ON agreements (song_id);

-- Immutable: a signature points at exactly the bytes that were signed.
CREATE TABLE agreement_versions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id        UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  version             INTEGER NOT NULL,
  rendered_simple     TEXT NOT NULL,
  rendered_deal_sheet TEXT NOT NULL,
  rendered_legal      TEXT NOT NULL,
  terms_snapshot      JSONB NOT NULL,
  document_hash       TEXT NOT NULL,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agreement_id, version)
);

CREATE TABLE agreement_signers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id    UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  party           signer_party NOT NULL,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  contributor_id  UUID REFERENCES contributors(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  is_required     BOOLEAN NOT NULL DEFAULT TRUE,
  order_index     INTEGER NOT NULL DEFAULT 0,
  -- A signer without an Altar.Camp account signs through a one-time link; only its hash is stored.
  token_hash      TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  viewed_at       TIMESTAMPTZ,
  signed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX agreement_signers_agreement_idx ON agreement_signers (agreement_id);

-- Spec §21: signer, timestamp, version, audit metadata, document hash, certificate.
CREATE TABLE signatures (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id          UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  agreement_version_id  UUID NOT NULL REFERENCES agreement_versions(id) ON DELETE CASCADE,
  signer_id             UUID NOT NULL REFERENCES agreement_signers(id) ON DELETE CASCADE,
  typed_name            TEXT NOT NULL,
  affirmations          JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_hash         TEXT NOT NULL,
  ip                    TEXT,
  user_agent            TEXT,
  certificate_payload   JSONB NOT NULL,
  certificate_hash      TEXT NOT NULL,
  signed_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (signer_id, agreement_version_id)
);

-- What Altar.Camp promised, per agreement (spec §16).
CREATE TABLE agreement_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id  UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  service_key   TEXT NOT NULL,
  note          TEXT,
  UNIQUE (agreement_id, service_key)
);

ALTER TABLE splits
  ADD CONSTRAINT splits_agreement_fk FOREIGN KEY (agreement_id) REFERENCES agreements(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Collaborator invitations (spec §33)
-- ---------------------------------------------------------------------------
CREATE TABLE invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id         UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  contributor_id  UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  invited_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  token_hash      TEXT NOT NULL UNIQUE,
  status          invitation_status NOT NULL DEFAULT 'pending',
  proposed_bps    INTEGER,
  requested_bps   INTEGER,
  message         TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  CHECK (proposed_bps IS NULL OR (proposed_bps BETWEEN 0 AND 10000)),
  CHECK (requested_bps IS NULL OR (requested_bps BETWEEN 0 AND 10000))
);
CREATE INDEX invitations_contributor_idx ON invitations (contributor_id);

-- ---------------------------------------------------------------------------
-- Document vault (spec §31)
-- ---------------------------------------------------------------------------
CREATE TABLE documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id      UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  folder         document_folder NOT NULL,
  filename       TEXT NOT NULL,
  content_type   TEXT NOT NULL,
  byte_size      BIGINT NOT NULL,
  storage_key    TEXT NOT NULL,
  sha256         TEXT NOT NULL,
  song_id        UUID REFERENCES songs(id) ON DELETE SET NULL,
  agreement_id   UUID REFERENCES agreements(id) ON DELETE SET NULL,
  -- System-generated documents (a signed agreement PDF/HTML) cannot be deleted by the artist.
  is_system      BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX documents_artist_idx ON documents (artist_id, folder);

-- ---------------------------------------------------------------------------
-- Notifications & audit (spec §32, §37)
-- ---------------------------------------------------------------------------
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  link        TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, read_at);

CREATE TABLE audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role     user_role,
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      UUID,
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip             TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Convenience views
-- ---------------------------------------------------------------------------

-- Every live ownership split with its total, so "does this add to 100%?" is one query.
CREATE VIEW v_ownership_totals AS
SELECT song_id, commitment_id, right_type,
       SUM(bps)::INTEGER AS total_bps, COUNT(*)::INTEGER AS line_count
FROM splits
WHERE right_type IS NOT NULL AND effective_to IS NULL
GROUP BY song_id, commitment_id, right_type;

CREATE VIEW v_revenue_totals AS
SELECT song_id, commitment_id, revenue_category,
       SUM(bps)::INTEGER AS total_bps, COUNT(*)::INTEGER AS line_count
FROM splits
WHERE revenue_category IS NOT NULL AND effective_to IS NULL
GROUP BY song_id, commitment_id, revenue_category;
