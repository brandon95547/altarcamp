import type { AgreementTemplateDefinition } from './types.js';
import { singleSongTemplate } from './single-song.js';
import { oneYearTemplate } from './one-year.js';
import { splitSheetTemplate } from './split-sheet.js';

/**
 * The templates Phase 1 generates. Spec §20 lists ten agreement types; phase 2 adds the
 * producer, featured-artist and clearance agreements against the same engine.
 */
export const AGREEMENT_TEMPLATES: readonly AgreementTemplateDefinition[] = [
  singleSongTemplate,
  splitSheetTemplate,
  oneYearTemplate,
];

export { COUNSEL_NOTICE } from './types.js';
export type { AgreementTemplateDefinition } from './types.js';
