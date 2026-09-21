# Altar.Camp

**Artist signing & mission label platform.** Know what you own. Know what you share. Know where the
money goes. Know what we're building together.

Altar.Camp makes joining a record label understandable. Instead of handing an independent artist a
long contract before they understand it, the platform walks them through the relationship one
decision at a time — and refuses to generate an agreement while any of those decisions is vague.

This repository is **Phase 1: the signing experience** (spec §38).

---

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- Web — http://localhost:5190
- API — http://localhost:4000 (interactive docs at http://localhost:4000/docs)
- Postgres — localhost:5442

The API migrates and seeds itself on boot. With `SEED_DEMO=true` (the default) it also creates a
demo artist whose song is mid-flow, so the product can be walked through immediately. Set
`SEED_DEMO=false` for a real deployment.

| Account                        | Email               | Password              |
| ------------------------------ | ------------------- | --------------------- |
| Altar.Camp administrator       | `admin@altar.camp`  | `AltarCampAdmin!2026` |
| Demo artist (`SEED_DEMO=true`) | `jesse@example.com` | `AltarCampDemo!2026`  |

Change the administrator password before this is exposed to anyone.

### Developing without Docker

Postgres still runs in Docker; the apps run on the host with hot reload.

```bash
docker compose up -d db
npm install
npm run dev              # API on :4000, web on :5190
```

`apps/api/.env` holds the API's development environment. The web app talks to the API through the
Vite proxy, so the session cookie is first-party in development exactly as it is in production.

### Scripts

| Command                                             | What it does                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm run dev`                                       | API and web together, with reload                                              |
| `npm run build`                                     | Type-check and build every workspace                                           |
| `npm test`                                          | 61 tests — domain unit tests and API integration tests against a real database |
| `npm run typecheck`                                 | Type-check every workspace                                                     |
| `npm run db:migrate`                                | Apply pending migrations                                                       |
| `npm run db:seed`                                   | Seed templates, the administrator and (in development) demo data               |
| `npm run db:reset`                                  | Drop, migrate and seed — development only                                      |
| `npm run docker:up` / `docker:down` / `docker:logs` | The whole stack                                                                |

Tests need the database running (`docker compose up -d db`). They create and migrate their own
`altar_test` database, so they never touch development data.

---

## What Phase 1 does

Spec §38 asks for the signing experience end to end. All of it is built:

- **Public website** — the two ways in, how it works, the mission, and a glossary of every term.
- **Artist accounts** and **artist profile** (§6).
- **Existing-rights disclosure** (§6 step 3) — a declared label, distribution, publishing or
  management agreement blocks signing until staff have reviewed it.
- **Education module** (§7) — five lessons with a check each. An artist cannot choose a path or
  enter a percentage until they have passed it.
- **Choose One Song or One Year** (§5).
- **Song creation and collaborators** (§8) with role-appropriate fields (§4).
- **Collaborator invitations** (§33) — the invitation carries the proposed percentage; the
  collaborator accepts, asks for a different number, or declines.
- **Songwriter splits**, **master ownership** and **revenue splits** (§8, §9, §10) — always
  separate, always totalling exactly 100%, always in the same split builder.
- **Expenses and recoupment** (§11) with a worked example before signing.
- **Deal summary**, **fair-deal disclosure** and **Your Five Answers** (§12, §17, §35).
- **Contract generation** (§20) with three views of one agreement (§21).
- **Electronic signature** (§21) — affirmations, typed name, document hash, version, IP and device
  metadata, and a signature certificate.
- **Document vault** (§31) — signed agreements file themselves there and cannot be deleted.
- **Admin dashboard** (§26, §27) — applicants, rights review, the contract pipeline, proposing a
  one-year framework, and the audit log.

### What Phase 1 deliberately does not do

Release management, ISRCs, distributor workflow and release readiness are Phase 2 (§39). Royalty
import, recoupment ledgers, statements and payments are Phase 3 (§40). Where those surfaces appear
in the navigation, they say so plainly rather than showing invented zeroes. See
[docs/PHASE-1-SCOPE.md](docs/PHASE-1-SCOPE.md) for the section-by-section map.

---

## Repository layout

```
altar/
├── apps/
│   ├── api/                 Fastify + Postgres API
│   │   └── src/
│   │       ├── db/          pool, forward-only SQL migrations, seeds
│   │       ├── lib/         password, crypto, storage, contract rendering, audit
│   │       ├── modules/     auth, artists, education, songs, collaborators,
│   │       │                agreements, documents, admin  (routes + service + repo)
│   │       ├── plugins/     session auth, error shape
│   │       ├── templates/   agreement templates, versioned
│   │       └── test/        integration tests against a real database
│   └── web/                 React 19 + Vite + Tailwind 4
│       └── src/
│           ├── components/  ui kit, layouts, split builders
│           ├── features/    marketing, auth, onboarding, song, year, dashboard,
│           │                documents, admin
│           ├── lib/         API client, hooks, auth context
│           └── styles/      design tokens
├── packages/shared/         the vocabulary, the maths and the wire contracts
├── docker/                  Dockerfiles, nginx config, database init
└── docs/                    architecture, data model, scope, decisions, security
```

`packages/shared` is the spine: enums, split arithmetic, the deal validator, the glossary and the
zod schemas are defined once and used by both sides, so the browser can show the exact sentence the
server would have refused with.

---

## The two rules everything else follows

**1. The recording and the song are different property.** The master and the composition are never
merged into one number, one column or one percentage — not in the database, not in the API, not on
screen. (§2)

**2. A percentage never exists without its context.** There is no `artist_percentage` column
anywhere. Every share lives in one `splits` table, qualified by the asset, the agreement, the right
_or_ the revenue category, the participant, and the period it is effective for. (§30)

---

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the pieces fit, and why
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md) — every table, and the rules the schema enforces
- [docs/PHASE-1-SCOPE.md](docs/PHASE-1-SCOPE.md) — spec section → implementation
- [docs/DECISIONS.md](docs/DECISIONS.md) — the choices worth arguing about
- [docs/SECURITY.md](docs/SECURITY.md) — spec §37, honestly assessed

## A note on the agreement templates

The templates in `apps/api/src/templates` are written to be read by artists and to be reviewed by
counsel. Altar.Camp is not a law firm, and nothing generated here is legal advice. Before these
templates are used with real artists they must be reviewed by qualified counsel in every
jurisdiction Altar.Camp operates in — including the employment, contractor or ministry
classification that attaches to a full-time missionary relationship (§21). Every generated document
says so on its face.
