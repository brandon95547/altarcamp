import type { AgreementTemplateDefinition } from './types.js';

export const splitSheetTemplate: AgreementTemplateDefinition = {
  type: 'songwriter_split_sheet',
  version: 1,
  title: 'Songwriter Split Sheet',

  simpleBody: `# Who wrote "{{song_title}}"

This page records who wrote the song and in what shares. It is short on purpose. Sign it now, while everyone agrees, and it settles the question permanently.

{{composition_table}}

Each writer above confirms their own percentage. The shares total 100%. Nothing here affects who owns the **recording** — that is a separate question, answered separately.

{{counsel_notice}}`,

  dealSheetBody: `# Split sheet — {{song_title}}

| | |
| --- | --- |
| **Work** | {{song_title}} |
| **Date** | {{effective_date}} |
| **Artist** | {{artist_stage_name}} |

## Writers and shares

{{composition_table}}

## Publishing and PRO details

{{publishing_table}}

## Signatures required

{{signer_list}}`,

  legalBody: `# SONGWRITER SPLIT SHEET

**Work:** "{{song_title}}"
**Date:** {{effective_date}}
**Recording artist:** {{artist_stage_name}}

{{counsel_notice}}

## 1. Ownership of the Composition

The undersigned are the authors of the musical composition identified above (the "**Composition**") and agree that ownership of the Composition, and of all income arising from it, is divided as follows:

{{composition_table}}

## 2. Publishing and collection

{{publishing_table}}

Each writer is responsible for registering their share with their performing rights organisation and publisher.

## 3. Scope

3.1 This document concerns the Composition only. It does not transfer, licence or affect any interest in any sound recording of the Composition.

3.2 These shares apply to every use of the Composition, in every territory, for the full term of copyright, and may be changed only by a written amendment signed by every writer whose share changes.

## 4. Acknowledgement

Each writer confirms that the share recorded beside their name is accurate, that they are the author of the contribution it reflects, and that no other person has a claim to authorship of the Composition.

---

## Signatures

{{signature_block}}`,
};
