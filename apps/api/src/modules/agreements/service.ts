import {
  ALTAR_PARTY_ID,
  blockers,
  SIGNING_AFFIRMATIONS,
  servicesFor,
  type AgreementType,
  type DealPath,
} from '@altar/shared';
import { query, queryOne, withTransaction } from '../../db/pool.js';
import { generateToken, hashToken } from '../../lib/crypto.js';
import { badRequest, notFound, unprocessable } from '../../lib/errors.js';
import { notify } from '../../lib/notifications.js';
import { renderAgreement, type ContractContext } from '../../lib/contract-render.js';
import { listCommitmentSplits, ownershipLines, revenueLines } from '../songs/repo.js';
import { loadSongDeal } from '../songs/service.js';

const ALTAR_ENTITY = 'Altar.Camp';
const GOVERNING_LAW = 'the State of Tennessee, United States';

interface TemplateRow {
  id: string;
  type: AgreementType;
  version: number;
  title: string;
  simple_body: string;
  deal_sheet_body: string;
  legal_body: string;
}

async function activeTemplate(type: AgreementType): Promise<TemplateRow> {
  const template = await queryOne<TemplateRow>(
    `SELECT id, type, version, title, simple_body, deal_sheet_body, legal_body
       FROM agreement_templates
      WHERE type = $1 AND is_active = TRUE
      ORDER BY version DESC LIMIT 1`,
    [type],
  );
  if (!template) {
    throw badRequest(
      `No active template for ${type}. An Altar.Camp administrator must publish one.`,
    );
  }
  return template;
}

export interface GenerateOptions {
  type: AgreementType;
  songId?: string;
  commitmentId?: string;
  specialTerms?: string;
  createdBy: string;
}

/**
 * Generate an agreement from what is actually stored.
 *
 * Nothing about the deal is typed into the contract by hand: the tables are built from the
 * splits, the clauses are selected by the recorded terms, and the result is hashed. If the
 * deal is not ready, generation refuses and says which rule is unmet (spec §34).
 */
export async function generateAgreement(
  options: GenerateOptions,
): Promise<{ agreementId: string }> {
  const { type, songId, commitmentId, specialTerms, createdBy } = options;

  if (type === 'one_year_altar') {
    if (!commitmentId) throw badRequest('A one-year agreement needs a commitment.');
    return generateOneYear(commitmentId, specialTerms, createdBy);
  }
  if (!songId) throw badRequest('This agreement type needs a song.');
  return generateForSong(type, songId, specialTerms, createdBy);
}

