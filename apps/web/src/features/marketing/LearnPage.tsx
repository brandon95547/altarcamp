import { EDUCATION_LESSONS, GLOSSARY } from '@altar/shared';
import { useState } from 'react';
import { ButtonLink } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody } from '../../components/ui/Card.js';

/** Spec §7 and §43 — public version of the orientation content and the glossary. */
export function LearnPage() {
  const [query, setQuery] = useState('');
  const filtered = GLOSSARY.filter((entry) =>
    `${entry.term} ${entry.short} ${entry.long}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="altar-container py-14">
      <header className="altar-reading">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">
          Learn the terms
        </p>
        <h1 className="text-4xl sm:text-5xl">The words the industry uses, in plain English</h1>
        <p className="mt-4 text-lg text-ink-700">
          You can work with a label, a distributor, a publisher and a PRO all at the same time. That
          is normal. What causes damage is not knowing which one controls which right — so here is
          the whole vocabulary, before anyone asks you to agree to anything.
        </p>
      </header>

      <section className="mt-12">
        <h2 className="text-2xl">The five-minute orientation</h2>
        <p className="mt-2 text-ink-700">
          Every Altar.Camp artist completes these before entering a single percentage.
        </p>
        <ol className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {EDUCATION_LESSONS.map((lesson, index) => (
            <li key={lesson.slug}>
              <Card className="h-full">
                <CardBody>
                  <span className="font-display text-3xl text-ember-600">{index + 1}</span>
                  <h3 className="mt-1 text-lg">{lesson.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-700">{lesson.summary}</p>
                </CardBody>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl">Glossary</h2>
            <p className="mt-1 text-ink-700">
              {GLOSSARY.length} terms, each with the mistake it usually causes.
            </p>
          </div>
          <label className="w-full max-w-xs">
            <span className="sr-only">Search the glossary</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search — master, recoupment, sync…"
              className="w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 focus:border-ember-600 focus:outline-none focus:ring-2 focus:ring-ember-600/25"
            />
          </label>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filtered.map((entry) => (
            <Card key={entry.key} id={entry.key}>
              <CardBody>
                <h3 className="text-lg">{entry.term}</h3>
                <p className="mt-1 font-medium text-ink-800">{entry.short}</p>
                <p className="mt-2 text-sm text-ink-700">{entry.long}</p>
                {entry.gotcha ? (
                  <p className="mt-3 border-l-2 border-ember-500 bg-ember-50 px-3 py-2 text-sm text-ink-800">
                    <span className="font-semibold">Watch out: </span>
                    {entry.gotcha}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Callout tone="info" className="mt-6">
            Nothing matches “{query}”. Try a different word — or ask us, and we will add it.
          </Callout>
        ) : null}
      </section>

      <div className="mt-12">
        <ButtonLink to="/signup" size="lg">
          Start with Altar.Camp
        </ButtonLink>
      </div>
    </div>
  );
}
