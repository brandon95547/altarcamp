import { ALTAR_PROMISE } from '@altar/shared';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '../../assets/altar-camp-hero.webp';
import { ButtonLink } from '../../components/ui/Button.js';
import { Term } from '../../components/ui/Term.js';
import { cn } from '../../lib/cn.js';

// The promise reads as two pairs: what you hold, then where it leads.
const [OWN, SHARE, MONEY, BUILDING] = ALTAR_PROMISE;
const PROMISE_PAIRS = [
  [OWN, MONEY],
  [SHARE, BUILDING],
] as const;

const PATHS = [
  {
    eyebrow: 'Option one',
    title: 'One song',
    lead: 'Collaborate with Altar.Camp on one song.',
    points: [
      'Collaborate on one specific record',
      'Release one song together',
      'Work with another Altar.Camp artist',
      'Test the relationship first',
      'Keep the agreement limited to this project',
    ],
    cta: 'Start a song',
    href: '/signup?path=single_song',
    accent: { border: 'border-t-ember-500', eyebrow: 'text-ember-700', check: 'text-ember-600' },
  },
  {
    eyebrow: 'Option two',
    title: 'One year',
    lead: 'Join Altar.Camp for a one-year music and mission partnership.',
    points: [
      'Commit to the Altar.Camp mission',
      'Release music throughout the year',
      'Receive label support and funding',
      'Participate in missions and outreach',
      'Share revenue on an agreed structure',
      'Build music and ministry together',
    ],
    cta: 'Start my year',
    href: '/signup?path=one_year',
    accent: { border: 'border-t-moss-500', eyebrow: 'text-moss-700', check: 'text-moss-600' },
  },
];

const OWNERSHIP = [
  {
    label: 'Master ownership',
    rows: [
      ['Artist', '50%', 'bg-ember-500'],
      ['Altar.Camp', '50%', 'bg-ink-700'],
    ],
  },
  {
    label: 'Songwriting ownership',
    rows: [
      ['Artist', '75%', 'bg-moss-500'],
      ['Collaborator', '25%', 'bg-dusk-500'],
    ],
  },
];

const FIVE_ANSWERS = [
  ['Who owns the master?', 'The recording itself, and in what shares.'],
  ['Who owns the song?', 'The writers, and the percentage each one agreed to.'],
  ['Who gets paid?', 'Every revenue category, split separately, totalling 100%.'],
  ['Who collects the money?', 'Distributor, publisher, PRO — named, not assumed.'],
  ['What contracts prove it?', 'Signed documents, hashed and stored in your vault.'],
];

/** Section headings below the hero share one size, so no section outranks another. */
const SECTION_HEADING = 'text-3xl font-extrabold sm:text-4xl lg:text-heading';

