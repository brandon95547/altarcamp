/**
 * Questionnaires — existing rights (spec §6 step 3) and the mission profile (spec §14).
 *
 * Declared as data so the form, the validation, the admin review screen and the seeded
 * database all read from one list.
 */

export interface RightsQuestion {
  key: string;
  question: string;
  /** Answering this way means an existing commitment may collide with an Altar.Camp deal. */
  conflictWhen: boolean;
  /** Shown under the question when the conflicting answer is selected. */
  conflictNote: string;
  /** A follow-up field to capture the counterparty. */
  followUpLabel?: string;
}

export const RIGHTS_CONFLICT_WARNING =
  'This relationship may affect your ability to enter an Altar.Camp agreement. Altar.Camp must review your existing obligations before proceeding.';

export const RIGHTS_QUESTIONS: readonly RightsQuestion[] = [
  {
    key: 'signed_to_label',
    question: 'Are you currently signed to another record label?',
    conflictWhen: true,
    conflictNote:
      'Another label may already control your recordings, which can prevent Altar.Camp from releasing them.',
    followUpLabel: 'Which label?',
  },
  {
    key: 'exclusive_distribution',
    question: 'Do you have an exclusive distribution agreement?',
    conflictWhen: true,
    conflictNote:
      'Only one distributor can deliver a given recording. We need to know which one releases this music.',
    followUpLabel: 'Which distributor?',
  },
  {
    key: 'publishing_agreement',
    question: 'Do you have a publishing agreement?',
    conflictWhen: true,
    conflictNote:
      'Your publisher may already control the songwriting side of anything you write during this period.',
    followUpLabel: 'Which publisher?',
  },
  {
    key: 'management_agreement',
    question: 'Do you have a management agreement?',
    conflictWhen: true,
    conflictNote:
      'Your manager may need to approve this deal, or may be entitled to a commission on it.',
    followUpLabel: 'Which manager or management company?',
  },
  {
    key: 'owns_masters',
    question: 'Do you own your existing master recordings?',
    conflictWhen: false,
    conflictNote:
      'If you do not own your existing masters, we need to know who does before including them in anything.',
  },
  {
    key: 'controls_songwriting',
    question: 'Do you own or control your songwriting?',
    conflictWhen: false,
    conflictNote:
      'If someone else controls your songwriting, the publishing terms of this deal may not be yours to grant.',
  },
];

export type MissionAnswerKind = 'long_text' | 'short_text' | 'yes_no' | 'scale';

export interface MissionQuestion {
  key: string;
  question: string;
  kind: MissionAnswerKind;
  helpText?: string;
  required: boolean;
}

export const MISSION_QUESTIONS: readonly MissionQuestion[] = [
  {
    key: 'why_altar',
    question: 'Why do you want to become part of Altar.Camp?',
    kind: 'long_text',
    required: true,
  },
  {
    key: 'music_role',
    question: 'What role does music play in your mission?',
    kind: 'long_text',
    required: true,
  },
  {
    key: 'willing_to_travel',
    question: 'Are you willing to travel?',
    kind: 'yes_no',
    required: true,
  },
  {
    key: 'willing_outreach',
    question: 'Are you willing to participate in outreach?',
    kind: 'yes_no',
    required: true,
  },
  {
    key: 'instruments',
    question: 'What instruments do you play?',
    kind: 'short_text',
    required: true,
  },
  {
    key: 'leading_worship',
    question: 'Are you comfortable leading worship?',
    kind: 'yes_no',
    required: true,
  },
  {
    key: 'collaborating',
    question: 'Are you comfortable collaborating with other artists?',
    kind: 'yes_no',
    required: true,
  },
  {
    key: 'content_creation',
    question: 'Are you willing to participate in content creation?',
    kind: 'yes_no',
    required: true,
  },
  {
    key: 'available_full_time',
    question: 'Are you available full-time?',
    kind: 'yes_no',
    required: true,
  },
  {
    key: 'other_commitments',
    question:
      'Do you have employment, school, family, contractual, immigration or other commitments that could affect availability?',
    kind: 'long_text',
    helpText:
      'Tell us plainly. This does not disqualify you — it lets us build a year that actually fits your life.',
    required: true,
  },
];

/** Affirmations required before signing — spec §21. */
export const SIGNING_AFFIRMATIONS = [
  { key: 'reviewed_summary', label: 'I reviewed the deal summary.' },
  { key: 'understand_master', label: 'I understand master ownership.' },
  { key: 'understand_songwriting', label: 'I understand songwriting ownership.' },
  { key: 'understand_revenue', label: 'I understand how revenue is divided.' },
  { key: 'understand_recoupment', label: 'I understand recoupment.' },
  {
    key: 'legal_advice',
    label: 'I had the opportunity to seek independent legal advice.',
  },
] as const;

export type AffirmationKey = (typeof SIGNING_AFFIRMATIONS)[number]['key'];

export const ALTAR_PROMISE = [
  'Know what you own.',
  'Know what you share.',
  'Know where the money goes.',
  "Know what we're building together.",
] as const;