async function generateForSong(
  type: AgreementType,
  songId: string,
  specialTerms: string | undefined,
  createdBy: string,
): Promise<{ agreementId: string }> {
  const deal = await loadSongDeal(songId);
  const open = blockers(deal.issues);
  if (open.length > 0) {
    throw unprocessable(
      'This deal is not ready to become an agreement yet.',
      open.map((issue) => ({ path: issue.fixStep, message: issue.message })),
    );
  }

  const template = await activeTemplate(type);
  const artist = await queryOne<{
    artist_name: string;
    legal_name: string;
    email: string;
    user_id: string;
    artist_id: string;
  }>(
    `SELECT a.artist_name, u.legal_name, u.email, a.user_id, a.id AS artist_id
       FROM songs s JOIN artists a ON a.id = s.artist_id JOIN users u ON u.id = a.user_id
      WHERE s.id = $1`,
    [songId],
  );
  if (!artist) throw notFound('Artist not found for that song.');

  const serviceKeys =
    deal.services.length > 0
      ? deal.services
      : servicesFor('single_song').map((service) => service.key);

  const signers = buildSongSigners(type, artist, deal);

  const context: ContractContext = {
    agreementVersion: 1,
    effectiveDate: today(),
    altarEntity: ALTAR_ENTITY,
    governingLaw: GOVERNING_LAW,
    artistLegalName: artist.legal_name,
    artistStageName: artist.artist_name,
    songTitle: deal.song.title,
    termDescription: 'This agreement applies only to this recording.',
    startDate: null,
    endDate: null,
    autoRenew: false,
    masterStructure: deal.masterTerms.structure,
    masterStructureNote: deal.masterTerms.structure_note,
    licenseTermMonths: deal.masterTerms.license_term_months,
    masterSplits: deal.masterSplits,
    compositionSplits: deal.compositionSplits,
    revenueSplits: deal.revenueSplits as ContractContext['revenueSplits'],
    publishingAdministrator: null,
    participants: deal.contributors.map((contributor) => ({
      id: contributor.id,
      name: contributor.stage_name || contributor.legal_name,
      role: contributor.role,
      email: contributor.email,
      proAffiliation: contributor.pro_affiliation,
      publisherName: contributor.publisher_name,
    })),
    recoupment: deal.recoupment.terms,
    plannedExpenses: deal.recoupment.plannedExpenses,
    serviceKeys,
    activities: [],
    signers: signers.map((signer) => ({
      name: signer.name,
      party: signer.party,
      email: signer.email,
      required: signer.required,
    })),
    specialTerms: specialTerms ?? null,
  };

  const rendered = renderAgreement(
    {
      simpleBody: template.simple_body,
      dealSheetBody: template.deal_sheet_body,
      legalBody: template.legal_body,
    },
    context,
  );

  return withTransaction(async (client) => {
    const agreement = await queryOne<{ id: string }>(
      `INSERT INTO agreements (type, status, path, artist_id, song_id, template_id, title, special_terms, created_by, sent_at)
       VALUES ($1, 'sent', 'single_song', $2, $3, $4, $5, $6, $7, now())
       RETURNING id`,
      [
        type,
        artist.artist_id,
        songId,
        template.id,
        `${template.title} — ${deal.song.title}`,
        specialTerms ?? null,
        createdBy,
      ],
      client,
    );
    if (!agreement) throw new Error('Failed to create agreement');

    await query(
      `INSERT INTO agreement_versions (agreement_id, version, rendered_simple, rendered_deal_sheet,
                                       rendered_legal, terms_snapshot, document_hash, created_by)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7)`,
      [
        agreement.id,
        rendered.simple,
        rendered.dealSheet,
        rendered.legal,
        JSON.stringify(rendered.termsSnapshot),
        rendered.documentHash,
        createdBy,
      ],
      client,
    );

    for (const [index, signer] of signers.entries()) {
      const token = signer.party === 'contributor' ? generateToken() : null;
      await query(
        `INSERT INTO agreement_signers (agreement_id, party, user_id, contributor_id, name, email,
                                        is_required, order_index, token_hash, token_expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::text, CASE WHEN $9::text IS NULL THEN NULL ELSE now() + interval '30 days' END)`,
        [
          agreement.id,
          signer.party,
          signer.userId,
          signer.contributorId,
          signer.name,
          signer.email,
          signer.required,
          index,
          token ? hashToken(token) : null,
        ],
        client,
      );
      if (token) {
        // Returned to the artist, who passes the link on. Phase 2 sends it by email.
        signer.signingToken = token;
      }
    }

    for (const key of serviceKeys) {
      await query(
        `INSERT INTO agreement_services (agreement_id, service_key) VALUES ($1, $2)
         ON CONFLICT (agreement_id, service_key) DO NOTHING`,
        [agreement.id, key],
        client,
      );
    }

    // Freeze the numbers this agreement was built from.
    await query(
      `UPDATE splits SET agreement_id = $2 WHERE song_id = $1 AND effective_to IS NULL AND agreement_id IS NULL`,
      [songId, agreement.id],
      client,
    );

    await query(
      `UPDATE songs SET status = 'agreement_generated', updated_at = now() WHERE id = $1`,
      [songId],
      client,
    );

    await notify(
      {
        userId: artist.user_id,
        type: 'agreement_available',
        title: 'Your agreement is ready to review',
        body: `${template.title} for "${deal.song.title}".`,
        link: `/agreements/${agreement.id}`,
      },
      client,
    );

    return { agreementId: agreement.id };
  });
}

interface PlannedSigner {
  party: 'artist' | 'contributor' | 'altar';
  userId: string | null;
  contributorId: string | null;
  name: string;
  email: string | null;
  required: boolean;
  signingToken?: string;
}

