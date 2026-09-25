import {
  APPLICATION_STATUSES,
  MISSION_QUESTIONS,
  percentToBps,
  revenueCategoriesFor,
  YEAR_ACTIVITIES,
  type ActivityCommitment,
  type RevenueCategory,
} from '@altar/shared';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge.js';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { Field, MoneyInput, PercentInput, Select, TextInput } from '../../components/ui/Field.js';
import { DefinitionRow, PageHeader, Spinner } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { formatDate, titleCase } from '../../lib/format.js';
import { useMutation, useQuery } from '../../lib/useApi.js';

interface ArtistDetail {
  artist: Record<string, unknown> & {
    id: string;
    artist_name: string;
    legal_name: string;
    email: string;
  };
  profile: Record<string, string | null> | null;
  rights: {
    question_key: string;
    answer: boolean;
    detail: string | null;
    has_conflict: boolean;
    reviewed_at: string | null;
  }[];
  application: { status: string; submitted_at: string | null; review_notes: string | null } | null;
  answers: { question_key: string; value: string }[];
  songs: { id: string; title: string; status: string }[];
  agreements: { id: string; type: string; status: string; title: string }[];
  commitments: { id: string; start_date: string; end_date: string; status: string }[];
}

/** Spec §27 — the staff view of one artist, and the place where year terms are proposed. */
export function AdminArtistPage() {
  const { artistId } = useParams();
  const { data, loading, reload } = useQuery<ArtistDetail>(
    artistId ? `/admin/artists/${artistId}` : null,
  );

  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 364 * 86_400_000).toISOString().slice(0, 10),
    masterArtist: 50,
    compositionArtist: 100,
    investmentCap: '25000',
  });
  const [revenue, setRevenue] = useState<Record<string, number>>({
    master_streaming: 50,
    publishing: 100,
    merchandise: 70,
    live_performance: 80,
  });
  const [activities, setActivities] = useState<Record<string, ActivityCommitment>>({
    songwriting: 'required',
    recording: 'required',
    live_events: 'required',
    mission_trips: 'opportunity',
    content_creation: 'opportunity',
  });

  const setStatusMutation = useMutation(async () =>
    api.post(`/admin/artists/${artistId}/application-status`, {
      status,
      notes: notes || undefined,
    }),
  );

  const reviewRights = useMutation(async (questionKey: string) =>
    api.post(`/admin/artists/${artistId}/rights/${questionKey}/review`, {
      notes: notes || 'Reviewed — no conflict for Altar.Camp releases.',
    }),
  );

  const propose = useMutation(async () => {
    const result = await api.post<{ commitmentId: string }>(
      `/admin/artists/${artistId}/propose-year`,
      {
        startDate: terms.startDate,
        endDate: terms.endDate,
        autoRenew: false,
        masterArtistBps: percentToBps(terms.masterArtist),
        masterAltarBps: percentToBps(100 - terms.masterArtist),
        compositionArtistBps: percentToBps(terms.compositionArtist),
        compositionAltarBps: percentToBps(100 - terms.compositionArtist),
        revenue: Object.entries(revenue).map(([category, artistShare]) => ({
          category: category as RevenueCategory,
          artistBps: percentToBps(artistShare),
          altarBps: percentToBps(100 - artistShare),
        })),
        activities: Object.entries(activities).map(([key, level]) => ({ key, level })),
        investmentCapMinor: terms.investmentCap
          ? Math.round(Number(terms.investmentCap) * 100)
          : null,
        recoupedFrom: 'master_revenue',
      },
    );
    return api.post<{ agreementId: string }>('/agreements', {
      type: 'one_year_altar',
      commitmentId: result.commitmentId,
    });
  });

  if (loading) return <Spinner />;
  if (!data) return null;

  const openConflicts = data.rights.filter((right) => right.has_conflict && !right.reviewed_at);

  return (
    <div className="grid gap-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-700 hover:text-ink-950"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All artists
      </Link>

      <PageHeader
        eyebrow={
          data.artist['deal_path'] ? titleCase(String(data.artist['deal_path'])) : 'Applicant'
        }
        title={data.artist.artist_name}
        description={`${data.artist.legal_name} · ${data.artist.email}`}
        actions={
          <StatusBadge
            status={String(data.application?.status ?? data.artist['onboarding_step'])}
          />
        }
      />

      {openConflicts.length > 0 ? (
        <Callout tone="warning" title="Existing commitments need review">
          <ul className="mt-2 grid gap-2">
            {openConflicts.map((right) => (
              <li key={right.question_key} className="flex flex-wrap items-center gap-3">
                <span className="font-medium">{titleCase(right.question_key)}</span>
                {right.detail ? <span className="text-sm">{right.detail}</span> : null}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await reviewRights.run(right.question_key);
                    reload();
                  }}
                >
                  Mark reviewed
                </Button>
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <CardBody>
            <dl>
              <DefinitionRow label="Genre" value={data.profile?.['genre'] ?? '—'} />
              <DefinitionRow label="PRO" value={data.profile?.['pro_affiliation'] ?? '—'} />
              <DefinitionRow
                label="Distributor"
                value={data.profile?.['current_distributor'] ?? '—'}
              />
              <DefinitionRow label="Label" value={data.profile?.['current_label'] ?? '—'} />
              <DefinitionRow label="Publisher" value={data.profile?.['current_publisher'] ?? '—'} />
              <DefinitionRow label="Bio" value={data.profile?.['bio'] ?? '—'} />
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Mission application"
            description={
              data.application?.submitted_at
                ? `Submitted ${formatDate(data.application.submitted_at)}`
                : 'Not submitted'
            }
          />
          <CardBody>
            {data.answers.length === 0 ? (
              <p className="text-ink-700">No answers yet.</p>
            ) : (
              <dl>
                {MISSION_QUESTIONS.map((question) => {
                  const answer = data.answers.find((entry) => entry.question_key === question.key);
                  if (!answer) return null;
                  return (
                    <DefinitionRow
                      key={question.key}
                      label={question.question}
                      value={answer.value}
                    />
                  );
                })}
              </dl>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Move the application" description="Spec §27 workflow." />
        <CardBody className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="New status">
            {(props) => (
              <Select {...props} value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Choose…</option>
                {APPLICATION_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {titleCase(option)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Note to the artist">
            {(props) => (
              <TextInput
                {...props}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            )}
          </Field>
          <Button
            disabled={!status || setStatusMutation.pending}
            onClick={async () => {
              await setStatusMutation.run(undefined);
              reload();
            }}
          >
            Update
          </Button>
        </CardBody>
      </Card>

      {/* Spec §18, §19 — propose the year's framework. */}
      <Card>
        <CardHeader
          title="Propose one-year terms"
          description="This creates the framework, then generates the agreement for the artist to read and sign."
        />
        <CardBody className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Start date">
              {(props) => (
                <TextInput
                  {...props}
                  type="date"
                  value={terms.startDate}
                  onChange={(event) => setTerms({ ...terms, startDate: event.target.value })}
                />
              )}
            </Field>
            <Field label="End date">
              {(props) => (
                <TextInput
                  {...props}
                  type="date"
                  value={terms.endDate}
                  onChange={(event) => setTerms({ ...terms, endDate: event.target.value })}
                />
              )}
            </Field>
            <Field label="Artist master share %">
              {(props) => (
                <PercentInput
                  {...props}
                  value={terms.masterArtist}
                  onChange={(event) =>
                    setTerms({ ...terms, masterArtist: Number(event.target.value) })
                  }
                />
              )}
            </Field>
            <Field label="Artist songwriting share %">
              {(props) => (
                <PercentInput
                  {...props}
                  value={terms.compositionArtist}
                  onChange={(event) =>
                    setTerms({ ...terms, compositionArtist: Number(event.target.value) })
                  }
                />
              )}
            </Field>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">
              Artist share by revenue category
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {revenueCategoriesFor('one_year')
                .filter((definition) => definition.key in revenue)
                .map((definition) => (
                  <label key={definition.key} className="grid gap-1">
                    <span className="text-sm text-ink-700">{definition.label}</span>
                    <PercentInput
                      value={revenue[definition.key] ?? 50}
                      onChange={(event) =>
                        setRevenue({ ...revenue, [definition.key]: Number(event.target.value) })
                      }
                    />
                  </label>
                ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">Activities</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {YEAR_ACTIVITIES.map((activity) => (
                <label
                  key={activity.key}
                  className="flex items-center justify-between gap-2 rounded-lg border border-ink-200 px-3 py-2"
                >
                  <span className="text-sm text-ink-800">{activity.label}</span>
                  <Select
                    className="w-36"
                    value={activities[activity.key] ?? 'not_included'}
                    onChange={(event) =>
                      setActivities({
                        ...activities,
                        [activity.key]: event.target.value as ActivityCommitment,
                      })
                    }
                  >
                    <option value="required">Required</option>
                    <option value="opportunity">Opportunity</option>
                    <option value="not_included">Not included</option>
                  </Select>
                </label>
              ))}
            </div>
          </div>

          <Field label="Investment cap (USD)">
            {(props) => (
              <MoneyInput
                {...props}
                value={terms.investmentCap}
                onChange={(event) => setTerms({ ...terms, investmentCap: event.target.value })}
              />
            )}
          </Field>

          {propose.error ? <Callout tone="blocker">{propose.error.message}</Callout> : null}

          <div>
            <Button
              size="lg"
              disabled={propose.pending}
              onClick={async () => {
                const result = await propose.run(undefined);
                if (result) reload();
              }}
            >
              {propose.pending ? 'Proposing…' : 'Propose terms and generate the agreement'}
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Songs" />
          <CardBody>
            <ul className="grid gap-2">
              {data.songs.map((song) => (
                <li key={song.id} className="flex items-center justify-between gap-3">
                  <span className="text-ink-900">{song.title}</span>
                  <StatusBadge status={song.status} />
                </li>
              ))}
              {data.songs.length === 0 ? <li className="text-ink-600">No songs yet.</li> : null}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Agreements" />
          <CardBody>
            <ul className="grid gap-2">
              {data.agreements.map((agreement) => (
                <li key={agreement.id} className="flex items-center justify-between gap-3">
                  <Link
                    to={`/agreements/${agreement.id}`}
                    className="text-ink-900 hover:text-ember-700"
                  >
                    {agreement.title}
                  </Link>
                  <StatusBadge status={agreement.status} />
                </li>
              ))}
              {data.agreements.length === 0 ? (
                <li className="text-ink-600">Nothing generated yet.</li>
              ) : null}
            </ul>
          </CardBody>
        </Card>
      </div>

      {data.commitments.length > 0 ? (
        <Card>
          <CardHeader title="Commitments" />
          <CardBody>
            <ul className="grid gap-2">
              {data.commitments.map((commitment) => (
                <li
                  key={commitment.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <span className="text-ink-900">
                    {formatDate(commitment.start_date)} → {formatDate(commitment.end_date)}
                  </span>
                  <StatusBadge status={commitment.status} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {setStatusMutation.error ? (
        <Callout tone="blocker">{setStatusMutation.error.message}</Callout>
      ) : null}
    </div>
  );
}
