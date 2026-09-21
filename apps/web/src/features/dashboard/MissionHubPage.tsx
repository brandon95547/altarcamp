import { YEAR_ACTIVITIES } from '@altar/shared';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { PageHeader } from '../../components/ui/Misc.js';

/** Spec §24 "MY MISSION". Scheduling itself arrives with phase 2. */
export function MissionHubPage() {
  return (
    <div>
      <PageHeader
        eyebrow="My mission"
        title="Mission"
        description="Events, trips, outreach and assignments appear here once your year is running."
      />

      <Callout tone="info" className="mb-6" title="Scheduling arrives with release management">
        Phase 1 records what your agreement commits you to. Live scheduling, trips and assignments
        follow in the next phase — built on the same commitments, so nothing is entered twice.
      </Callout>

      <Card>
        <CardHeader
          title="What a year can involve"
          description="Your agreement states which of these are required and which are offered."
        />
        <CardBody>
          <ul className="grid gap-2 sm:grid-cols-2">
            {YEAR_ACTIVITIES.map((activity) => (
              <li
                key={activity.key}
                className="rounded-lg border border-ink-200 px-4 py-2.5 text-ink-800"
              >
                {activity.label}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
