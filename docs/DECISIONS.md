# Decisions

The choices that shaped this build, and the reasoning. Anything here is open to argument — that is
the point of writing it down.

## 1. Percentages are integers, in basis points

`10000 = 100%`. Floating-point percentages drift, and this product's whole claim is that the
numbers are exact. A split sheet that is "99.99999% complete" must never block a release for a
rounding reason, nor pass when it is genuinely short. Money is in minor units for the same reason,
and allocation uses the largest-remainder method so parts always add back to the whole.

## 2. One `splits` table, not one per dimension

Spec §30 could have been satisfied with `master_splits`, `composition_splits` and `revenue_splits`.
One table with an exclusive-or constraint on the dimension keeps the arithmetic, the history and
the freeze-on-signature logic in one place, and makes it impossible for the three to drift apart in
structure. The cost is a slightly wider table and two partial unique indexes.

## 3. Splits are superseded, never overwritten

Editing a split ends the old row (`effective_to`) and inserts a new one. Storage is cheap; being
unable to answer "who changed my share, and when" is expensive, and it is exactly the question a
dispute turns on.

## 4. Once anything is signed, percentages freeze

The API refuses to change a split on a song with a signed or partially-signed agreement, and says
why: a signed deal changes by amendment, so that everyone affected agrees in writing. Amendments
are a Phase 2 agreement type; the refusal is here from day one because the alternative is silent
divergence between a signed PDF and a database row.

## 5. The document hash covers the numbers, not just the words

`sha256(canonicalJson({ simple, dealSheet, legal, terms }))`. Hashing only the rendered text would
miss a changed `terms_snapshot`; canonical JSON (sorted keys) makes the hash stable across runs. A
signature carries the hash it was shown, and signing is refused if the current hash differs.

## 6. Unresolved template tokens are a hard error

`renderTemplate` throws if any `{{token}}` remains. A contract containing `{{master_table}}` is a
defect, and the only safe place to find out is before it reaches a signature page.

## 7. The default deal carries no personal liability

Where revenue never covers recoupable costs, Altar.Camp absorbs the difference. The database stores
`artist_personally_liable` so a different deal can be recorded, but the default is the artist-
friendly one, and the deal summary says which one applies in plain words either way.

## 8. The orientation is a gate, not a suggestion

An artist cannot choose a path — and therefore cannot enter a percentage — until they have
completed the five lessons and answered at least four checks correctly. Spec §7 says education comes
before percentages; a skippable module would not be that.

## 9. Education, glossary and questionnaires are served by the API

They could have been constants in the front end. Serving them from `packages/shared` through the API
means the wording an artist reads is the wording the API validates against, and it can move into the
database for editing without a deploy.

## 10. Session cookies, not JWTs

Opaque tokens stored hashed, revocable instantly, invisible to JavaScript. Signing a contract is not
a use case that benefits from a stateless token that cannot be withdrawn.

## 11. scrypt from the standard library

No native module to half-install, no binary to keep patched. Parameters live inside the hash so they
can be raised later without invalidating existing passwords.

## 12. Raw SQL, no ORM

The schema is the contract. Migrations read like the rules they enforce, queries are visible, and
there is no code-generation step in the install path.

## 13. Local disk storage behind an interface

Spec §36 asks for private object storage. Phase 1 writes to a Docker volume through a driver
interface, with every read passing an ownership check in the API. Swapping in S3 or MinIO is a new
driver, not a refactor.

## 14. Empty states say what phase they are from

`MoneyPage` and the mission hub do not show invented zeroes. They explain that accounting opens in a
later phase, and show the waterfall that will be used when it does. Fake numbers in a product about
honest numbers would be a strange way to start.

## 15. Markdown, rendered by our own small renderer

Agreements are rendered as Markdown and displayed by a renderer that handles exactly what the
templates produce and never passes raw HTML through. Contracts carry artist-supplied free text;
they should not be able to carry a script.

## 16. Rate limiting is a config flag

On everywhere except the test suite, which drives hundreds of signups and signatures from one
address and would otherwise throttle itself. The flag is honest about what it does rather than the
tests quietly asserting around a protection.
