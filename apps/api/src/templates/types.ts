import type { AgreementType } from '@altar/shared';

/**
 * A template is authored once and versioned. Rendering never edits a template — it
 * substitutes `{{tokens}}` and stores the result in agreement_versions, so a signature
 * always points at exactly the words that were on screen.
 */
export interface AgreementTemplateDefinition {
  type: AgreementType;
  version: number;
  title: string;
  /** View 1 — plain English, spec §21. */
  simpleBody: string;
  /** View 2 — the percentages and obligations at a glance. */
  dealSheetBody: string;
  /** View 3 — the agreement itself. */
  legalBody: string;
}

export const COUNSEL_NOTICE = `> **Template notice.** This document is generated from an Altar.Camp template. Altar.Camp is not a law firm and this is not legal advice. Before Altar.Camp uses these templates with artists, they must be reviewed by qualified counsel for every jurisdiction Altar.Camp operates in — including the employment, contractor or ministry classification that applies to a full-time missionary relationship. You are encouraged to have your own advisor review this agreement before you sign it.`;
