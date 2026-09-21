/**
 * The orientation every artist completes before entering percentages — spec §7.
 *
 * Short, checkable, and finishing on the one point the whole product rests on: the
 * recording and the song are two different things, owned separately and paid separately.
 */

export interface EducationCheck {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
  correctOptionId: string;
  /** Shown after answering, right or wrong. */
  explanation: string;
}

export interface EducationLesson {
  slug: string;
  title: string;
  /** One line under the title. */
  summary: string;
  /** Paragraphs, rendered in order. */
  body: string[];
  /** Glossary keys surfaced as "? What does this mean?" chips on the lesson. */
  terms: string[];
  check: EducationCheck;
}

export const EDUCATION_LESSONS: readonly EducationLesson[] = [
  {
    slug: 'two-copyrights',
    title: 'Every song is two things',
    summary: 'The recording and the song are separate property, with separate owners.',
    body: [
      'When you release music, two different pieces of property exist at once. The master is the recording — the actual takes, the mix, the file the platforms play. The composition is the song — the lyrics, the melody, the chords — and it exists whether or not anyone ever records it.',
      'They can be owned by completely different people. A label might own the recording while you still own every word and note inside it. That is normal, and it is why Altar.Camp always asks the two questions separately.',
      'Whenever you see ownership in this product, check which one you are looking at. We will never merge them into a single number.',
    ],
    terms: ['master', 'composition'],
    check: {
      id: 'two-copyrights',
      prompt: 'A label owns 100% of the master of your song. What do they own?',
      options: [
        { id: 'a', label: 'The recording only' },
        { id: 'b', label: 'The recording and the song' },
        { id: 'c', label: 'The song only' },
      ],
      correctOptionId: 'a',
      explanation:
        'They own that recording. Owning a master does not transfer the composition — the lyrics and melody stay with whoever owns the songwriting.',
    },
  },
  {
    slug: 'who-does-what',
    title: 'Label, distributor, publisher, PRO',
    summary: 'Four different organisations, four different jobs, four different pots of money.',
    body: [
      'A distributor delivers your recording to the platforms and collects the master-side digital money. A label invests in the recording and the career, and shares in agreed revenue. A publisher looks after the song copyright and the money it earns. A PRO collects public-performance royalties for songwriters and publishers.',
      'You can work with all four at once. That is common and perfectly normal. What causes damage is not knowing which of them controls which right, because two organisations can end up claiming the same income, or worse, nobody registers a right and the money simply never arrives.',
      'Before you sign anything with Altar.Camp, we ask what you already have in place, so we can see the overlaps before they become a problem.',
    ],
    terms: ['distributor', 'label', 'publisher', 'pro'],
    check: {
      id: 'who-does-what',
      prompt: 'Who collects public-performance royalties for a songwriter?',
      options: [
        { id: 'a', label: 'The distributor' },
        { id: 'b', label: 'A PRO' },
        { id: 'c', label: 'The streaming platform' },
      ],
      correctOptionId: 'b',
      explanation:
        'A PRO licenses public performance of the composition and pays the writer share directly to the writer.',
    },
  },
  {
    slug: 'splits-before-money',
    title: 'Splits are agreed before the money arrives',
    summary: 'Every percentage is decided, approved and written down before release.',
    body: [
      'A split is a percentage of one specific thing: the master, the songwriting, or one named kind of income. Each split totals exactly 100% and each person named in it approves their own share.',
      'Doing this before release is the entire point. After a song starts earning, memories differ, and what everyone "understood in the room" turns into a dispute that can freeze the income for years.',
      'Altar.Camp will not generate an agreement while a split is short, over, or unapproved. That is a feature, not an obstacle.',
    ],
    terms: ['split', 'producer_points', 'featured_artist'],
    check: {
      id: 'splits-before-money',
      prompt: 'Three writers agree on 50 / 25 / 25. What does the split sheet need before release?',
      options: [
        { id: 'a', label: 'Nothing — the percentages add to 100' },
        { id: 'b', label: 'Approval from each writer, in writing' },
        { id: 'c', label: 'Only the primary artist to confirm it' },
      ],
      correctOptionId: 'b',
      explanation:
        'Totalling 100% is necessary but not sufficient. Each named writer approves their own percentage, so nobody can later say they never agreed.',
    },
  },
  {
    slug: 'spending-and-recoupment',
    title: 'What happens when the label spends money',
    summary: 'Know who pays, whether it comes back, and out of whose share.',
    body: [
      'If Altar.Camp pays for studio time, a producer, a video or marketing, the agreement states whether that money is recouped — taken back out of revenue — and from which revenue it is taken.',
      "Recouping from gross master revenue and recouping from the artist's share produce very different outcomes for you. The deal summary shows a worked example with real numbers before you sign anything.",
      'Also worth knowing: whether you personally owe the balance if the music never earns it back. In an Altar.Camp deal the default is that you do not — if the revenue never covers it, Altar.Camp absorbs the difference. Whatever your agreement says, it says it in plain words.',
    ],
    terms: ['recoupment', 'advance'],
    check: {
      id: 'spending-and-recoupment',
      prompt: 'An expense is "unrecouped". What does that mean?',
      options: [
        { id: 'a', label: 'The money has not been paid out yet' },
        { id: 'b', label: 'Revenue has not yet repaid what was spent' },
        { id: 'c', label: 'The expense was refused' },
      ],
      correctOptionId: 'b',
      explanation:
        'Unrecouped means the revenue so far has not covered the up-front spend under the terms of the agreement.',
    },
  },
  {
    slug: 'before-you-release',
    title: 'Before you release anything',
    summary: 'Five answers you should be able to give about every record you put out.',
    body: [
      'Who owns the master? Who owns the song? Who gets paid, and in what percentages? Who collects the money? And which documents prove all of it?',
      'If any of those five has a fuzzy answer, the record is not ready — no matter how good it sounds. Altar.Camp keeps that page current for every song you make with us, and you can open it at any time.',
    ],
    terms: ['master', 'composition', 'split', 'isrc', 'sample'],
    check: {
      id: 'before-you-release',
      prompt: 'Your track uses a two-second sample you have not cleared. Can it be released?',
      options: [
        { id: 'a', label: 'Yes, short samples are automatically fine' },
        { id: 'b', label: 'No — it needs clearance first' },
        { id: 'c', label: 'Yes, as long as you credit them' },
      ],
      correctOptionId: 'b',
      explanation:
        'There is no safe length. An uncleared sample can take a release down and redirect its income, so Altar.Camp blocks release until a declared sample is cleared.',
    },
  },
];

export const EDUCATION_PASS_THRESHOLD = 4;

export function lessonBySlug(slug: string): EducationLesson | undefined {
  return EDUCATION_LESSONS.find((lesson) => lesson.slug === slug);
}
