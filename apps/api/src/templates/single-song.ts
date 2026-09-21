import type { AgreementTemplateDefinition } from './types.js';

export const singleSongTemplate: AgreementTemplateDefinition = {
  type: 'single_song_collaboration',
  version: 1,
  title: 'Single Song Collaboration Agreement',

  simpleBody: `# Your Altar.Camp song deal, in plain English

This agreement covers **one recording**: "{{song_title}}". Nothing else you have made, and nothing else you will make, is affected by signing it.

## What you own

{{simple_ownership_paragraph}}

Remember that these are two different things. The **master** is this recording. The **song** is the lyrics and melody inside it. Owning one does not give anyone the other.

## What happens when it earns money

{{simple_revenue_paragraph}}

## What Altar.Camp pays for

{{simple_expense_paragraph}}

## What Altar.Camp does for you

{{services_list}}

## How long this lasts

{{term_description}}

## If something goes wrong

Either of you can raise a problem in writing. Neither of you can change these percentages alone — a change requires a written amendment signed by everyone whose share moves.

{{counsel_notice}}`,

  dealSheetBody: `# Deal sheet — {{song_title}}

| | |
| --- | --- |
| **Agreement** | Single Song Collaboration Agreement, version {{agreement_version}} |
| **Artist** | {{artist_legal_name}} ({{artist_stage_name}}) |
| **Label** | {{altar_entity}} |
| **Effective date** | {{effective_date}} |
| **Scope** | This recording only |

## Master ownership

{{master_table}}

{{master_structure_note}}

## Songwriting ownership

{{composition_table}}

## Publishing

{{publishing_statement}}

## Revenue

{{revenue_tables}}

## Expenses and recoupment

{{recoupment_statement}}

{{expense_table}}

### Worked example

{{recoupment_example}}

## Altar.Camp provides

{{services_list}}

## Signatures required

{{signer_list}}`,

  legalBody: `# SINGLE SONG COLLABORATION AGREEMENT

This Single Song Collaboration Agreement (the "**Agreement**") is entered into as of {{effective_date}} (the "**Effective Date**") between {{altar_entity}} ("**Altar.Camp**") and {{artist_legal_name}}, professionally known as {{artist_stage_name}} (the "**Artist**"), together with the additional participants identified in Schedule A (each a "**Participant**").

{{counsel_notice}}

## 1. Subject of this Agreement

1.1 This Agreement applies solely to the musical work and sound recording provisionally titled "{{song_title}}" (the "**Recording**" and the "**Composition**" respectively, together the "**Work**").

1.2 This Agreement does not create an exclusive relationship. It does not grant Altar.Camp rights in any other recording, composition, performance or activity of the Artist.

## 2. Definitions

2.1 "**Master**" means the Recording: the particular sound recording of the Composition made by or for the parties, in every format and medium.

2.2 "**Composition**" means the underlying musical work — lyrics, melody and arrangement — embodied in the Recording, independent of any recording of it.

2.3 "**Master Revenue**" means amounts actually received by Altar.Camp from the exploitation of the Master, after amounts retained by distributors, platforms and collection agents.

2.4 "**Publishing Revenue**" means amounts actually received in respect of the Composition, including mechanical, performance and synchronisation income attributable to the publishing side.

2.5 "**Recoupable Costs**" means the costs identified in Section 6 and Schedule B that this Agreement states are recoverable from revenue.

## 3. Ownership of the Master

3.1 Ownership of the Master is held as follows:

{{master_table}}

3.2 {{master_structure_clause}}

3.3 Each owner of the Master holds its share as a tenant in common. No owner may licence, assign or otherwise dispose of the Master, or any share in it, without the prior written consent of the other owners, such consent not to be unreasonably withheld.

## 4. Ownership of the Composition

4.1 The Composition is owned as follows:

{{composition_table}}

4.2 For the avoidance of doubt, and notwithstanding anything in Section 3, ownership of the Master does not transfer, licence or encumber any interest in the Composition, and ownership of the Composition does not transfer, licence or encumber any interest in the Master.

4.3 {{publishing_clause}}

4.4 Each writer is responsible for registering their share of the Composition with their performing rights organisation and, where applicable, their publisher and mechanical collection society.

## 5. Revenue

5.1 Revenue arising from the Work is allocated by category as follows:

{{revenue_tables}}

5.2 Allocations are calculated on amounts actually received, and are applied after the deductions expressly permitted by this Agreement and not otherwise.

5.3 Altar.Camp will account to the Artist for amounts payable under this Agreement at least twice per year, and will make the underlying statements available to the Artist through the Altar.Camp platform.

5.4 Amounts payable to a Participant are paid to that Participant directly in accordance with Schedule A, and not through the Artist, unless a Participant directs otherwise in writing.

## 6. Costs and recoupment

6.1 {{recoupment_clause}}

6.2 The costs contemplated at the date of this Agreement are set out in Schedule B. Altar.Camp will obtain the Artist's written approval before incurring a Recoupable Cost that is not in Schedule B, or that exceeds a Schedule B line by more than ten percent (10%).

6.3 {{investment_cap_clause}}

6.4 {{personal_liability_clause}}

6.5 {{after_recoupment_clause}}

## 7. What Altar.Camp provides

7.1 In consideration of the rights granted under this Agreement, Altar.Camp will provide, at its cost except as stated in Schedule B:

{{services_list}}

7.2 Altar.Camp will consult the Artist on release timing, artwork and marketing approach for the Work.

## 8. Term

8.1 {{term_description}}

8.2 The ownership interests recorded in Sections 3 and 4 are not time-limited and survive the completion of the activities contemplated by this Agreement, except where Section 3.2 provides for a licence of limited duration.

## 9. Credit

9.1 The Artist will be credited as performing artist on the Work. Participants will be credited in accordance with Schedule A. Altar.Camp may be credited as the releasing label.

## 10. Warranties

10.1 Each party warrants that it has the right to enter into this Agreement and that doing so does not breach any other agreement binding on it.

10.2 The Artist warrants that the Work is original, that the Artist has obtained clearance for any sample, interpolation or third-party material used in it, and that the Artist has disclosed every existing label, distribution, publishing and management commitment that could affect the rights granted here.

10.3 Each party will indemnify the other against losses arising from a breach of its warranties in this Section 10.

## 11. Independent advice

11.1 Each party acknowledges that it has been advised to seek independent legal advice before signing, has had a reasonable opportunity to do so, and enters into this Agreement freely.

## 12. Dispute resolution

12.1 The parties will first attempt in good faith to resolve any dispute between them by direct discussion, and then by mediation, before commencing proceedings.

## 13. General

13.1 This Agreement may be amended only by a written amendment signed by every party whose rights or percentages are affected.

13.2 This Agreement is governed by the laws of {{governing_law}}.

13.3 This Agreement may be signed electronically and in counterparts, each of which is an original.

13.4 Special terms, if any: {{special_terms}}

---

## Schedule A — Participants

{{participants_table}}

## Schedule B — Contemplated costs

{{expense_table}}

---

## Signatures

{{signature_block}}`,
};
