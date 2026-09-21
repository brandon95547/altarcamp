import { SIGNING_AFFIRMATIONS, type AgreementStatus } from '@altar/shared';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { recordAudit } from '../../lib/audit.js';
import { canonicalJson, hashToken, sha256 } from '../../lib/crypto.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { notify } from '../../lib/notifications.js';
import { buildStorageKey, getStorage } from '../../lib/storage.js';

export interface SignerContext {
  signerId: string;
  agreementId: string;
  name: string;
  party: 'artist' | 'contributor' | 'altar';
  alreadySigned: boolean;
}

/** Resolve who is signing: an account holder, or a one-time signing link. */
export async function resolveSigner(
  agreementId: string,
  options: { userId?: string; role?: string; token?: string },
): Promise<SignerContext> {
  if (options.token) {
    const signer = await queryOne<{
      id: string;
      agreement_id: string;
      name: string;
      party: SignerContext['party'];
      signed_at: string | null;
      token_expires_at: string | null;
    }>(
      `SELECT id, agreement_id, name, party, signed_at, token_expires_at
         FROM agreement_signers WHERE token_hash = $1`,
      [hashToken(options.token)],
    );
    if (!signer || signer.agreement_id !== agreementId)
      throw notFound('That signing link is not valid.');
    if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
      throw badRequest('That signing link has expired. Ask the artist to send a new one.');
    }
    return {
      signerId: signer.id,
      agreementId: signer.agreement_id,
      name: signer.name,
      party: signer.party,
      alreadySigned: Boolean(signer.signed_at),
    };
  }

  if (!options.userId) throw forbidden('Sign in to sign this agreement.');

  // Altar.Camp's own signature is made by a legal or full administrator.
  const isStaff = options.role === 'admin' || options.role === 'legal_admin';
  const signer = await queryOne<{
    id: string;
    agreement_id: string;
    name: string;
    party: SignerContext['party'];
    signed_at: string | null;
  }>(
    `SELECT sg.id, sg.agreement_id, sg.name, sg.party, sg.signed_at
       FROM agreement_signers sg
      WHERE sg.agreement_id = $1
        AND (sg.user_id = $2
             OR ($3 AND sg.party = 'altar')
             OR EXISTS (SELECT 1 FROM contributors c
                         WHERE c.id = sg.contributor_id AND c.user_id = $2))
      ORDER BY sg.order_index
      LIMIT 1`,
    [agreementId, options.userId, isStaff],
  );
  if (!signer) throw forbidden('You are not a signer on this agreement.');
  return {
    signerId: signer.id,
    agreementId: signer.agreement_id,
    name: signer.name,
    party: signer.party,
    alreadySigned: Boolean(signer.signed_at),
  };
}

export interface SignInput {
  agreementId: string;
  signer: SignerContext;
  typedName: string;
  affirmations: string[];
  documentHash: string;
  agreementVersion: number;
  ip: string | null;
  userAgent: string | null;
  actorUserId: string | null;
}

export interface SignResult {
  status: AgreementStatus;
  signatureId: string;
  certificateHash: string;
  remainingSigners: number;
}

/**
 * Spec §21. A signature records who signed, when, which version, the hash of exactly what
 * they saw, what they affirmed, and the device metadata — and it is refused if the document
 * moved between being displayed and being signed.
 */
