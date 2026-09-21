/**
 * What Altar.Camp provides — spec §16.
 *
 * Shown opposite what Altar.Camp receives, so the exchange is visible on one screen. Each
 * service can be switched on per agreement; what is switched on is what the rendered
 * contract promises.
 */

export interface ServiceDefinition {
  key: string;
  label: string;
  description: string;
  group: 'make' | 'release' | 'grow' | 'business' | 'mission';
  /** Included by default in a single-song deal. */
  singleSongDefault: boolean;
  /** Included by default in a one-year deal. */
  oneYearDefault: boolean;
}

export const SERVICE_GROUPS: Record<ServiceDefinition['group'], string> = {
  make: 'Making the record',
  release: 'Getting it out',
  grow: 'Building the audience',
  business: 'Running the business',
  mission: 'Mission',
};

export const SERVICES: readonly ServiceDefinition[] = [
  {
    key: 'recording_support',
    label: 'Recording support',
    description: 'Studio time and session costs for the work this agreement covers.',
    group: 'make',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'producers',
    label: 'Producers',
    description: 'Access to Altar.Camp producers and production budget.',
    group: 'make',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'studio_access',
    label: 'Studio access',
    description: 'Rehearsal and recording space.',
    group: 'make',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'mixing',
    label: 'Mixing',
    description: 'Professional mixing of covered recordings.',
    group: 'make',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'mastering',
    label: 'Mastering',
    description: 'Mastering for release across platforms.',
    group: 'make',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'music_videos',
    label: 'Music videos',
    description: 'Video production for agreed releases.',
    group: 'make',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'photography',
    label: 'Photography',
    description: 'Press and release photography.',
    group: 'make',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'graphic_design',
    label: 'Graphic design',
    description: 'Cover art, campaign assets and brand design.',
    group: 'make',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'distribution',
    label: 'Distribution',
    description: 'Delivery to streaming and download platforms.',
    group: 'release',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'release_planning',
    label: 'Release planning',
    description: 'Dates, rollout, pitching and campaign structure.',
    group: 'release',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Campaign strategy and execution for covered releases.',
    group: 'grow',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'advertising',
    label: 'Advertising',
    description: 'Paid media behind agreed campaigns.',
    group: 'grow',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'social_strategy',
    label: 'Social media strategy',
    description: 'Content planning and support.',
    group: 'grow',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'artist_development',
    label: 'Artist development',
    description: 'Craft, performance and career development.',
    group: 'grow',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'collaborations',
    label: 'Collaborations',
    description: 'Introductions and sessions with other Altar.Camp artists.',
    group: 'grow',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'royalty_administration',
    label: 'Royalty administration',
    description: 'Tracking income, splits, statements and payments.',
    group: 'business',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'business_administration',
    label: 'Business administration',
    description: 'Registrations, metadata, filings and paperwork.',
    group: 'business',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'accounting',
    label: 'Accounting',
    description: 'Per-release accounting records you can inspect at any time.',
    group: 'business',
    singleSongDefault: true,
    oneYearDefault: true,
  },
  {
    key: 'licensing',
    label: 'Licensing opportunities',
    description: 'Pitching for sync and licensing.',
    group: 'business',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'merchandise',
    label: 'Merchandise',
    description: 'Design, production and fulfilment support.',
    group: 'business',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'tour_support',
    label: 'Tour / event support',
    description: 'Booking help and tour costs as agreed.',
    group: 'mission',
    singleSongDefault: false,
    oneYearDefault: true,
  },
  {
    key: 'mission_trip_support',
    label: 'Mission-trip support',
    description: 'Travel, logistics and costs for agreed mission activity.',
    group: 'mission',
    singleSongDefault: false,
    oneYearDefault: true,
  },
];

export function servicesFor(path: 'single_song' | 'one_year'): ServiceDefinition[] {
  return SERVICES.filter((service) =>
    path === 'single_song' ? service.singleSongDefault : service.oneYearDefault,
  );
}

export function serviceLabels(keys: readonly string[]): string[] {
  return keys
    .map((key) => SERVICES.find((service) => service.key === key))
    .filter((service): service is ServiceDefinition => Boolean(service))
    .map((service) => service.label);
}

/** Activities a one-year commitment can include — spec §15. */
export const YEAR_ACTIVITIES = [
  { key: 'songwriting', label: 'Songwriting' },
  { key: 'recording', label: 'Recording' },
  { key: 'rehearsals', label: 'Rehearsals' },
  { key: 'collaborations', label: 'Collaborations' },
  { key: 'content_creation', label: 'Content creation' },
  { key: 'live_events', label: 'Live events' },
  { key: 'community_outreach', label: 'Community outreach' },
  { key: 'mission_trips', label: 'Mission trips' },
  { key: 'ministry_events', label: 'Ministry events' },
  { key: 'promotional_appearances', label: 'Promotional appearances' },
] as const;

export type YearActivityKey = (typeof YEAR_ACTIVITIES)[number]['key'];

/** Each activity is either required by the agreement or offered as an opportunity — spec §15. */
export type ActivityCommitment = 'required' | 'opportunity' | 'not_included';
