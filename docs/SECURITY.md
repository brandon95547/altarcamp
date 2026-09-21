# Security — §37, honestly assessed

Spec §37 lists what is required. This is where each item actually stands.

| Requirement                    | Status                                                                                                                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encrypted connections          | **Deployment responsibility.** The app sets `Strict-Transport-Security` via helmet and supports `COOKIE_SECURE=true`; TLS is terminated at the edge.                                                       |
| Password hashing               | **Done.** scrypt (N=2^15, r=8, p=1), parameters stored in the hash, upgraded transparently on next sign-in.                                                                                                |
| MFA for administrators         | **Surfaced, not enforced.** `users.mfa_enabled` exists, `mfaRequired` is returned in the session, and the admin area shows a standing banner. Enforcement is wired to the identity provider before launch. |
| Role-based permissions         | **Done.** `requireUser` / `requireRole` / `requireStaff` / `requireArtist`, checked per route; the admin router checks on every request.                                                                   |
| Private file access            | **Done.** Files are stored outside the web root on a volume; every download goes through an authorised route that checks ownership; storage keys are traversal-checked.                                    |
| Audit logs                     | **Done.** Account creation, sessions, split changes, invitations, signatures, rights reviews, staff actions. Append-only by convention — nothing in the API updates or deletes a row.                      |
| Signature audit trails         | **Done.** Signer, typed name, timestamp, agreement version, document hash, affirmations, IP, user agent, and a hashed certificate payload.                                                                 |
| Backups                        | **Deployment responsibility.** The database is a Docker volume; point-in-time backup is an operational task, documented before launch.                                                                     |
| Disaster recovery              | **Deployment responsibility.** Migrations are forward-only and idempotent, so a restored volume re-converges on boot.                                                                                      |
| Session management             | **Done.** Hashed opaque tokens, expiry, revocation, `httpOnly` + `SameSite=Lax` cookies, full revocation on password change.                                                                               |
| Rate limiting                  | **Done.** Global and per-route limits on signup, login, invitation responses, signing and uploads.                                                                                                         |
| Account verification           | **Partial.** `users.email_verified` exists and is exposed; the sending side arrives with email delivery in phase 2.                                                                                        |
| Secure financial data handling | **By avoidance.** Phase 1 stores no bank details, card numbers or tax identifiers. Spec §37 recommends specialised providers for those, and Phase 3 will use one rather than storing them here.            |

## Other measures in place

- **Helmet** for security headers, CORS restricted to a configured origin list, credentials on.
- **Everything validated with zod** at the boundary — body, params and query — with a single error
  shape that never leaks internals.
- **No account enumeration**: a wrong password and an unknown email give the same message, and a
  login attempt against an unknown account still burns comparable time.
- **Signing links** are single-use, expiring, and stored only as hashes.
- **Contracts never pass raw HTML** to the browser — see [DECISIONS.md](DECISIONS.md) §15.
- **The 500 handler** logs the detail and tells the user something true and useful instead.
- **Logs redact** cookies, authorization headers and password fields.

## Before this handles a real artist's contract

1. Enforce MFA for staff accounts (the flag and the banner are ready).
2. Turn on email verification and delivery.
3. Have counsel review every agreement template, per jurisdiction, including the employment /
   contractor / ministry classification for the missionary relationship (§21).
4. Set `COOKIE_SECURE=true`, terminate TLS, and set a real `SESSION_SECRET`.
5. Rotate the seeded administrator password.
6. Put database backups and restore drills in place.
7. Independent penetration test of the signing flow specifically.
