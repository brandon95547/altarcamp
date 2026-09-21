import {
  ALTAR_PARTY_ID,
  buildRecoupmentExample,
  formatBps,
  formatMoney,
  MASTER_STRUCTURE_LABELS,
  RECOUPMENT_SOURCE_LABELS,
  REVENUE_CATEGORY_LABELS,
  serviceLabels,
  YEAR_ACTIVITIES,
  type ActivityCommitment,
  type MasterStructure,
  type RecoupmentTerms,
  type RevenueCategory,
  type SplitLine,
} from '@altar/shared';
import { COUNSEL_NOTICE } from '../templates/index.js';
import { canonicalJson, sha256 } from './crypto.js';

export interface ContractParticipant {
  id: string;
  name: string;
  role: string;
  email: string | null;
  proAffiliation: string | null;
  publisherName: string | null;
}

export interface ContractSigner {
  name: string;
  party: string;
  email: string | null;
  required: boolean;
}

export interface ContractContext {
  agreementVersion: number;
  effectiveDate: string;
  altarEntity: string;
  governingLaw: string;
  artistLegalName: string;
  artistStageName: string;
  songTitle: string | null;
  termDescription: string;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
  masterStructure: MasterStructure;
  masterStructureNote: string | null;
  licenseTermMonths: number | null;
  masterSplits: SplitLine[];
  compositionSplits: SplitLine[];
  revenueSplits: { category: RevenueCategory; lines: SplitLine[] }[];
  publishingAdministrator: string | null;
  participants: ContractParticipant[];
  recoupment: RecoupmentTerms;
  plannedExpenses: {
    category: string;
    description: string;
    amountMinor: number;
    recoupable: boolean;
  }[];
  serviceKeys: string[];
  activities: { key: string; level: ActivityCommitment; note: string | null }[];
  signers: ContractSigner[];
  specialTerms: string | null;
}

// --- markdown helpers -------------------------------------------------------

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '_Nothing recorded._';
  const head = `| ${headers.join(' | ')} |`;
  const rule = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return [head, rule, body].join('\n');
}

function splitTable(title: string, lines: readonly SplitLine[]): string {
  const rows = lines.map((line) => [line.participantName, formatBps(line.bps)]);
  const total = lines.reduce((sum, line) => sum + line.bps, 0);
  rows.push([`**${title} total**`, `**${formatBps(total)}**`]);
  return table(['Party', 'Share'], rows);
}

function bullets(items: readonly string[]): string {
  if (items.length === 0) return '_None recorded._';
  return items.map((item) => `- ${item}`).join('\n');
}

