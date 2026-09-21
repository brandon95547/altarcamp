import { SERVICES, SERVICE_GROUPS, type ServiceDefinition } from '@altar/shared';
import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { Term } from '../../components/ui/Term.js';

const SINGLE_SONG_STEPS = [
  ['Create your account', 'Name, contact, country. Two minutes.'],
  [
    'Tell us what you already have',
    'Existing label, distribution, publishing or management — so nothing collides later.',
  ],
  [
    'Take the orientation',
    'Five short lessons, one question each. This is what makes the rest make sense.',
  ],
  ['Create the song', 'Title, status, who played on it, who wrote it.'],
  [
    'Agree the songwriting split',
    'Everyone named approves their own percentage. It has to total 100%.',
  ],
  [
    'Agree master ownership',
    'Separately. Owning the recording is not the same as owning the song.',
  ],
  ['Agree what happens when it earns', 'Each kind of income gets its own split.'],
  ['Read the deal summary', 'Plain English, with a worked example of the money.'],
  ['Read the agreement', 'Three views: simple, deal sheet, and the legal text itself.'],
  ['Sign', 'Electronically, with a certificate and a hash of exactly what you signed.'],
];

const YEAR_STEPS = [
  ['Everything above', 'The account, the disclosure, the orientation.'],
  [
    'Mission profile',
    'Why you want this, what you play, what you are available for, and what could get in the way.',
  ],
  ['Altar.Camp review', 'We read it properly. Then we talk.'],
  [
    'Terms proposed',
    'A framework: ownership defaults, revenue by category, what is required and what is offered.',
  ],
  ['You review', 'Nothing is signed while you still have a question.'],
  ['Sign, and start', 'Day one of 365. Every song you make still gets its own ownership record.'],
];

export function HowItWorksPage() {
  const grouped = Object.entries(SERVICE_GROUPS).map(([key, label]) => ({
    key,
    label,
    services: SERVICES.filter((service: ServiceDefinition) => service.group === key),
  }));

  return (
    <div className="altar-container py-14">
      <header className="altar-reading">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">
          How it works
        </p>
        <h1 className="text-4xl sm:text-5xl">One decision at a time</h1>
        <p className="mt-4 text-lg text-ink-700">
          Most artists meet a record contract as one long document they are asked to sign at the end
          of a good conversation. Altar.Camp turns it into a sequence of small, clear decisions, and
          shows you the consequences of each one before you make the next.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="text-2xl">If you are doing one song</h2>
          <ol className="mt-5 grid gap-3">
            {SINGLE_SONG_STEPS.map(([title, detail], index) => (
              <li
                key={title}
                className="flex gap-4 rounded-lg border border-ink-200 bg-white px-4 py-3"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ember-100 text-sm font-semibold text-ember-800">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-medium text-ink-950">{title}</span>
                  <span className="block text-sm text-ink-700">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-2xl">If you are doing the year</h2>
          <ol className="mt-5 grid gap-3">
            {YEAR_STEPS.map(([title, detail], index) => (
              <li
                key={title}
                className="flex gap-4 rounded-lg border border-ink-200 bg-white px-4 py-3"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-moss-100 text-sm font-semibold text-moss-800">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-medium text-ink-950">{title}</span>
                  <span className="block text-sm text-ink-700">{detail}</span>
                </span>
              </li>
            ))}
          </ol>

          <Card className="mt-6">
            <CardBody>
              <h3 className="text-lg">A year is a framework, not a claim on everything</h3>
              <p className="mt-2 text-sm text-ink-700">
                The one-year agreement sets how you and Altar.Camp work together. It does not decide
                the ownership of songs in advance and it does not touch your back catalogue. Each
                recording made during the year carries its own <Term termKey="master" /> and{' '}
                <Term termKey="composition">songwriting</Term> record, agreed song by song.
              </p>
            </CardBody>
          </Card>
        </section>
      </div>

      {/* Spec §16 — what the label actually provides, in exchange for what it receives. */}
      <section className="mt-16">
        <h2 className="text-3xl">What Altar.Camp provides</h2>
        <p className="mt-2 max-w-2xl text-ink-700">
          A label relationship should provide real value, not simply take a percentage. What is
          switched on for your deal is what your agreement promises — and it is listed next to what
          Altar.Camp receives, on the same screen.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {grouped.map((group) => (
            <Card key={group.key}>
              <CardBody>
                <h3 className="text-base font-semibold uppercase tracking-wide text-ink-600">
                  {group.label}
                </h3>
                <ul className="mt-3 grid gap-2.5">
                  {group.services.map((service) => (
                    <li key={service.key}>
                      <span className="block font-medium text-ink-950">{service.label}</span>
                      <span className="block text-sm text-ink-700">{service.description}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-14 flex flex-wrap gap-3">
        <ButtonLink to="/signup" size="lg">
          Create your account
          <ArrowRight className="size-5" aria-hidden />
        </ButtonLink>
        <ButtonLink to="/learn" variant="secondary" size="lg">
          Learn the terms first
        </ButtonLink>
      </div>
    </div>
  );
}
