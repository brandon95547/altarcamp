import type { DealPath } from '@altar/shared';
import { ArrowRight, CircleAlert, Music, ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge.js';
import { ButtonLink } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { EmptyState, Spinner } from '../../components/ui/Misc.js';
import { useAuth } from '../../lib/auth.js';
import { cn } from '../../lib/cn.js';
import { formatDate } from '../../lib/format.js';
import { useQuery } from '../../lib/useApi.js';
import { ONBOARDING_ROUTE } from '../onboarding/steps.js';

interface Dashboard {
  artist: {
    name: string;
    path: DealPath | null;
    onboardingStep: string;
    applicationStatus: string | null;
  };
  year: {
    start_date: string;
    end_date: string;
    status: string;
    dayOfYear: number;
    totalDays: number;
  } | null;
  actions: {
    id: string;
    label: string;
    detail: string;
    href: string;
    severity: 'blocker' | 'todo';
  }[];
  songs: { id: string; title: string; status: string; recording_status: string }[];
  agreements: { id: string; title: string; status: string; signed_by_me: boolean }[];
  documentCount: number;
  money: { available: boolean; message: string };
  mission: { available: boolean; message: string };
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Spec §24. */
export function DashboardPage() {
  const { user } = useAuth();
  const { data, loading, error } = useQuery<Dashboard>('/artists/me/dashboard');

  if (loading) return <Spinner label="Opening your dashboard" />;
  if (error) return <Callout tone="blocker">{error.message}</Callout>;
  if (!data) return null;

  const onboardingIncomplete = data.artist.onboardingStep !== 'choose_path';

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl sm:text-4xl">
          {greeting()}, {data.artist.name || user?.legalName}
        </h1>
        {data.year ? (
          <p className="mt-2 text-lg text-ink-700">
            Day {data.year.dayOfYear} of {data.year.totalDays} — your year runs to{' '}
            {formatDate(data.year.end_date)}.
          </p>
        ) : data.artist.path === 'single_song' ? (
          <p className="mt-2 text-lg text-ink-700">
            {data.songs.length > 0
              ? `Your collaboration: ${data.songs[0]?.title}.`
              : 'Start a song whenever you are ready.'}
          </p>
        ) : null}
      </header>

      {onboardingIncomplete ? (
        <Callout
          tone="warning"
          title="Finish setting up"
          action={
            <ButtonLink
              to={
                ONBOARDING_ROUTE[data.artist.onboardingStep as keyof typeof ONBOARDING_ROUTE] ??
                '/onboarding/profile'
              }
              size="sm"
            >
              Continue
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          }
        >
          A few steps remain before you can choose how to work with Altar.Camp.
        </Callout>
      ) : null}

      {data.year ? (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl">My year</h2>
              <StatusBadge status={data.year.status} />
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-200">
              <div
                className="h-full rounded-full bg-moss-500"
                style={{
                  width: `${Math.min(100, (data.year.dayOfYear / data.year.totalDays) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-ink-700">
              {formatDate(data.year.start_date)} → {formatDate(data.year.end_date)}
            </p>
          </CardBody>
        </Card>
      ) : null}

      {/* Action required — spec §24. */}
      <Card>
        <CardHeader
          title="Action required"
          description="Everything standing between you and a finished, defensible deal."
        />
        <CardBody>
          {data.actions.length === 0 ? (
            <p className="text-ink-700">Nothing needs you right now.</p>
          ) : (
            <ul className="grid gap-2">
              {data.actions.map((action) => (
                <li key={action.id}>
                  <Link
                    to={action.href}
                    className={cn(
                      'flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
                      action.severity === 'blocker'
                        ? 'border-clay-200 bg-clay-50 hover:border-clay-300'
                        : 'border-ink-200 bg-white hover:border-ink-300',
                    )}
                  >
                    <CircleAlert
                      className={cn(
                        'mt-0.5 size-5 shrink-0',
                        action.severity === 'blocker' ? 'text-clay-600' : 'text-ember-600',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink-950">{action.label}</span>
                      <span className="block text-sm text-ink-700">{action.detail}</span>
                    </span>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-ink-500" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="My releases"
            action={
              <ButtonLink to="/songs" variant="secondary" size="sm">
                All music
              </ButtonLink>
            }
          />
          <CardBody>
            {data.songs.length === 0 ? (
              <EmptyState
                title="No songs yet"
                action={<ButtonLink to="/songs/new">Start a song</ButtonLink>}
              />
            ) : (
              <ul className="grid gap-2">
                {data.songs.slice(0, 5).map((song) => (
                  <li key={song.id}>
                    <Link
                      to={`/songs/${song.id}/collaborators`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50"
                    >
                      <Music className="size-4 shrink-0 text-ink-500" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-ink-950">{song.title}</span>
                      <StatusBadge status={song.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="My agreements"
            action={
              <ButtonLink to="/deal" variant="secondary" size="sm">
                My deal
              </ButtonLink>
            }
          />
          <CardBody>
            {data.agreements.length === 0 ? (
              <p className="text-ink-700">Nothing generated yet.</p>
            ) : (
              <ul className="grid gap-2">
                {data.agreements.slice(0, 5).map((agreement) => (
                  <li key={agreement.id}>
                    <Link
                      to={`/agreements/${agreement.id}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-ink-50"
                    >
                      <ScrollText className="size-4 shrink-0 text-ink-500" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-ink-950">
                        {agreement.title}
                      </span>
                      <StatusBadge status={agreement.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="My money" />
          <CardBody>
            <p className="text-sm text-ink-700">{data.money.message}</p>
            <ButtonLink to="/money" variant="secondary" size="sm" className="mt-3">
              See how it will be calculated
            </ButtonLink>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="My mission" />
          <CardBody>
            <p className="text-sm text-ink-700">{data.mission.message}</p>
            <ButtonLink to="/mission-hub" variant="secondary" size="sm" className="mt-3">
              Open
            </ButtonLink>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Documents" />
          <CardBody>
            <p className="text-sm text-ink-700">
              {data.documentCount} {data.documentCount === 1 ? 'document' : 'documents'} in your
              vault. Signed agreements land here automatically and stay there.
            </p>
            <ButtonLink to="/documents" variant="secondary" size="sm" className="mt-3">
              Open the vault
            </ButtonLink>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
