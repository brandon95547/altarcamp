/**
 * Revenue categories — spec §10 and §18.
 *
 * "Do not program the platform around one universal percentage." Each category carries its
 * own split, and each split belongs to an agreement. A category is tagged with the side of
 * the copyright it flows from, because master money and publishing money are different money.
 */

import type { RightType } from './enums.js';

export const REVENUE_CATEGORIES = [
  'master_streaming',
  'downloads',
  'physical',
  'publishing',
  'sync_licensing',
  'neighboring_rights',
  'live_performance',
  'merchandise',
  'sponsorship',
  'brand_partnership',
  'content_monetization',
  'donations',
  'other',
] as const;
export type RevenueCategory = (typeof REVENUE_CATEGORIES)[number];

export interface RevenueCategoryDefinition {
  key: RevenueCategory;
  label: string;
  /** Which copyright the money flows from — null when it is neither (e.g. merch). */
  side: RightType | null;
  /** Shown under the heading in the revenue split builder. */
  description: string;
  /** Categories offered by default for a single-song deal — spec §10. */
  singleSong: boolean;
  /** Categories offered by default for a one-year deal — spec §18. */
  oneYear: boolean;
}

export const REVENUE_CATEGORY_DEFINITIONS: readonly RevenueCategoryDefinition[] = [
  {
    key: 'master_streaming',
    label: 'Master streaming revenue',
    side: 'master',
    description:
      'What streaming services pay for plays of this recording, after the distributor takes its cut.',
    singleSong: true,
    oneYear: true,
  },
  {
    key: 'downloads',
    label: 'Downloads',
    side: 'master',
    description: 'Paid downloads of the recording from stores and direct sales.',
    singleSong: true,
    oneYear: true,
  },
  {
    key: 'physical',
    label: 'Physical music',
    side: 'master',
    description: 'CDs, vinyl, cassettes and anything else pressed and sold.',
    singleSong: false,
    oneYear: true,
  },
  {
    key: 'publishing',
    label: 'Publishing revenue',
    side: 'publishing',
    description:
      'Money earned by the song itself — mechanical royalties, performance royalties and publishing administration.',
    singleSong: true,
    oneYear: true,
  },
  {
    key: 'sync_licensing',
    label: 'Sync / licensing revenue',
    side: null,
    description:
      'Film, TV, games and advertising. A sync licence usually needs both sides: the recording and the song.',
    singleSong: true,
    oneYear: true,
  },
  {
    key: 'neighboring_rights',
    label: 'Neighboring rights',
    side: 'master',
    description:
      'Performance royalties on the recording itself, where the territory recognises them.',
    singleSong: false,
    oneYear: true,
  },
  {
    key: 'live_performance',
    label: 'Live performance',
    side: null,
    description: 'Fees from shows, festivals and ticketed events covered by this agreement.',
    singleSong: false,
    oneYear: true,
  },
  {
    key: 'merchandise',
    label: 'Merchandise',
    side: null,
    description: 'Merch tied to this song or to the Altar.Camp year, depending on the agreement.',
    singleSong: true,
    oneYear: true,
  },
  {
    key: 'sponsorship',
    label: 'Sponsorship',
    side: null,
    description: 'Sponsorship of tours, events or content covered by this agreement.',
    singleSong: false,
    oneYear: true,
  },
  {
    key: 'brand_partnership',
    label: 'Brand partnerships',
    side: null,
    description: 'Paid partnerships and endorsements arranged under this agreement.',
    singleSong: false,
    oneYear: true,
  },
  {
    key: 'content_monetization',
    label: 'Content monetization',
    side: null,
    description: 'Ad and platform revenue from video and social content covered here.',
    singleSong: false,
    oneYear: true,
  },
  {
    key: 'donations',
    label: 'Donations connected with permitted activities',
    side: null,
    description:
      'Gifts given in connection with mission activity this agreement covers. Designated giving may be restricted by law — Altar.Camp reviews these case by case.',
    singleSong: false,
    oneYear: true,
  },
  {
    key: 'other',
    label: 'Other revenue',
    side: null,
    description: 'Anything else the two of you agree to name and split up front.',
    singleSong: true,
    oneYear: true,
  },
];

export const REVENUE_CATEGORY_LABELS = Object.fromEntries(
  REVENUE_CATEGORY_DEFINITIONS.map((definition) => [definition.key, definition.label]),
) as Record<RevenueCategory, string>;

export function revenueCategoriesFor(
  path: 'single_song' | 'one_year',
): RevenueCategoryDefinition[] {
  return REVENUE_CATEGORY_DEFINITIONS.filter((definition) =>
    path === 'single_song' ? definition.singleSong : definition.oneYear,
  );
}

export function revenueCategory(key: RevenueCategory): RevenueCategoryDefinition {
  const found = REVENUE_CATEGORY_DEFINITIONS.find((definition) => definition.key === key);
  if (!found) throw new Error(`Unknown revenue category: ${key}`);
  return found;
}
