# Architecture

## The shape of it

Three processes, one database.

```
browser ──▶ nginx (web)  ──▶  static React bundle
                │
                └── /api/* ──▶ Fastify API ──▶ Postgres
                                    │
                                    └──▶ document storage (volume today, S3 later)
```

In development, Vite's dev server takes nginx's place and proxies `/api` to the API. In both cases
the API is **same-origin**, which is the point: the session cookie is first-party, `httpOnly`, and
no token is ever held in JavaScript.

## Why these choices

**Relational database.** Spec §36 recommends one and the domain demands it: ownership, agreements,
collaborators, percentages and accounting are relationships with invariants. Several rules this
product exists to enforce are expressed as constraints — a split belongs to a song _or_ a
commitment, a split carries an ownership right _or_ a revenue category, a percentage is between 0
and 10000 — and a constraint in the database holds even when a future endpoint forgets to check.

**TypeScript on both sides, with a shared package.** The split validator that refuses to save a
99% songwriting split is the same function the browser uses to grey out the button, and the same
sentence appears in both places. Duplicating that logic is how the two drift.

**Basis points, not floats.** Percentages are integers where 10000 = 100%. `33.33 + 33.33 + 33.34`
is not reliably 100 in binary floating point, and "your split is 99.99999% complete" is not a
sentence anyone should read. Money is in minor units (cents) for the same reason.

**No ORM.** Queries are SQL, in a repository module per domain area. The schema is the contract, the
migrations are readable, and the one thing an ORM would have bought — mapping — is a dozen lines.
It also avoids a generate-on-install step, which is a recurring source of half-installed builds.

**Fastify + zod, with the type provider.** One schema per route validates the request, types the
handler, and generates the OpenAPI document served at `/docs`. The schemas live in
`packages/shared`, so the web client imports the same types the API validates against.

## Request path

```
request
  └─ onRequest: session lookup       plugins/auth.ts   (cookie → hashed token → user + artist)
  └─ schema validation               zod, per route
  └─ route handler                   modules/<area>/routes.ts
       └─ service                    modules/<area>/service.ts   business rules
            └─ repo                  modules/<area>/repo.ts      SQL
  └─ error handler                   plugins/errors.ts  → { error: { code, message, details } }
```

Every module follows the same three-file shape. Routes do authorisation and shape; services hold
rules and transactions; repositories hold SQL.

## Sessions

Opaque random tokens, 32 bytes, stored **hashed** in `sessions`. A leaked database row cannot be
replayed as a session. The cookie is `httpOnly`, `SameSite=Lax`, and `Secure` in any environment
with `COOKIE_SECURE=true`. Changing a password revokes every session and immediately issues a fresh
one to the browser that made the change.

Passwords use scrypt from the Node standard library, with parameters recorded inside the hash so
they can be raised later without invalidating existing passwords. No native module, nothing to keep
patched.

## Agreements, versions and signatures

This is the part worth getting exactly right.

1. **Generation** reads the stored deal — splits, terms, contributors, services — and refuses
   outright if the deal validator reports a blocker. Nothing about the contract is typed by hand:
   the tables are built from the splits and the clauses are selected by the recorded terms.
2. The rendered result is written to `agreement_versions` as three views plus a
   **`terms_snapshot`** of the underlying numbers, and hashed. The hash covers the words _and_ the
   numbers, over canonical JSON, so it is stable across runs and sensitive to either changing.
3. **Signing** requires every affirmation, a typed name that matches the signer, and _the hash the
   browser was shown_. If the document moved underneath the signer, the signature is refused rather
   than silently applied to different words.
4. The signature stores the version, the hash, the affirmations, the time, the IP and the user
   agent, and a **certificate** — a canonical JSON payload of all of it, hashed.
5. When the last required signature lands, the executed document plus its certificates is written
   into the artist's vault as a system document that cannot be deleted.

A collaborator without an Altar.Camp account signs through a one-time link. Only the link's hash is
stored, it expires, and it is invalidated the moment it is used.

## Template rendering

Templates are stored in the database (seeded from `apps/api/src/templates`) and are **versioned,
never edited in place** — a signed document must keep pointing at the text that was signed. The
renderer substitutes `{{tokens}}` only, and **throws on an unresolved token**: a contract containing
`{{master_table}}` is a defect, not a cosmetic issue, so it must never reach a signature page.

The three views are not three documents. They are three renderings of one deal, so the plain-English
summary cannot say something the legal text does not.

## Document storage

`lib/storage.ts` is an interface with a local-disk driver. Files land on a Docker volume, never
inside the web root, and every read goes through an authorised API route that checks ownership. The
S3/MinIO driver is a drop-in for phase 2; nothing else in the app knows where bytes live.

## The front end

React 19, Vite, Tailwind 4, React Router 7. State is deliberately plain: a small `useQuery`/
`useMutation` pair over `fetch`, and an auth context. Every screen in phase 1 makes a handful of
reads; a cache layer would be more machinery than the product needs, and it is easy to add later
without rewriting screens.

Design tokens live in one file (`src/styles/theme.css`) as a Tailwind `@theme` block. Components use
those ramps; no screen invents a colour. Text never uses a step below 600 on a light surface.

The rendered agreement is Markdown, displayed by a small purpose-built renderer that handles exactly
what the templates produce and **never passes raw HTML through** — so a contract can carry an
artist's free text without carrying a script with it.

## Environment

Validated once at boot with zod (`apps/api/src/config.ts`). A missing secret stops the process
rather than surfacing as a confusing 500 hours later. `.env.example` documents every variable.

## Testing

- `packages/shared` — unit tests for the arithmetic and the rules: split validation, even
  distribution, allocation without losing a cent, the recoupment waterfall, the deal validator, the
  summary builders.
- `apps/api` — integration tests over the real routes and a real Postgres database, because the
  rules live in constraints and transactions as much as in TypeScript. The harness creates and
  migrates an isolated `altar_test` database per run.

Run both with `npm test`.
