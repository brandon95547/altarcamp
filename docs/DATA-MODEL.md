# Data model

Spec §29 lists the entities; spec §30 gives the rule that shapes them. This document explains what
exists, what it enforces, and what is deliberately absent.

Everything here is created by `apps/api/src/db/migrations/0001_init.sql`.

## The rule

> Never store one generic field named `artist_percentage`. Instead store percentage by agreement,
> asset, right, revenue category, participant and effective period. — §30

There is exactly one percentages table, and every one of those qualifiers is a column on it.

```sql
CREATE TABLE splits (
  id                UUID PRIMARY KEY,
  song_id           UUID REFERENCES songs(id),          -- the asset …
  commitment_id     UUID REFERENCES commitments(id),    -- … or the one-year framework
  agreement_id      UUID REFERENCES agreements(id),     -- the agreement that froze it
  right_type        right_type,                         -- an ownership dimension …
  revenue_category  revenue_category,                   -- … or a revenue dimension
  participant_kind  participant_kind NOT NULL,          -- contributor | artist | label
  contributor_id    UUID REFERENCES contributors(id),
  artist_id         UUID REFERENCES artists(id),
  participant_name  TEXT NOT NULL,
  bps               INTEGER NOT NULL,                   -- 10000 = 100%
  effective_from    DATE NOT NULL,
  effective_to      DATE,                               -- NULL = live
  ...
  CONSTRAINT splits_one_asset     CHECK ((song_id IS NOT NULL) <> (commitment_id IS NOT NULL)),
  CONSTRAINT splits_one_dimension CHECK ((right_type IS NOT NULL) <> (revenue_category IS NOT NULL)),
  CONSTRAINT splits_bps_range     CHECK (bps BETWEEN 0 AND 10000)
);
```

Three consequences worth stating:

- **A master split and a songwriting split are rows that differ by one column.** They can never be
  accidentally merged, and a query for one can never return the other.
- **Changing a split supersedes rather than overwrites.** The old row gets an `effective_to`; the
  new row is inserted. "Who changed my share, and when" stays answerable for as long as the
  database exists.
- **A percentage is meaningless without its row.** There is no column anywhere that holds a bare
  share of anything.

Two views (`v_ownership_totals`, `v_revenue_totals`) sum the live rows per asset and dimension, so
"does this add to 100%?" is one query rather than a fold in application code.

## Tables

### Identity

| Table      | Holds                             | Notes                                           |
| ---------- | --------------------------------- | ----------------------------------------------- |
| `users`    | Login, legal name, role, MFA flag | Email is unique case-insensitively; scrypt hash |
| `sessions` | Session tokens                    | Only the SHA-256 of the token is stored         |

### Artists

| Table                    | Holds                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `artists`                | Stage name, country, onboarding step, chosen path, application status                                         |
| `artist_profiles`        | Bio, genre, influences, mission interests, PRO, existing distributor/label/publisher, management and attorney |
| `artist_social_profiles` | Platform + URL                                                                                                |
| `rights_disclosures`     | One row per §6 question, whether it conflicts, and the staff review that cleared it                           |
| `education_progress`     | One row per lesson: what was chosen, whether it was right                                                     |

An unreviewed conflicting disclosure is a **blocker**: the deal validator refuses to generate an
agreement while one stands.

### The one-year path

| Table                   | Holds                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| `mission_applications`  | Status through the §27 workflow, review notes, interview time    |
| `mission_answers`       | One row per §14 question                                         |
| `commitments`           | Start, end, auto-renew, status — the framework for the year      |
| `commitment_activities` | Each §15 activity as `required`, `opportunity` or `not_included` |

The distinction between required and offered is stored, not implied, and it is what the agreement
prints.

### Songs and rights

| Table                  | Holds                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `songs`                | Title, collaboration type, recording status, §28 workflow status, declared samples              |
| `contributors`         | Everyone on the recording, their role, PRO/publisher, and their approval state                  |
| `master_terms`         | The §9 structure (owned, shared, exclusive or limited-term licence, other) and any licence term |
| `splits`               | Every percentage — see above                                                                    |
| `publishing_interests` | Publisher and PRO per writer: the collection side of the composition                            |

### Money in

| Table              | Holds                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `recoupment_terms` | Who pays, whether it is recouped, from which revenue, whether the artist is personally liable, what happens afterwards, the investment cap |
| `planned_expenses` | The costs contemplated at signing — Schedule B in the generated agreement                                                                  |

Belongs to a song **or** a commitment, never both, enforced by a check plus two partial unique
indexes.

### Agreements

| Table                 | Holds                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| `agreement_templates` | Versioned template text for the three views                                           |
| `agreements`          | Type, status, artist, song or commitment, template, special terms                     |
| `agreement_versions`  | The rendered views, the `terms_snapshot`, and the document hash — immutable           |
| `agreement_signers`   | Who must sign, in what order, and the hash of their one-time signing link             |
| `signatures`          | Typed name, affirmations, document hash, IP, user agent, certificate payload and hash |
| `agreement_services`  | What Altar.Camp promised in this agreement (§16)                                      |

A signature references an `agreement_version`, never an agreement. The version it points at cannot
change, so "what did they actually sign" is always answerable.

### Everything else

| Table           | Holds                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- |
| `invitations`   | §33 collaborator invitations: proposed and requested percentages, status, hashed token   |
| `documents`     | The §31 vault; `is_system` marks the documents an artist may download but not delete     |
| `notifications` | §32, in-app today; email and push read the same rows later                               |
| `audit_logs`    | §37, append-only by convention: signatures, split changes, rights reviews, staff actions |

## Enumerated types

Postgres enums mirror `packages/shared/src/domain/enums.ts` one for one: roles, deal paths,
recording and song statuses, collaboration types, contributor roles, right types, master
structures, revenue categories, agreement types and statuses, application statuses, approval and
invitation states, expense payers and categories, recoupment sources, document folders, activity
commitments, and signer parties.

The database is the source of truth for what is storable; the shared package is the source of truth
for what the product calls it. Adding a value means `ALTER TYPE ... ADD VALUE` in a new migration
and a matching entry in the shared enum.

## Phase 2 and 3

Deliberately absent, to be added when their features are built rather than sitting empty:

- **Phase 2 (§39)** — `releases`, `metadata_records`, `isrcs`, `distributors`, `rights_clearances`,
  `sample_clearances`, `artwork_assets`, `release_checklist_items`, `events`, `mission_trips`.
- **Phase 3 (§40)** — `revenue_transactions`, `expenses` (actuals, as opposed to planned),
  `recoupment_ledger`, `royalty_statements`, `payments`, `statement_lines`.

The Phase 3 tables will attach to `splits` by `agreement_id` and dimension. Because every
percentage is already qualified by right, category, participant and period, royalty calculation is
a join rather than a migration.

## Migrations

Forward-only, one file, run inside a transaction and recorded by name in `schema_migrations`. There
are no down migrations: rolling a schema backwards over signed agreements is not something to make
easy. The runner (`apps/api/src/db/migrate.ts`) executes at boot and is idempotent.
