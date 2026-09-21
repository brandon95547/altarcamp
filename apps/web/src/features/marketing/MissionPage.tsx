import { YEAR_ACTIVITIES } from '@altar/shared';
import { ButtonLink } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';

/** Spec §13 — what it means to join Altar.Camp for a year, before any contract. */
export function MissionPage() {
  return (
    <div className="altar-container py-14">
      <header className="altar-reading">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ember-700">
          The mission
        </p>
        <h1 className="text-4xl sm:text-5xl">What it means to join Altar.Camp for a year</h1>
        <p className="mt-4 text-lg text-ink-700">
          A year with Altar.Camp is a working commitment in two directions. You bring music, vision
          and your relationship with an audience. Altar.Camp brings infrastructure, strategy,
          resources and execution — and both halves are written down before anyone signs.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <section className="altar-reading">
          <h2 className="text-2xl">What the year involves</h2>
          <p className="mt-2 text-ink-700">
            Your agreement states which of these are requirements and which are opportunities. An
            opportunity you decline is not a breach of anything, and that distinction is in the
            contract, not just in a conversation.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {YEAR_ACTIVITIES.map((activity) => (
              <li
                key={activity.key}
                className="rounded-lg border border-ink-200 bg-white px-4 py-3 text-ink-800"
              >
                {activity.label}
              </li>
            ))}
          </ul>

          <h2 className="mt-12 text-2xl">What happens at the end</h2>
          <p className="mt-2 text-ink-700">
            Nothing renews automatically unless your agreement says so in plain words and you
            approved it. At the end of the year you renew, you graduate, or you continue
            independently — and everything you own stays yours in all three cases. Within thirty
            days you receive a complete copy of your documents, ownership records, registrations and
            accounting history.
          </p>

          <Callout tone="warning" className="mt-8" title="About the word missionary">
            Whether a full-time mission relationship is employment, contracting, volunteer service
            or ministry service depends on the law where you serve. Altar.Camp obtains a written
            classification opinion for each jurisdiction before anyone serves there, and the
            agreement is amended to match it. We would rather say that plainly than let the word do
            quiet work in a contract.
          </Callout>
        </section>

        <aside className="grid gap-4">
          <div className="rounded-card border border-ink-200 bg-white p-6">
            <h2 className="text-lg">Your catalogue before the year</h2>
            <p className="mt-2 text-sm text-ink-700">
              Untouched. The agreement covers work made during the year that Altar.Camp funds,
              produces or releases — and each recording's ownership is agreed for that recording.
            </p>
          </div>
          <div className="rounded-card border border-ink-200 bg-white p-6">
            <h2 className="text-lg">Your songwriting</h2>
            <p className="mt-2 text-sm text-ink-700">
              The default framework leaves songwriting with its writers. Where a deal proposes
              otherwise, you see that number on the screen before you sign, next to what you receive
              for it.
            </p>
          </div>
          <div className="rounded-card border border-ink-200 bg-white p-6">
            <h2 className="text-lg">Your availability</h2>
            <p className="mt-2 text-sm text-ink-700">
              The mission profile asks directly about employment, school, family, contractual and
              immigration commitments. Answering honestly does not disqualify you. It builds a year
              that fits your life.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-14 flex flex-wrap gap-3">
        <ButtonLink to="/signup?path=one_year" size="lg">
          Start my year
        </ButtonLink>
        <ButtonLink to="/how-it-works" variant="secondary" size="lg">
          See the whole process
        </ButtonLink>
      </div>
    </div>
  );
}