function buildSongSigners(
  type: AgreementType,
  artist: { artist_name: string; legal_name: string; email: string; user_id: string },
  deal: Awaited<ReturnType<typeof loadSongDeal>>,
): PlannedSigner[] {
  const signers: PlannedSigner[] = [
    {
      party: 'artist',
      userId: artist.user_id,
      contributorId: null,
      name: artist.legal_name,
      email: artist.email,
      required: true,
    },
  ];

  // A split sheet is signed by every writer; the collaboration agreement is signed by
  // everyone whose ownership or revenue share it states.
  const relevant = deal.contributors.filter((contributor) => {
    if (contributor.role === 'primary_artist') return false;
    if (type === 'songwriter_split_sheet') return contributor.role === 'songwriter';
    return deal.masterSplits
      .concat(deal.compositionSplits)
      .concat(deal.revenueSplits.flatMap((split) => split.lines))
      .some((line) => line.participantId === contributor.id && line.bps > 0);
  });

  for (const contributor of relevant) {
    signers.push({
      party: 'contributor',
      userId: contributor.user_id,
      contributorId: contributor.id,
      name: contributor.legal_name,
      email: contributor.email,
      required: true,
    });
  }

  if (type !== 'songwriter_split_sheet') {
    signers.push({
      party: 'altar',
      userId: null,
      contributorId: null,
      name: ALTAR_ENTITY,
      email: null,
      required: true,
    });
  }

  return signers;
}