export function HomePage() {
  return (
    <>
      {/* Spec §5 — the primary call to action. The hero runs up behind the header. */}
      <section className="relative isolate -mt-(--altar-header) overflow-hidden bg-ink-950 pt-[calc(var(--altar-header)+--spacing(10))] pb-24 text-ink-100 sm:pt-[calc(var(--altar-header)+--spacing(12))]">
        <img
          src={heroImage}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 -z-10 size-full object-cover object-[72%_45%] md:origin-left md:scale-115"
        />
        {/* Dark where the words are, open where the sunrise is. On a narrow screen the words
            cover the whole width, so the wash is even. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-ink-950/80 md:bg-transparent md:bg-linear-to-r md:from-ink-950/95 md:from-20% md:via-ink-950/80 md:via-50% md:to-ink-950/40"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-b from-ink-950/70 via-transparent via-40% to-ink-950/85"
        />

        <div className="altar-container">
          <p className="mb-4 text-sm font-bold uppercase tracking-eyebrow text-ember-500">
            Artist signing &amp; mission label
          </p>
          <h1 className="max-w-4xl text-5xl font-extrabold text-ink-50 sm:text-6xl lg:text-7xl">
            Make music.
            <br />
            <span className="text-ember-500">Join the mission.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-200">
            There are two ways to work with Altar.Camp. Both of them start by making sure you
            understand exactly what you are agreeing to, one decision at a time.
          </p>

          <ul className="mt-8 flex flex-col gap-5 lg:flex-row lg:gap-x-20">
            {PROMISE_PAIRS.map(([first, second], index) => (
              <li
                key={first}
                className={cn(
                  'text-xl leading-snug font-bold sm:text-2xl',
                  index > 0 && 'lg:border-l lg:border-ember-500/40 lg:pl-20',
                )}
              >
                <span className="block text-ink-50">{first}</span>
                <span className="block text-ember-500">{second}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Spec §5 — two large cards. From md up each card is a subgrid of the section, so the
          rule under each lead and the two buttons line up however the copy wraps. */}
      <section className="altar-container relative -mt-16 grid gap-6 pb-16 md:grid-cols-2 md:gap-x-8 md:gap-y-0">
        {PATHS.map((path) => (
          <div
            key={path.title}
            className={cn(
              'flex flex-col rounded-card border border-t-4 border-ink-200 bg-white p-7 shadow-raised sm:p-10 md:row-span-3 md:grid md:grid-rows-subgrid',
              path.accent.border,
            )}
          >
            <div className="pb-6">
              <p
                className={cn('text-sm font-bold uppercase tracking-eyebrow', path.accent.eyebrow)}
              >
                {path.eyebrow}
              </p>
              <h2 className="mt-2 text-4xl font-extrabold lg:text-5xl">{path.title}</h2>
              <p className="mt-3 text-lg text-ink-800 sm:text-xl">{path.lead}</p>
            </div>

            <ul className="grid flex-1 content-start gap-3.5 border-t border-ink-200 pt-6">
              {path.points.map((point) => (
                <li key={point} className="flex gap-3 text-lg text-ink-800">
                  <Check
                    className={cn('mt-1 size-5 shrink-0', path.accent.check)}
                    strokeWidth={3}
                    aria-hidden
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="pt-8">
              <ButtonLink to={path.href} size="lg" className="w-full">
                {path.cta}
                <ArrowRight className="size-5" aria-hidden />
              </ButtonLink>
            </div>
          </div>
        ))}
      </section>

      {/* Spec §2 — the principle the whole product rests on. */}
      <section className="border-y border-ink-200 bg-white py-16">
        <div className="altar-container grid gap-10 md:grid-cols-2 md:items-center lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          <div>
            <h2 className={SECTION_HEADING}>One song is two different things.</h2>
            <p className="mt-5 text-lg text-ink-700">
              The <Term termKey="master">master</Term> is the recording. The{' '}
              <Term termKey="composition">song</Term> is the lyrics and melody inside it. They are
              separate property, they can have completely different owners, and they are paid from
              different places.
            </p>
            <p className="mt-4 text-lg text-ink-700">
              Altar.Camp never merges them into one number. Every deal shows master ownership and
              songwriting ownership separately — and every percentage you see is one you agreed to
              before anything was signed.
            </p>
            <Link
              to="/learn"
              className="mt-6 inline-flex items-center gap-1.5 text-lg font-semibold text-ember-700 hover:text-ember-800"
            >
              Learn the terms in five minutes
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-4">
            {OWNERSHIP.map((block) => (
              <div key={block.label} className="rounded-card border border-ink-200 bg-ink-50 p-6">
                <p className="text-sm font-bold uppercase tracking-eyebrow text-ink-600">
                  {block.label}
                </p>
                <div className="mt-4 flex h-4 gap-0.5 overflow-hidden rounded-full">
                  {block.rows.map(([name, share, colour]) => (
                    <div key={name} className={`${colour} h-full`} style={{ width: share }} />
                  ))}
                </div>
                <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5">
                  {block.rows.map(([name, share, colour]) => (
                    <li key={name} className="flex items-center gap-2">
                      <span className={`${colour} size-3 rounded-full`} aria-hidden />
                      <span className="text-ink-800">{name}</span>
                      <span className="font-bold text-ink-950 tabular-nums">{share}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spec §35 — five answers, on the way in rather than after a dispute. */}
      <section className="altar-container py-16">
        <h2 className={SECTION_HEADING}>Five answers before any record goes out.</h2>
        <p className="mt-4 max-w-2xl text-lg text-ink-700">
          If any of these is fuzzy, the record is not ready — no matter how good it sounds.
          Altar.Camp keeps this page current for every song you make with us.
        </p>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {FIVE_ANSWERS.map(([question, answer], index) => (
            <li
              key={question}
              className="rounded-card border border-ink-200 bg-white p-7 shadow-card"
            >
              <span className="block text-4xl leading-none font-extrabold tracking-tight text-ember-600">
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-bold">{question}</h3>
              <p className="mt-2 text-ink-700">{answer}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The closing band runs straight into the footer — see MarketingLayout. */}
      <section data-joins-footer className="bg-ink-950 py-16 text-ink-100">
        <div className="altar-container flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-ink-50 sm:text-4xl">
              We both understand what we are building.
            </h2>
            <p className="mt-3 max-w-xl text-lg text-ink-300">
              Create an account, take the five-minute orientation, and see a real deal summary
              before anyone asks you to sign anything.
            </p>
          </div>
          <ButtonLink to="/signup" size="lg" className="shrink-0 self-start md:self-auto">
            Create your account
            <ArrowRight className="size-5" aria-hidden />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
