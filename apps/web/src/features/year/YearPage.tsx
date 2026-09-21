import { SERVICES, YEAR_ACTIVITIES, type ApplicationStatus } from '@altar/shared';
import { ArrowRight, Check } from 'lucide-react';
import { StatusBadge } from '../../components/ui/Badge.js';
import { ButtonLink } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { cn } from '../../lib/cn.js';
import { useQuery } from '../../lib/useApi.js';

const STAGES: { key: ApplicationStatus; label: string; detail: string }[] = [
  { key: 'started', label: 'Application started', detail: 'You chose the one-year path.' },
  {
    key: 'mission_application_complete',
    label: 'Mission profile submitted',
    detail: 'Tell us who you are and what you are available for.',
  },
  { key: 'altar_review', label: 'Altar.Camp review', detail: 'We read it properly.' },
  { key: 'interview', label: 'Interview', detail: 'A conversation, not a test.' },
  {
    key: 'terms_proposed',
    label: 'Terms proposed',
    detail: 'Ownership, revenue and commitments, written down.',
  },
  {
    key: 'artist_reviewing',
    label: 'You review',
    detail: 'Nothing is signed while you still have a question.',
  },
  {
    key: 'agreement_signed',
    label: 'Agreement signed',
    detail: 'By both of you, with a certificate.',
  },
  { key: 'active', label: 'Active Altar.Camp artist', detail: 'Day one of the year.' },
];

interface Application {
  status: ApplicationStatus;
  submitted_at: string | null;
  review_notes: string | null;
  answers: { question_key: string; value: string }[];
}

/** Spec §13, §15, §16, §27 — what the year means, and where the artist is in the process. */
export function YearPage() {
  const { data, loading } = useQuery<{ application: Application | null }>(
    '/artists/me/mission-application',
  );
  const status = data?.application?.status ?? 'started';
  const currentIndex = Math.max(
    0,
    STAGES.findIndex((stage) => stage.key === status),
  );

  if (loading) return <Spinner />;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="One year"
        title="What it means to join Altar.Camp for a year"
        description="A working commitment in two directions: you bring music, vision and audience; Altar.Camp brings infrastructure, strategy, resources and execution."
        actions={
          status === 'started' ? (
            <ButtonLink to="/year/application">
              Start my mission profile
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          ) : (
            <ButtonLink to="/year/application" variant="secondary">
              Review my answers
            </ButtonLink>
          )
        }
      />

      <Card>
        <CardHeader title="Where you are" action={<StatusBadge status={status} />} />
        <CardBody>
          <ol className="grid gap-3">
            {STAGES.map((stage, index) => {
              const done = index < currentIndex;
              const current = index === currentIndex;
              return (
                <li key={stage.key} className="flex gap-3">
                  <span
                    className={cn(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      done && 'bg-moss-600 text-white',
                      current && 'bg-ember-600 text-white',
                      !done && !current && 'bg-ink-200 text-ink-700',
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
                  </span>
                  <span>
                    <span
                      className={cn('block font-medium', current ? 'text-ink-950' : 'text-ink-800')}
                    >
                      {stage.label}
                    </span>
                    <span className="block text-sm text-ink-600">{stage.detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      {data?.application?.review_notes ? (
        <Callout tone="info" title="A note from Altar.Camp">
          {data.application.review_notes}
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="What the year involves"
            description="Your agreement says which are required and which are offered."
          />
          <CardBody>
            <ul className="grid gap-2 sm:grid-cols-2">
              {YEAR_ACTIVITIES.map((activity) => (
                <li
                  key={activity.key}
                  className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
                >
                  {activity.label}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="What Altar.Camp provides"
            description="Listed in your agreement, not just promised in a meeting."
          />
          <CardBody>
            <ul className="grid gap-1.5 text-sm text-ink-800 sm:grid-cols-2">
              {SERVICES.filter((service) => service.oneYearDefault).map((service) => (
                <li key={service.key} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-moss-600" aria-hidden />
                  {service.label}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Callout tone="warning" title="A year is a framework, not a claim on everything">
        The one-year agreement sets how you and Altar.Camp work together. It does not touch your
        back catalogue, and it does not decide the ownership of songs in advance — every recording
        made during the year carries its own master and songwriting record, agreed song by song.
      </Callout>
    </div>
  );
}
