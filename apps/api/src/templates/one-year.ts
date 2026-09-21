import type { AgreementTemplateDefinition } from './types.js';

export const oneYearTemplate: AgreementTemplateDefinition = {
  type: 'one_year_altar',
  version: 1,
  title: 'One-Year Altar.Camp Agreement',

  simpleBody: `# Your Altar.Camp year, in plain English

From **{{start_date}}** to **{{end_date}}** you are an Altar.Camp artist and missionary. Here is what that means, before any legal language.

## This sets a framework, not a blanket claim

This agreement sets out how you and Altar.Camp work together for a year. It does **not** hand Altar.Camp your back catalogue, and it does not decide the ownership of songs in advance. Every recording you make during the year gets its own ownership record, agreed song by song, using the framework below.

## What you are committing to

{{activities_paragraph}}

## What Altar.Camp commits to

{{services_list}}

## Money

{{simple_revenue_paragraph}}

## What Altar.Camp pays for

{{simple_expense_paragraph}}

## What happens at the end of the year

{{renewal_paragraph}}

{{counsel_notice}}`,

  dealSheetBody: `# Deal sheet — one-year Altar.Camp commitment

| | |
| --- | --- |
| **Agreement** | One-Year Altar.Camp Agreement, version {{agreement_version}} |
| **Artist** | {{artist_legal_name}} ({{artist_stage_name}}) |
| **Label** | {{altar_entity}} |
| **Start date** | {{start_date}} |
| **End date** | {{end_date}} |
| **Renewal** | {{renewal_statement}} |

## Ownership framework

{{master_table}}

{{composition_table}}

Each recording made during the year records its own ownership against this framework. Where a song's own agreement differs, that song's agreement controls for that song.

## Revenue

{{revenue_tables}}

## Expenses and recoupment

{{recoupment_statement}}

### Worked example

{{recoupment_example}}

## Activities

{{activities_table}}

## Altar.Camp provides

{{services_list}}

## Signatures required

{{signer_list}}`,

  legalBody: `# ONE-YEAR ALTAR.CAMP ARTIST AND MISSION AGREEMENT

This Agreement is made as of {{effective_date}} between {{altar_entity}} ("**Altar.Camp**") and {{artist_legal_name}}, professionally known as {{artist_stage_name}} (the "**Artist**").

{{counsel_notice}}

> **Classification notice.** The parties intend the mission element of this relationship to be the relationship described in Section 3. Whether that relationship is properly characterised as employment, independent contracting, volunteer service or ministry service depends on the law of each jurisdiction in which the Artist serves. Altar.Camp will obtain a written classification opinion for each such jurisdiction before the Artist begins service there, and this Agreement will be amended to reflect it.

## 1. Term

1.1 This Agreement begins on {{start_date}} and ends on {{end_date}} (the "**Term**").

1.2 {{renewal_clause}}

1.3 Either party may end the Term early on sixty (60) days' written notice. Ownership interests already recorded for a specific recording survive the end of the Term, as do accrued revenue entitlements and outstanding recoupment balances.

## 2. Music commitments

2.1 During the Term the Artist will participate in the activities recorded in Schedule A. Activities marked "required" are obligations of this Agreement. Activities marked "opportunity" are offered, not obligatory, and declining one is not a breach.

2.2 Recordings made during the Term are covered by this Agreement where Altar.Camp funds, produces or releases them, and where the parties record their ownership in the Altar.Camp platform under Section 4.

## 3. Mission commitments

3.1 The Artist will participate in the mission and outreach activities recorded in Schedule A.

3.2 Altar.Camp will not require the Artist to travel to any location the Artist has declined in writing, and will meet the costs recorded in Schedule B for approved mission activity.

3.3 The Artist's participation in mission activity is subject to the Artist's health, safety, visa status and personal circumstances, and the Artist may withdraw from a specific activity without that withdrawal constituting a breach of this Agreement.

## 4. Ownership framework

4.1 Ownership of each master recording made during the Term is recorded separately for that recording. The default framework is:

{{master_table}}

4.2 Ownership of each composition written during the Term is recorded separately for that composition. The default framework is:

{{composition_table}}

4.3 A recording's own recorded ownership controls for that recording where it differs from Sections 4.1 or 4.2, provided it has been approved in the platform by every participant whose share it states.

4.4 Ownership of the master does not transfer any interest in the composition, and ownership of the composition does not transfer any interest in the master.

4.5 {{publishing_clause}}

## 5. Revenue

5.1 Revenue is allocated by category as follows:

{{revenue_tables}}

5.2 Altar.Camp accounts to the Artist at least twice per year and publishes statements through the platform, showing gross revenue, permitted deductions, recoupment applied and the Artist's share.

5.3 Revenue from the Artist's catalogue created before the Term, and from activity outside the scope of this Agreement, belongs entirely to the Artist and is not shared under this Agreement.

## 6. Costs and recoupment

6.1 {{recoupment_clause}}

6.2 {{investment_cap_clause}}

6.3 {{personal_liability_clause}}

6.4 {{after_recoupment_clause}}

## 7. What Altar.Camp provides

7.1 During the Term, Altar.Camp will provide:

{{services_list}}

7.2 Altar.Camp will assign the Artist a point of contact and will meet with the Artist at least quarterly to review releases, accounting and mission activity.

## 8. Artist warranties

8.1 The Artist warrants that entering this Agreement does not breach any existing label, distribution, publishing or management agreement, and that every such agreement has been disclosed to Altar.Camp.

## 9. Independent advice

9.1 The Artist acknowledges that Altar.Camp has advised the Artist to obtain independent legal advice, that the Artist has had a reasonable opportunity to do so, and that the Artist enters this Agreement freely.

## 10. End of the Term

10.1 {{end_of_term_clause}}

10.2 Within thirty (30) days of the end of the Term, Altar.Camp will provide the Artist with a complete copy of the Artist's documents, ownership records, registrations and accounting history through the platform.

## 11. General

11.1 This Agreement may be amended only in writing signed by both parties.

11.2 This Agreement is governed by the laws of {{governing_law}}.

11.3 Special terms, if any: {{special_terms}}

---

## Schedule A — Activities

{{activities_table}}

## Schedule B — Contemplated costs

{{expense_table}}

---

## Signatures

{{signature_block}}`,
};
