/**
 * Plain-English definitions — spec §43.
 *
 * Every music-business term in the product renders as a `<TermTooltip>` keyed to an entry
 * here, so the same sentence explains the term on the marketing page, in the split builder
 * and inside the deal summary.
 */

export interface GlossaryEntry {
  key: string;
  term: string;
  /** One sentence. This is what appears in the "? What does this mean?" popover. */
  short: string;
  /** A paragraph for the education module and the glossary page. */
  long: string;
  /** The misunderstanding this term most often causes. */
  gotcha?: string;
  related?: string[];
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    key: 'master',
    term: 'Master',
    short: 'The actual sound recording — the specific version of the song that was recorded.',
    long: 'The master is the recording itself: the takes, the mix, the file that gets uploaded to streaming services. Whoever owns the master controls that recording and the money it earns from streams, downloads and sales.',
    gotcha:
      'Owning the master does not give you the song. Someone else can own the composition inside the recording you own.',
    related: ['composition', 'publishing', 'distributor'],
  },
  {
    key: 'composition',
    term: 'Composition (the song)',
    short: 'The underlying song — the lyrics, melody and structure, separate from any recording.',
    long: 'The composition is what a songwriter creates. It exists before anyone presses record and survives every cover version. It is a separate copyright from the master, with its own owners, its own percentages and its own money.',
    gotcha: 'Two different copyrights live inside one released track. They are split separately.',
    related: ['master', 'publishing', 'pro'],
  },
  {
    key: 'publishing',
    term: 'Publishing',
    short:
      'The business side of the song copyright — registering it, licensing it and collecting its money.',
    long: 'Publishing is how the composition earns. A publisher registers the song, licenses it, chases the money it generates and takes an agreed share for doing so. Publishing money and master money arrive from different places and at different times.',
    gotcha:
      'A record deal does not automatically include publishing, and a publishing deal does not include your recordings. Read which one you are signing.',
    related: ['composition', 'pro', 'mechanical'],
  },
  {
    key: 'distributor',
    term: 'Distributor',
    short:
      'The service that delivers your recording to Spotify, Apple Music and the rest, and collects the master-side money.',
    long: 'A distributor moves the finished master and its metadata onto the platforms, then collects what those platforms pay and passes it on, minus a fee or percentage. A distributor is not a label: it delivers files, it does not fund or build a career.',
    gotcha:
      'An exclusive distribution agreement can stop another company from releasing the same recording. Only one distributor can deliver a given track.',
    related: ['master', 'label', 'isrc'],
  },
  {
    key: 'label',
    term: 'Record label',
    short: 'A company that invests in recordings and careers, and shares in what they earn.',
    long: 'A label may fund recording, hire producers, pay for marketing and video, plan releases, handle administration and open industry doors. In return it takes an agreed share of certain revenue, and often a share of the masters it paid for.',
    gotcha:
      'A label relationship should provide real value, not simply take a percentage. Ask what is actually being provided, and get it written into the agreement.',
    related: ['master', 'recoupment', 'distributor'],
  },
  {
    key: 'publisher',
    term: 'Publisher',
    short: 'The organisation that manages and monetises songwriting rights.',
    long: 'A publisher administers compositions: registering them with collection societies worldwide, issuing licences, auditing statements and pursuing unpaid royalties, for an agreed share of the publishing income.',
    related: ['publishing', 'pro', 'mechanical'],
  },
  {
    key: 'pro',
    term: 'PRO (Performing Rights Organisation)',
    short:
      'An organisation that collects public-performance royalties for songwriters and publishers.',
    long: 'A PRO — ASCAP, BMI, SESAC, PRS and their counterparts elsewhere — licenses public performance of compositions: radio, venues, television, some streaming. It pays the writer share directly to the writer and the publisher share to the publisher.',
    gotcha:
      'A PRO pays on the composition, not the recording. If nobody registered the song, nobody gets that money.',
    related: ['composition', 'publishing'],
  },
  {
    key: 'mechanical',
    term: 'Mechanical royalty',
    short:
      'What is owed to the songwriter each time the recording of their song is streamed or sold.',
    long: 'Mechanical royalties are paid on the reproduction of a composition — every stream, download or physical copy. In the US they are collected by the MLC for digital uses; elsewhere the local society handles them.',
    related: ['publishing', 'composition'],
  },
  {
    key: 'split',
    term: 'Split',
    short: "Each person's agreed percentage of a specific right or a specific kind of income.",
    long: 'A split says who gets what. Altar.Camp keeps them separate on purpose: a master split, a songwriting split and a split per revenue category, each totalling exactly 100%, each agreed in advance and approved by the people named in it.',
    gotcha:
      'A verbal split is the single most common cause of a dispute years later. Get it approved in writing before release.',
    related: ['master', 'composition'],
  },
  {
    key: 'recoupment',
    term: 'Recoupment',
    short: 'Money a label spends up front, taken back out of revenue before profit is split.',
    long: 'If Altar.Camp pays for studio time, a video or marketing, the agreement says whether that money comes back out of revenue, and out of which revenue. Until it has come back, the spend is "unrecouped".',
    gotcha:
      "Recouped from gross master revenue and recouped from the artist's share are very different deals. Check which one you are signing.",
    related: ['advance', 'label'],
  },
  {
    key: 'advance',
    term: 'Advance',
    short: 'Money paid to you up front, usually recoupable against what you later earn.',
    long: 'An advance is not a gift or a fee. It is generally an early payment of money you are expected to earn, recovered from your future revenue under the terms of the agreement.',
    related: ['recoupment'],
  },
  {
    key: 'isrc',
    term: 'ISRC',
    short: 'The unique code that identifies one specific recording worldwide.',
    long: 'An International Standard Recording Code is assigned per recording — a single track and its remix get different codes. Platforms and societies use it to match plays to the right master.',
    related: ['master', 'distributor'],
  },
  {
    key: 'sample',
    term: 'Sample / interpolation',
    short: "Using part of someone else's recording, or re-playing part of their song.",
    long: 'A sample uses their master; an interpolation re-records their composition. A sample generally needs clearance from both the master owner and the publisher, and an interpolation needs clearance from the publisher. Clearance is agreed before release, not after.',
    gotcha:
      'An uncleared sample can pull a release down and redirect all of its income. Altar.Camp blocks a release while a declared sample is uncleared.',
    related: ['master', 'publishing'],
  },
  {
    key: 'sync',
    term: 'Sync licence',
    short: 'Permission to use music with picture — film, TV, games, advertising.',
    long: 'A sync generally needs two licences: one from the master owner and one from the publisher. That is why sync money appears on both sides of the split builder.',
    related: ['master', 'publishing'],
  },
  {
    key: 'featured_artist',
    term: 'Featured artist',
    short: 'A guest performer credited on the recording.',
    long: 'A featured artist appears on the track without being the primary artist. Their share of master revenue, their credit and their approval rights should be agreed in writing before release.',
    related: ['split', 'master'],
  },
  {
    key: 'producer_points',
    term: 'Producer points',
    short:
      "A producer's percentage of master revenue, quoted in points — one point is one percent.",
    long: "Producers are often paid a fee plus points. Whether those points come off the top or out of the artist's share, and whether they start paying before or after recoupment, all need to be stated.",
    related: ['recoupment', 'split'],
  },
  {
    key: 'work_for_hire',
    term: 'Work for hire',
    short: 'An arrangement where the person paid does not keep ownership of what they made.',
    long: 'Under a work-for-hire arrangement, the commissioning party owns the result from the moment it is created. It has strict legal requirements that vary by country, and it should be reviewed by counsel rather than assumed.',
    related: ['master', 'composition'],
  },
  {
    key: 'neighboring_rights',
    term: 'Neighboring rights',
    short: 'Performance royalties paid on the recording, where a country recognises them.',
    long: 'Some territories pay performers and master owners when a recording is broadcast or publicly performed. Collection requires registration, and the US treats these differently from most of the world.',
    related: ['master', 'pro'],
  },
];

export const GLOSSARY_BY_KEY: Record<string, GlossaryEntry> = Object.fromEntries(
  GLOSSARY.map((entry) => [entry.key, entry]),
);

export function glossaryEntry(key: string): GlossaryEntry | undefined {
  return GLOSSARY_BY_KEY[key];
}
