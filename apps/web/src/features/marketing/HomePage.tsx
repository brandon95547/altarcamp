import { ALTAR_PROMISE } from '@altar/shared';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ButtonLink } from '../../components/ui/Button.js';
import { Term } from '../../components/ui/Term.js';

const ONE_SONG = [
  'collaborate on one specific record',
  'release one song together',
  'work with another Altar.Camp artist',
  'test the relationship first',
  'keep the agreement limited to this project',
];

const ONE_YEAR = [
  'commit to the Altar.Camp mission',
  'release music throughout the year',
  'receive label support and funding',
  'participate in missions and outreach',
  'share revenue on an agreed structure',
  'build music and ministry together',
];

export function HomePage() {
  return (
    <>
      {/* Spec §5 — the primary call to action. */}
      <section className="border-b border-ink-800 bg-ink-950 py-20 text-ink-100 sm:py-28">
        <div className="altar-container">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-ember-400">
            Artist signing &amp; mission label
          </p>
          <h1 className="max-w-4xl font-display text-5xl leading-[1.05] text-ink-50 sm:text-7xl">
            Make music.
            <br />
            Join the mission.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-200">
            There are two ways to work with Altar.Camp. Both of them start by making sure you
            understand exactly what you are agreeing to, one decision at a time.
          </p>

          <ul className="mt-10 grid gap-2 font-display text-xl text-ember-300 sm:grid-cols-2 sm:text-2xl">
            {ALTAR_PROMISE.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Spec §5 — two large cards. */}
      <section className="altar-container -mt-12 grid gap-6 pb-16 sm:-mt-16 md:grid-cols-2">
        {[
          {
            eyebrow: 'Option one',
            title: 'One song',
            lead: 'Collaborate with Altar.Camp on one song.',
            points: ONE_SONG,
            cta: 'Start a song',
            href: '/signup?path=single_song',
            accent: 'border-t-ember-500',
          },
          {
            eyebrow: 'Option two',
            title: 'One year',
            lead: 'Join Altar.Camp for a one-year music and mission partnership.',
            points: ONE_YEAR,
            cta: 'Start my year',
            href: '/signup?path=one_year',
            accent: 'border-t-moss-500',
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`flex flex-col rounded-card border border-t-4 border-ink-200 bg-white p-7 shadow-sm ${card.accent}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-600">
              {card.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-4xl">{card.title}</h2>
            <p className="mt-3 text-lg text-ink-800">{card.lead}</p>

            <p className="mt-6 text-sm font-semibold text-ink-900">Good for artists who want to:</p>
            <ul className="mt-3 grid flex-1 gap-2">
              {card.points.map((point) => (
                <li key={point} className="flex gap-2.5 text-ink-700">
                  <Check className="mt-1 size-4 shrink-0 text-moss-600" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <ButtonLink to={card.href} size="lg" className="mt-7 w-full">
              {card.cta}
              <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
          </div>
        ))}
      </section>

      {/* Spec §2 — the principle the whole product rests on. */}
      <section className="border-y border-ink-200 bg-white py-16">
        <div className="altar-container grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl">One song is two different things.</h2>
            <p className="mt-4 text-ink-700">
              The <Term termKey="master">master</Term> is the recording. The{' '}
              <Term termKey="composition">song</Term> is the lyrics and melody inside it. They are
              separate property, they can have completely different owners, and they are paid from
              different places.
            </p>
            <p className="mt-4 text-ink-700">
              Altar.Camp never merges them into one number. Every deal shows master ownership and
              songwriting ownership separately — and every percentage you see is one you agreed to
              before anything was signed.
            </p>
            <Link
              to="/learn"
              className="mt-6 inline-flex items-center gap-1.5 font-medium text-ember-700 hover:text-ember-800"
            >
              Learn the terms in five minutes
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-4">
            {[
              {
                label: 'Master ownership',
                rows: [
                  ['Artist', '50%', 'bg-ember-500'],
                  ['Altar.Camp', '50%', 'bg-ink-600'],
                ],
              },
              {
                label: 'Songwriting ownership',
                rows: [
                  ['Artist', '75%', 'bg-moss-500'],
                  ['Collaborator', '25%', 'bg-dusk-500'],
                ],
              },
            ].map((block) => (
              <div key={block.label} className="rounded-card border border-ink-200 bg-ink-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-600">
                  {block.label}
                </p>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-ink-200">
                  {block.rows.map(([name, share, colour]) => (
                    <div key={name} className={`${colour} h-full`} style={{ width: share }} />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {block.rows.map(([name, share, colour]) => (
                    <li key={name} className="flex items-center gap-2">
                      <span className={`${colour} size-2.5 rounded-sm`} aria-hidden />
                      <span className="text-ink-800">{name}</span>
                      <span className="font-semibold text-ink-950">{share}</span>
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
        <h2 className="text-3xl sm:text-4xl">Five answers before any record goes out</h2>
        <p className="mt-3 max-w-2xl text-ink-700">
          If any of these is fuzzy, the record is not ready — no matter how good it sounds.
          Altar.Camp keeps this page current for every song you make with us.
        </p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Who owns the master?', 'The recording itself, and in what shares.'],
            ['Who owns the song?', 'The writers, and the percentage each one agreed to.'],
            ['Who gets paid?', 'Every revenue category, split separately, totalling 100%.'],
            ['Who collects the money?', 'Distributor, publisher, PRO — named, not assumed.'],
            ['What contracts prove it?', 'Signed documents, hashed and stored in your vault.'],
          ].map(([question, answer], index) => (
            <li key={question} className="rounded-card border border-ink-200 bg-white p-6">
              <span className="font-display text-3xl text-ember-600">{index + 1}</span>
              <h3 className="mt-2 text-lg">{question}</h3>
              <p className="mt-1.5 text-sm text-ink-700">{answer}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-ink-200 bg-ink-950 py-16 text-ink-100">
        <div className="altar-container flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-3xl text-ink-50">
              We both understand what we are building.
            </h2>
            <p className="mt-2 max-w-lg text-ink-300">
              Create an account, take the five-minute orientation, and see a real deal summary
              before anyone asks you to sign anything.
            </p>
          </div>
          <ButtonLink to="/signup" size="lg">
            Create your account
            <ArrowRight className="size-5" aria-hidden />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