function sentenceList(items: readonly string[]): string {
  if (items.length === 0) return 'no one';
  if (items.length === 1) return items[0] as string;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function shareOf(lines: readonly SplitLine[], participantId: string): number {
  return lines
    .filter((line) => line.participantId === participantId)
    .reduce((total, line) => total + line.bps, 0);
}

// --- token construction -----------------------------------------------------

export function buildTokens(context: ContractContext): Record<string, string> {
  const artistMaster = context.masterSplits
    .filter((line) => line.participantId !== ALTAR_PARTY_ID)
    .reduce((total, line) => total + line.bps, 0);
  const altarComposition = shareOf(context.compositionSplits, ALTAR_PARTY_ID);

  const primaryRevenue =
    context.revenueSplits.find((split) => split.category === 'master_streaming') ??
    context.revenueSplits[0];
  const artistRevenueShare = primaryRevenue
    ? primaryRevenue.lines
        .filter((line) => line.participantId !== ALTAR_PARTY_ID)
        .reduce((total, line) => total + line.bps, 0)
    : 0;

  const recoupableTotal = context.plannedExpenses
    .filter((expense) => expense.recoupable)
    .reduce((total, expense) => total + expense.amountMinor, 0);

  const example = buildRecoupmentExample({
    grossRevenueMinor: 1_000_000,
    distributionCostMinor: 100_000,
    recoupableExpensesMinor: recoupableTotal > 0 ? recoupableTotal : 200_000,
    artistShareBps: artistRevenueShare || 5_000,
    terms: {
      recoupedFrom: context.recoupment.recoupable
        ? context.recoupment.recoupedFrom
        : 'not_recoupable',
      artistPersonallyLiable: context.recoupment.artistPersonallyLiable,
    },
    counterpartyLabel:
      primaryRevenue && primaryRevenue.lines.length > 2
        ? 'Altar.Camp and other participants'
        : 'Altar.Camp share',
  });

  const exampleTable = table(
    ['Line', 'Amount'],
    example.rows.map((row) => [
      row.note ? `${row.label} — _${row.note}_` : row.label,
      formatMoney(row.amountMinor),
    ]),
  );

  const services = serviceLabels(context.serviceKeys);

  const revenueTables = context.revenueSplits
    .map(
      (split) =>
        `### ${REVENUE_CATEGORY_LABELS[split.category]}\n\n${splitTable(
          REVENUE_CATEGORY_LABELS[split.category],
          split.lines,
        )}`,
    )
    .join('\n\n');

  const activityRows = context.activities.map((activity) => [
    YEAR_ACTIVITIES.find((candidate) => candidate.key === activity.key)?.label ?? activity.key,
    activity.level === 'required'
      ? 'Required'
      : activity.level === 'opportunity'
        ? 'Opportunity'
        : 'Not included',
    activity.note ?? '',
  ]);

  const required = context.activities
    .filter((activity) => activity.level === 'required')
    .map(
      (activity) =>
        YEAR_ACTIVITIES.find((candidate) => candidate.key === activity.key)?.label.toLowerCase() ??
        activity.key,
    );

  const tokens: Record<string, string> = {
    counsel_notice: COUNSEL_NOTICE,
    agreement_version: String(context.agreementVersion),
    effective_date: context.effectiveDate,
    altar_entity: context.altarEntity,
    governing_law: context.governingLaw,
    artist_legal_name: context.artistLegalName,
    artist_stage_name: context.artistStageName,
    song_title: context.songTitle ?? 'the Work',
    term_description: context.termDescription,
    start_date: context.startDate ?? 'the Effective Date',
    end_date: context.endDate ?? 'the end of the Term',

    master_table: splitTable('Master', context.masterSplits),
    composition_table: splitTable('Songwriting', context.compositionSplits),
    revenue_tables: revenueTables || '_No revenue categories recorded._',
    publishing_table: table(
      ['Writer', 'Share', 'PRO', 'Publisher'],
      context.participants
        .filter(
          (participant) =>
            participant.role === 'songwriter' || participant.role === 'primary_artist',
        )
        .map((participant) => [
          participant.name,
          formatBps(shareOf(context.compositionSplits, participant.id)),
          participant.proAffiliation ?? '—',
          participant.publisherName ?? 'Self-published',
        ]),
    ),
    participants_table: table(
      ['Name', 'Role', 'Master', 'Songwriting', 'Contact'],
      context.participants.map((participant) => [
        participant.name,
        participant.role.replace(/_/g, ' '),
        formatBps(shareOf(context.masterSplits, participant.id)),
        formatBps(shareOf(context.compositionSplits, participant.id)),
        participant.email ?? '—',
      ]),
    ),
    expense_table: table(
      ['Cost', 'Description', 'Amount', 'Recoupable'],
      context.plannedExpenses.map((expense) => [
        expense.category.replace(/_/g, ' '),
        expense.description || '—',
        formatMoney(expense.amountMinor),
        expense.recoupable ? 'Yes' : 'No',
      ]),
    ),
    activities_table: table(['Activity', 'Commitment', 'Notes'], activityRows),
    signer_list: bullets(
      context.signers.map(
        (signer) =>
          `${signer.name}${signer.email ? ` (${signer.email})` : ''} — ${signer.required ? 'required' : 'optional'}`,
      ),
    ),
    signature_block: context.signers
      .map((signer) => `**${signer.name}**\n\nSigned: ______________________  Date: ____________\n`)
      .join('\n'),
    services_list: bullets(services),
    special_terms: context.specialTerms?.trim() || 'None.',
    master_structure_note: context.masterStructureNote
      ? `_${context.masterStructureNote}_`
      : `_Structure: ${MASTER_STRUCTURE_LABELS[context.masterStructure]}._`,
    recoupment_example: exampleTable,
    recoupment_statement: context.recoupment.recoupable
      ? `Altar.Camp recovers the costs it pays from **${RECOUPMENT_SOURCE_LABELS[
          context.recoupment.recoupedFrom
        ].toLowerCase()}**. ${
          context.recoupment.artistPersonallyLiable
            ? 'If revenue does not cover them, the balance remains owed.'
            : 'If revenue never covers them, Altar.Camp absorbs the difference — the artist owes nothing personally.'
        }`
      : 'Altar.Camp does not recoup its costs from revenue under this agreement.',
  };

  // Plain-English paragraphs for the simple view.
  tokens['simple_ownership_paragraph'] = [
    artistMaster === 10_000
      ? 'You own this recording outright.'
      : `You and Altar.Camp share the recording: ${sentenceList(
          context.masterSplits.map((line) => `${line.participantName} ${formatBps(line.bps)}`),
        )}.`,
    altarComposition === 0
      ? 'Altar.Camp takes no share of the songwriting — the song stays with its writers.'
      : `Songwriting is held ${sentenceList(
          context.compositionSplits.map((line) => `${line.participantName} ${formatBps(line.bps)}`),
        )}.`,
  ].join(' ');

  tokens['simple_revenue_paragraph'] = primaryRevenue
    ? `For ${REVENUE_CATEGORY_LABELS[primaryRevenue.category].toLowerCase()}, the money is divided ${sentenceList(
        primaryRevenue.lines.map((line) => `${line.participantName} ${formatBps(line.bps)}`),
      )}. Every other kind of income has its own percentages, listed in the deal sheet, and each of them totals 100%.`
    : 'No revenue categories have been set yet.';

  tokens['simple_expense_paragraph'] = context.recoupment.recoupable
    ? `Altar.Camp pays the costs listed in the deal sheet up front${
        context.recoupment.investmentCapMinor
          ? `, up to ${formatMoney(context.recoupment.investmentCapMinor)}`
          : ''
      }, and takes that money back out of ${RECOUPMENT_SOURCE_LABELS[
        context.recoupment.recoupedFrom
      ].toLowerCase()}. ${
        context.recoupment.artistPersonallyLiable
          ? 'If the music does not earn it back, the balance stays owed.'
          : "If the music never earns it back, that is Altar.Camp's loss, not a debt you carry."
      }`
    : 'Altar.Camp covers its costs and does not take them back out of your revenue.';

  tokens['activities_paragraph'] =
    required.length > 0
      ? `During the year you are committing to ${sentenceList(required)}. Everything else listed in Schedule A is an opportunity you can take or decline.`
      : 'Schedule A lists what the year involves. Nothing in it is a hard obligation — the activities are offered as opportunities.';

  tokens['renewal_statement'] = context.autoRenew
    ? 'Renews unless notice is given'
    : 'No automatic renewal';
  tokens['renewal_paragraph'] = context.autoRenew
    ? 'This agreement renews unless one of you gives notice. Check the renewal clause carefully.'
    : 'Nothing renews automatically. At the end of the year you and Altar.Camp decide together whether to continue, and everything you own stays yours either way.';
  tokens['renewal_clause'] = context.autoRenew
    ? 'This Agreement renews for successive one-year terms unless either party gives written notice at least sixty (60) days before the end of the then-current Term.'
    : 'This Agreement does not renew automatically. Any renewal requires a new written agreement signed by both parties.';
  tokens['end_of_term_clause'] =
    'At the end of the Term the Artist is free to continue independently, to renew by written agreement, or to move to a different arrangement with Altar.Camp. Ownership interests already recorded for specific works are unaffected by the end of the Term.';

  tokens['master_structure_clause'] = buildMasterStructureClause(
    context.masterStructure,
    context.licenseTermMonths,
    context.masterStructureNote,
  );

  tokens['publishing_statement'] = context.publishingAdministrator
    ? `Publishing is administered by ${context.publishingAdministrator}.`
    : 'The Artist retains and administers their own publishing. Altar.Camp claims no publishing interest.';
  tokens['publishing_clause'] = context.publishingAdministrator
    ? `The Composition is administered by ${context.publishingAdministrator} on the terms recorded in the platform. Administration does not transfer ownership of the Composition.`
    : 'Altar.Camp claims no ownership of, and no administration rights in, the Composition. The writers retain their publishing in full.';

  tokens['recoupment_clause'] = context.recoupment.recoupable
    ? `Altar.Camp may recover Recoupable Costs from ${RECOUPMENT_SOURCE_LABELS[
        context.recoupment.recoupedFrom
      ].toLowerCase()}, applied before amounts are paid to the Artist and after the deductions permitted by Section 5.2.`
    : 'Altar.Camp bears its own costs under this Agreement and may not recover them from revenue otherwise payable to the Artist.';

  tokens['investment_cap_clause'] =
    context.recoupment.investmentCapMinor === null
      ? 'The parties will agree the budget for each project in writing before costs are incurred.'
      : `Altar.Camp's total Recoupable Costs under this Agreement will not exceed ${formatMoney(
          context.recoupment.investmentCapMinor,
        )} without the Artist's prior written approval.`;

  tokens['personal_liability_clause'] = context.recoupment.artistPersonallyLiable
    ? 'Where revenue is insufficient to recover Recoupable Costs, the unrecovered balance remains a debt of the Artist to Altar.Camp.'
    : 'Where revenue is insufficient to recover Recoupable Costs, the unrecovered balance is borne by Altar.Camp. The Artist has no personal liability for it, and it is not carried forward against the Artist beyond the revenue this Agreement covers.';

  tokens['after_recoupment_clause'] =
    context.recoupment.afterRecoupment.trim() ||
    'Once Recoupable Costs have been recovered in full, revenue is allocated at the percentages in Section 5 with no further deduction in respect of those costs.';

  return tokens;
}

function buildMasterStructureClause(
  structure: MasterStructure,
  licenseTermMonths: number | null,
  note: string | null,
): string {
  switch (structure) {
    case 'artist_owns_all':
      return 'The Artist is the sole owner of the Master. Altar.Camp holds no ownership interest in it.';
    case 'altar_owns_all':
      return 'Altar.Camp is the sole owner of the Master, including all rights in it for the full term of copyright.';
    case 'shared':
      return 'The Master is owned jointly in the shares recorded above.';
    case 'exclusive_license':
      return 'The Artist retains ownership of the Master and grants Altar.Camp an exclusive licence to exploit it in accordance with this Agreement.';
    case 'limited_term_license':
      return `The Artist retains ownership of the Master and grants Altar.Camp an exclusive licence to exploit it for ${
        licenseTermMonths ?? 24
      } months from the Effective Date, after which all rights revert to the Artist automatically and without further action.`;
    case 'other':
      return (
        note?.trim() || 'The parties have agreed a bespoke ownership arrangement as recorded above.'
      );
  }
}

const TOKEN_PATTERN = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/**
 * An unresolved token inside a contract is a defect, not a cosmetic issue — so rendering
 * fails loudly rather than shipping "{{master_table}}" into a document someone signs.
 */
export function renderTemplate(body: string, tokens: Record<string, string>): string {
  const missing = new Set<string>();
  const rendered = body.replace(TOKEN_PATTERN, (_match, name: string) => {
    const value = tokens[name];
    if (value === undefined) {
      missing.add(name);
      return '';
    }
    return value;
  });
  if (missing.size > 0) {
    throw new Error(`Agreement template has unresolved tokens: ${[...missing].sort().join(', ')}`);
  }
  return rendered;
}

export interface RenderedAgreement {
  simple: string;
  dealSheet: string;
  legal: string;
  documentHash: string;
  termsSnapshot: Record<string, unknown>;
}

export function renderAgreement(
  template: { simpleBody: string; dealSheetBody: string; legalBody: string },
  context: ContractContext,
): RenderedAgreement {
  const tokens = buildTokens(context);
  const simple = renderTemplate(template.simpleBody, tokens);
  const dealSheet = renderTemplate(template.dealSheetBody, tokens);
  const legal = renderTemplate(template.legalBody, tokens);

  const termsSnapshot: Record<string, unknown> = {
    version: context.agreementVersion,
    effectiveDate: context.effectiveDate,
    artist: { legalName: context.artistLegalName, stageName: context.artistStageName },
    song: context.songTitle,
    term: context.termDescription,
    masterStructure: context.masterStructure,
    masterSplits: context.masterSplits,
    compositionSplits: context.compositionSplits,
    revenueSplits: context.revenueSplits,
    recoupment: context.recoupment,
    plannedExpenses: context.plannedExpenses,
    services: context.serviceKeys,
    activities: context.activities,
    signers: context.signers,
    specialTerms: context.specialTerms,
  };

  /**
   * The hash covers the words AND the numbers behind them. A signature references this
   * hash, so an altered split after signing is provably a different document.
   */
  const documentHash = sha256(canonicalJson({ simple, dealSheet, legal, terms: termsSnapshot }));

  return { simple, dealSheet, legal, documentHash, termsSnapshot };
}