export async function signAgreement(input: SignInput): Promise<SignResult> {
  if (input.signer.alreadySigned) {
    throw badRequest('You have already signed this agreement.');
  }

  const required = SIGNING_AFFIRMATIONS.map((affirmation) => affirmation.key);
  const missing = required.filter((key) => !input.affirmations.includes(key));
  if (missing.length > 0) {
    throw badRequest('Every statement has to be confirmed before you can sign.');
  }

  const version = await queryOne<{
    id: string;
    version: number;
    document_hash: string;
    rendered_legal: string;
  }>(
    `SELECT id, version, document_hash, rendered_legal FROM agreement_versions
      WHERE agreement_id = $1 ORDER BY version DESC LIMIT 1`,
    [input.agreementId],
  );
  if (!version) throw notFound('That agreement has no content to sign.');

  if (version.version !== input.agreementVersion || version.document_hash !== input.documentHash) {
    throw badRequest(
      'This agreement changed while it was open. Reload it, read the current version, and sign that one.',
    );
  }

  if (!namesMatch(input.typedName, input.signer.name)) {
    throw badRequest(
      `Type your name exactly as it appears on the agreement: ${input.signer.name}.`,
    );
  }

  const agreement = await queryOne<{
    id: string;
    title: string;
    song_id: string | null;
    commitment_id: string | null;
    artist_id: string;
  }>(`SELECT id, title, song_id, commitment_id, artist_id FROM agreements WHERE id = $1`, [
    input.agreementId,
  ]);
  if (!agreement) throw notFound('Agreement not found.');

  const signedAt = new Date().toISOString();
  const certificatePayload = {
    agreementId: input.agreementId,
    agreementVersion: version.version,
    documentHash: version.document_hash,
    signerId: input.signer.signerId,
    signerName: input.signer.name,
    typedName: input.typedName,
    party: input.signer.party,
    affirmations: [...input.affirmations].sort(),
    signedAt,
    ip: input.ip,
    userAgent: input.userAgent,
  };
  const certificateHash = sha256(canonicalJson(certificatePayload));

  return withTransaction(async (client) => {
    const signature = await queryOne<{ id: string }>(
      `INSERT INTO signatures (agreement_id, agreement_version_id, signer_id, typed_name, affirmations,
                               document_hash, ip, user_agent, certificate_payload, certificate_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        input.agreementId,
        version.id,
        input.signer.signerId,
        input.typedName,
        JSON.stringify(input.affirmations),
        version.document_hash,
        input.ip,
        input.userAgent,
        JSON.stringify(certificatePayload),
        certificateHash,
      ],
      client,
    );
    if (!signature) throw new Error('Failed to record signature');

    await query(
      `UPDATE agreement_signers SET signed_at = now(), token_hash = NULL WHERE id = $1`,
      [input.signer.signerId],
      client,
    );

    const pending = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM agreement_signers
        WHERE agreement_id = $1 AND is_required = TRUE AND signed_at IS NULL`,
      [input.agreementId],
      client,
    );
    const remaining = pending?.count ?? 0;
    const status: AgreementStatus = remaining === 0 ? 'signed' : 'partially_signed';

    await query(
      `UPDATE agreements SET status = $2::agreement_status,
              completed_at = CASE WHEN $2 = 'signed' THEN now() ELSE completed_at END
        WHERE id = $1`,
      [input.agreementId, status],
      client,
    );

    if (status === 'signed') {
      if (agreement.song_id) {
        await query(
          `UPDATE songs SET status = 'agreement_signed', updated_at = now() WHERE id = $1`,
          [agreement.song_id],
          client,
        );
      }
      if (agreement.commitment_id) {
        await query(
          `UPDATE commitments SET status = 'active', updated_at = now() WHERE id = $1`,
          [agreement.commitment_id],
          client,
        );
        await query(
          `UPDATE artists SET application_status = 'active', approved_at = now(), updated_at = now() WHERE id = $1`,
          [agreement.artist_id],
          client,
        );
      }

      // Spec §31: the signed agreement lands in the vault automatically, as a system
      // document the artist can download but cannot delete.
      const signatures = await query<{
        typed_name: string;
        signed_at: string;
        certificate_hash: string;
        name: string;
      }>(
        `SELECT s.typed_name, s.signed_at, s.certificate_hash, sg.name
           FROM signatures s JOIN agreement_signers sg ON sg.id = s.signer_id
          WHERE s.agreement_id = $1 ORDER BY s.signed_at`,
        [input.agreementId],
        client,
      );

      const executed = [
        version.rendered_legal,
        '',
        '---',
        '',
        '## Signature certificate',
        '',
        `Document hash (SHA-256): \`${version.document_hash}\``,
        `Agreement version: ${version.version}`,
        '',
        ...signatures.map(
          (row) =>
            `- **${row.name}** signed as "${row.typed_name}" at ${row.signed_at} — certificate \`${row.certificate_hash}\``,
        ),
      ].join('\n');

      const storage = getStorage();
      const key = buildStorageKey(agreement.artist_id, 'agreements', `${agreement.title}.md`);
      const stored = await storage.put(key, Buffer.from(executed, 'utf8'));
      await query(
        `INSERT INTO documents (artist_id, folder, filename, content_type, byte_size, storage_key,
                                sha256, song_id, agreement_id, is_system, uploaded_by)
         VALUES ($1, 'agreements', $2, 'text/markdown', $3, $4, $5, $6, $7, TRUE, $8)`,
        [
          agreement.artist_id,
          `${agreement.title} (signed).md`,
          stored.byteSize,
          stored.storageKey,
          stored.sha256,
          agreement.song_id,
          input.agreementId,
          input.actorUserId,
        ],
        client,
      );

      const owner = await queryOne<{ user_id: string }>(
        `SELECT user_id FROM artists WHERE id = $1`,
        [agreement.artist_id],
        client,
      );
      if (owner) {
        await notify(
          {
            userId: owner.user_id,
            type: 'agreement_signed',
            title: 'Fully signed',
            body: `${agreement.title} is signed by everyone and saved to your documents.`,
            link: `/documents`,
          },
          client,
        );
      }
    }

    await recordAudit(
      {
        actorUserId: input.actorUserId,
        action: 'agreement.signed',
        entityType: 'agreement',
        entityId: input.agreementId,
        metadata: {
          signerId: input.signer.signerId,
          party: input.signer.party,
          certificateHash,
          documentHash: version.document_hash,
          version: version.version,
        },
        ip: input.ip,
        userAgent: input.userAgent,
      },
      client,
    );

    return {
      status,
      signatureId: signature.id,
      certificateHash,
      remainingSigners: remaining,
    };
  });
}

/**
 * A typed signature should be the signer's name, not a close guess — but case and extra
 * spacing are not meaningful, and neither is a missing middle name the signer never uses.
 */
function namesMatch(typed: string, expected: string): boolean {
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
  const typedParts = normalise(typed);
  const expectedParts = normalise(expected);
  if (typedParts.length === 0 || expectedParts.length === 0) return false;
  if (typedParts.join(' ') === expectedParts.join(' ')) return true;
  // First and last name must both be present.
  return (
    typedParts[0] === expectedParts[0] &&
    typedParts[typedParts.length - 1] === expectedParts[expectedParts.length - 1]
  );
}

/** Spec §21 audit trail — everything a dispute would ask for, in one response. */
export async function getSignatureCertificates(agreementId: string) {
  return query(
    `SELECT s.id, sg.name AS signer_name, sg.party::text, s.typed_name, s.signed_at,
            s.document_hash, s.certificate_hash, s.affirmations, s.ip, s.user_agent,
            v.version AS agreement_version
       FROM signatures s
       JOIN agreement_signers sg ON sg.id = s.signer_id
       JOIN agreement_versions v ON v.id = s.agreement_version_id
      WHERE s.agreement_id = $1
      ORDER BY s.signed_at`,
    [agreementId],
  );
}