async function generateOneYear(
  commitmentId: string,
  specialTerms: string | undefined,
  createdBy: string,
): Promise<{ agreementId: string }> {
  const commitment = await queryOne<{
    id: string;
    artist_id: string;
    start_date: string;
    end_date: string;
    auto_renew: boolean;
    artist_name: string;
    legal_name: string;
    email: string;
    user_id: string;
  }>(
    `SELECT c.id, c.artist_id, c.start_date, c.end_date, c.auto_renew,
            a.artist_name, u.legal_name, u.email, a.user_id
       FROM commitments c JOIN artists a ON a.id = c.artist_id JOIN users u ON u.id = a.user_id
      WHERE c.id = $1`,
    [commitmentId],
  );
  if (!commitment) throw notFound('That commitment does not exist.');

  const splits = await listCommitmentSplits(commitmentId);
  const masterSplits = ownershipLines(splits, 'master');
  const compositionSplits = ownershipLines(splits, 'composition');
  const revenue = revenueLines(splits);

  if (masterSplits.length === 0 || compositionSplits.length === 0 || revenue.length === 0) {
    throw unprocessable(
      'The one-year framework needs master ownership, songwriting ownership and at least one revenue category before an agreement can be generated.',
    );
  }

  const activities = await query<{ activity_key: string; level: string; note: string | null }>(
    `SELECT activity_key, level::text, note FROM commitment_activities WHERE commitment_id = $1`,
    [commitmentId],
  );

  const recoupmentRow = await queryOne<{
    id: string;
    payer: string;
    recoupable: boolean;
    recouped_from: string;
    artist_personally_liable: boolean;
    after_recoupment: string;
    investment_cap_minor: number | null;
  }>(`SELECT * FROM recoupment_terms WHERE commitment_id = $1`, [commitmentId]);

  const plannedExpenses = recoupmentRow
    ? await query<{
        category: string;
        description: string;
        amount_minor: number;
        recoupable: boolean;
      }>(
        `SELECT category::text, description, amount_minor, recoupable FROM planned_expenses
          WHERE recoupment_terms_id = $1`,
        [recoupmentRow.id],
      )
    : [];

  const serviceKeys = servicesFor('one_year').map((service) => service.key);
  const template = await activeTemplate('one_year_altar');

  const signers: PlannedSigner[] = [
    {
      party: 'artist',
      userId: commitment.user_id,
      contributorId: null,
      name: commitment.legal_name,
      email: commitment.email,
      required: true,
    },
    {
      party: 'altar',
      userId: null,
      contributorId: null,
      name: ALTAR_ENTITY,
      email: null,
      required: true,
    },
  ];

  const context: ContractContext = {
    agreementVersion: 1,
    effectiveDate: today(),
    altarEntity: ALTAR_ENTITY,
    governingLaw: GOVERNING_LAW,
    artistLegalName: commitment.legal_name,
    artistStageName: commitment.artist_name,
    songTitle: null,
    termDescription: `One year, from ${commitment.start_date} to ${commitment.end_date}.`,
    startDate: commitment.start_date,
    endDate: commitment.end_date,
    autoRenew: commitment.auto_renew,
    masterStructure: 'shared',
    masterStructureNote: 'Recorded per release against this framework.',
    licenseTermMonths: null,
    masterSplits,
    compositionSplits,
    revenueSplits: revenue as ContractContext['revenueSplits'],
    publishingAdministrator: null,
    participants: [],
    recoupment: recoupmentRow
      ? {
          payer: recoupmentRow.payer as never,
          recoupable: recoupmentRow.recoupable,
          recoupedFrom: recoupmentRow.recouped_from as never,
          artistPersonallyLiable: recoupmentRow.artist_personally_liable,
          afterRecoupment: recoupmentRow.after_recoupment,
          investmentCapMinor: recoupmentRow.investment_cap_minor,
        }
      : {
          payer: 'altar',
          recoupable: true,
          recoupedFrom: 'master_revenue',
          artistPersonallyLiable: false,
          afterRecoupment: '',
          investmentCapMinor: null,
        },
    plannedExpenses: plannedExpenses.map((expense) => ({
      category: expense.category,
      description: expense.description,
      amountMinor: expense.amount_minor,
      recoupable: expense.recoupable,
    })),
    serviceKeys,
    activities: activities.map((activity) => ({
      key: activity.activity_key,
      level: activity.level as never,
      note: activity.note,
    })),
    signers: signers.map((signer) => ({
      name: signer.name,
      party: signer.party,
      email: signer.email,
      required: signer.required,
    })),
    specialTerms: specialTerms ?? null,
  };

  const rendered = renderAgreement(
    {
      simpleBody: template.simple_body,
      dealSheetBody: template.deal_sheet_body,
      legalBody: template.legal_body,
    },
    context,
  );

  return withTransaction(async (client) => {
    const agreement = await queryOne<{ id: string }>(
      `INSERT INTO agreements (type, status, path, artist_id, commitment_id, template_id, title, special_terms, created_by, sent_at)
       VALUES ('one_year_altar', 'sent', 'one_year', $1, $2, $3, $4, $5, $6, now())
       RETURNING id`,
      [
        commitment.artist_id,
        commitmentId,
        template.id,
        `${template.title} — ${commitment.artist_name}`,
        specialTerms ?? null,
        createdBy,
      ],
      client,
    );
    if (!agreement) throw new Error('Failed to create agreement');

    await query(
      `INSERT INTO agreement_versions (agreement_id, version, rendered_simple, rendered_deal_sheet,
                                       rendered_legal, terms_snapshot, document_hash, created_by)
       VALUES ($1, 1, $2, $3, $4, $5, $6, $7)`,
      [
        agreement.id,
        rendered.simple,
        rendered.dealSheet,
        rendered.legal,
        JSON.stringify(rendered.termsSnapshot),
        rendered.documentHash,
        createdBy,
      ],
      client,
    );

    for (const [index, signer] of signers.entries()) {
      await query(
        `INSERT INTO agreement_signers (agreement_id, party, user_id, contributor_id, name, email, is_required, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
        [
          agreement.id,
          signer.party,
          signer.userId,
          signer.contributorId,
          signer.name,
          signer.email,
          index,
        ],
        client,
      );
    }

    for (const key of serviceKeys) {
      await query(
        `INSERT INTO agreement_services (agreement_id, service_key) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [agreement.id, key],
        client,
      );
    }

    await query(
      `UPDATE splits SET agreement_id = $2 WHERE commitment_id = $1 AND effective_to IS NULL AND agreement_id IS NULL`,
      [commitmentId, agreement.id],
      client,
    );
    await query(
      `UPDATE commitments SET status = 'artist_reviewing', updated_at = now() WHERE id = $1`,
      [commitmentId],
      client,
    );
    await query(
      `UPDATE artists SET application_status = 'artist_reviewing', updated_at = now() WHERE id = $1`,
      [commitment.artist_id],
      client,
    );
    await query(
      `UPDATE mission_applications SET status = 'artist_reviewing', updated_at = now() WHERE artist_id = $1`,
      [commitment.artist_id],
      client,
    );

    await notify(
      {
        userId: commitment.user_id,
        type: 'agreement_available',
        title: 'Your one-year terms are ready',
        body: 'Read the summary, then the agreement, then decide.',
        link: `/agreements/${agreement.id}`,
      },
      client,
    );

    return { agreementId: agreement.id };
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export { ALTAR_PARTY_ID, SIGNING_AFFIRMATIONS, type DealPath };
