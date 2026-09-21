# Phase 1 scope — spec section by section

A map from the Altar.Camp specification to what is in this repository. "Built" means it works end
to end and is covered by the walkthrough below; "Phase 2/3" means it is deliberately deferred, with
the product saying so on screen rather than faking it.

| §   | Section                                               | Status                                                                     | Where                                                                           |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Product vision — two ways in                          | Built                                                                      | `HomePage`, `ChoosePathPage`                                                    |
| 2   | Master ≠ publishing, always separate                  | Built                                                                      | `splits` table, every split builder, every deal view                            |
| 3   | Core product goals                                    | Built for the signing half; accounting is Phase 3                          | throughout                                                                      |
| 4   | User types & role-appropriate fields                  | Built                                                                      | `user_role` enum, `CONTRIBUTOR_REQUIRED_FIELDS`, `requireStaff`/`requireArtist` |
| 5   | Home page, two cards                                  | Built                                                                      | `features/marketing/HomePage.tsx`                                               |
| 6   | Global onboarding (account, profile, existing rights) | Built                                                                      | `features/onboarding/*`, `rights_disclosures`                                   |
| 7   | Music-business education                              | Built — 5 lessons, gated                                                   | `content/education.ts`, `EducationPage`                                         |
| 8   | Single-song flow, split builder                       | Built                                                                      | `features/song/*`, `SplitBuilder`                                               |
| 9   | Master ownership structures                           | Built — 6 structures                                                       | `MasterStep`, `master_terms`                                                    |
| 10  | Revenue split builder, per category                   | Built — 13 categories                                                      | `RevenueStep`, `domain/revenue.ts`                                              |
| 11  | Expense & recoupment builder + worked example         | Built                                                                      | `ExpensesStep`, `buildRecoupmentExample`                                        |
| 12  | Single-song deal summary                              | Built                                                                      | `DealPage`, `buildDealSummary`                                                  |
| 13  | What a year means                                     | Built                                                                      | `MissionPage`, `YearPage`                                                       |
| 14  | One-year mission profile                              | Built — 10 questions                                                       | `MissionApplicationPage`, `mission_answers`                                     |
| 15  | One-year commitment terms                             | Built                                                                      | `commitments`, `commitment_activities`                                          |
| 16  | What Altar.Camp provides                              | Built — 22 services, per agreement                                         | `content/services.ts`, `agreement_services`                                     |
| 17  | Fair deal disclosure (four columns)                   | Built                                                                      | `buildFairDealDisclosure`, `DealPage`                                           |
| 18  | Year-long revenue structure                           | Built — configurable per category                                          | `proposeYearTerms`                                                              |
| 19  | Year-long ownership structure                         | Built — framework + per-song records                                       | commitment-scoped `splits`                                                      |
| 20  | Contract system (10 types)                            | 3 built, engine covers the rest                                            | `templates/`, `agreement_templates`                                             |
| 21  | Three views + affirmations + signature                | Built                                                                      | `AgreementView`, `signing.ts`                                                   |
| 22  | Release readiness score                               | **Phase 2**                                                                | —                                                                               |
| 23  | Song / release record                                 | Partly — rights, contracts and files; metadata and identifiers are Phase 2 | `songs`, `documents`                                                            |
| 24  | Artist dashboard                                      | Built; money and mission panels state their phase                          | `DashboardPage`                                                                 |
| 25  | Royalty dashboard                                     | **Phase 3** — `MoneyPage` shows the waterfall that will be used            | `MoneyPage`                                                                     |
| 26  | Admin dashboard                                       | Built for artists, music, contracts and rights                             | `features/admin/*`                                                              |
| 27  | One-year application workflow                         | Built — all 11 states                                                      | `application_status`, `AdminArtistPage`                                         |
| 28  | Single-song workflow                                  | Built — status advances with the work                                      | `song_status`                                                                   |
| 29  | Core database model                                   | Built for Phase 1 entities                                                 | [DATA-MODEL.md](DATA-MODEL.md)                                                  |
| 30  | No generic `artist_percentage`                        | **Built, and it shapes everything**                                        | `splits`                                                                        |
| 31  | Document vault                                        | Built — 9 folders, system documents undeletable                            | `DocumentsPage`, `documents`                                                    |
| 32  | Notifications                                         | Built in-app; email/SMS read the same rows later                           | `notifications`                                                                 |
| 33  | Collaborator invitations                              | Built — accept / request change / decline                                  | `InvitationPage`, `invitations`                                                 |
| 34  | Dispute prevention                                    | Built — one validator, used by API and UI                                  | `domain/validation.ts`                                                          |
| 35  | Your Five Answers                                     | Built                                                                      | `buildFiveAnswers`, `DealPage`                                                  |
| 36  | Technical architecture                                | Built                                                                      | [ARCHITECTURE.md](ARCHITECTURE.md)                                              |
| 37  | Security                                              | Mostly — MFA and email verification are surfaced, not enforced             | [SECURITY.md](SECURITY.md)                                                      |
| 38  | **MVP Phase 1**                                       | **Complete**                                                               | this repository                                                                 |
| 39  | Phase 2                                               | Not started                                                                | —                                                                               |
| 40  | Phase 3                                               | Not started                                                                | —                                                                               |
| 41  | Phase 4                                               | Not started                                                                | —                                                                               |
| 42  | Primary navigation                                    | Built for both artists and staff                                           | `AppLayout`, `AdminLayout`                                                      |
| 43  | Brand experience & "what does this mean?"             | Built — 18 glossary terms, everywhere                                      | `Term`, `content/glossary.ts`                                                   |
| 44  | The Altar.Camp promise                                | Built                                                                      | home page, footer                                                               |
| 45  | Success criteria                                      | See below                                                                  | —                                                                               |

## §45 — the success criteria, walked

A first-time independent artist can:

1. **Create an account** — `/signup`, two minutes.
2. **Understand master vs publishing** — five-lesson orientation, and every term carries "what does
   this mean?" wherever it appears.
3. **Choose one-song or one-year** — after the orientation, not before.
4. **Understand what Altar.Camp provides** — listed per agreement, opposite what Altar.Camp
   receives, on one screen.
5. **Enter collaborators** — with only the fields their role needs.
6. **Agree ownership** — master and songwriting separately, each totalling exactly 100%, each named
   person approving their own share.
7. **Agree revenue** — per category, each totalling 100%.
8. **Understand expenses and recoupment** — with a worked example on $10,000 that changes as the
   terms change.
9. **Review a plain-English deal summary** — generated from the stored numbers, not written by hand.
10. **Review the legal agreement** — the same deal, in full.
11. **Sign electronically** — with affirmations, a hash and a certificate.
12. **Access the signed agreement** — filed in the vault automatically, downloadable forever.
13. **Follow the release process** — Phase 2; the workflow states exist and advance today.
14. **See their rights and percentages at any time** — the deal page and Your Five Answers.
15. **See how money is calculated** — the waterfall today; real statements in Phase 3.

## Things built beyond the letter of Phase 1

- **One-time signing links** for collaborators without an Altar.Camp account, single-use and
  expiring, so a split sheet can actually be executed by everyone it names.
- **An audit log** (§37) from the start, because a signature trail written later is a signature
  trail with a gap.
- **The deal validator as shared code**, so the browser shows the same refusal the server would
  give, word for word.
- **Immutable agreement versions with a hash over both text and numbers**, so an altered split after
  signing is provably a different document.
