import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { StatusBadge } from '../../components/ui/Badge.js';
import { titleCase } from '../../lib/format.js';
import { useQuery } from '../../lib/useApi.js';

interface Overview {
  artists: Record<string, number>;
  releases: Record<string, number>;
  contracts: Record<string, number>;
  rights: Record<string, number>;
  unbalanced: { id: string; title: string; artist_name: string; issue: string }[];
}

interface ArtistRow {
  id: string;
  artist_name: string;
  legal_name: string;
  email: string;
  deal_path: string | null;
  application_status: string | null;
  onboarding_step: string;
  song_count: number;
  signed_count: number;
  has_conflict: boolean;
}

/** Spec §26 — the admin landing page: counts that are links to work queues. */
export function AdminOverviewPage() {
  const overview = useQuery<Overview>('/admin/overview');
  const artists = useQuery<{ artists: ArtistRow[] }>('/admin/artists');

  if (overview.loading) return <Spinner />;
  if (overview.error) return <Callout tone="blocker">{overview.error.message}</Callout>;

  const panels = [
    { title: 'Artists', data: overview.data?.artists ?? {}, to: '/admin' },
    { title: 'Music', data: overview.data?.releases ?? {}, to: '/admin/music' },
    { title: 'Contracts', data: overview.data?.contracts ?? {}, to: '/admin/agreements' },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Altar.Camp staff"
        title="Overview"
        description="Where every artist, song and agreement stands right now."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {panels.map((panel) => (
          <Card key={panel.title}>
            <CardHeader
              title={panel.title}
              action={
                <Link
                  to={panel.to}
                  className="text-sm font-medium text-ember-700 hover:text-ember-800"
                >
                  Open
                </Link>
              }
            />
            <CardBody>
              <dl className="grid gap-1.5">
                {Object.entries(panel.data).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-3">
                    <dt className="text-sm text-ink-700">{titleCase(key)}</dt>
                    <dd className="text-xl font-semibold text-ink-950 tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>

      {(overview.data?.rights?.['artists_with_open_conflicts'] ?? 0) > 0 ? (
        <Callout
          tone="warning"
          title={`${overview.data?.rights['artists_with_open_conflicts']} artist(s) have undisclosed-rights conflicts awaiting review`}
          action={
            <Link
              to="/admin/rights"
              className="inline-flex items-center gap-1.5 font-medium text-ember-800"
            >
              Review them
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        >
          An agreement cannot be generated for these artists until the conflict is reviewed and
          cleared.
        </Callout>
      ) : null}

      {overview.data && overview.data.unbalanced.length > 0 ? (
        <Card>
          <CardHeader
            title="Songs whose splits do not add up"
            description="The queue that prevents a dispute two years from now."
          />
          <CardBody>
            <ul className="grid gap-2">
              {overview.data.unbalanced.map((song) => (
                <li
                  key={song.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-clay-200 bg-clay-50 px-4 py-3"
                >
                  <AlertTriangle className="size-4 shrink-0 text-clay-600" aria-hidden />
                  <span className="font-medium text-ink-950">{song.title}</span>
                  <span className="text-sm text-ink-700">{song.artist_name}</span>
                  <span className="ml-auto text-sm text-clay-800">{song.issue}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Artists"
          description="Applicants, single-song collaborators and year artists."
        />
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-600">
              <tr>
                <th className="px-5 py-3">Artist</th>
                <th className="px-5 py-3">Path</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Songs</th>
                <th className="px-5 py-3">Signed</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {artists.data?.artists.map((artist) => (
                <tr key={artist.id} className="border-t border-ink-200">
                  <td className="px-5 py-3">
                    <Link
                      to={`/admin/artists/${artist.id}`}
                      className="font-medium text-ink-950 hover:text-ember-700"
                    >
                      {artist.artist_name}
                    </Link>
                    <span className="block text-xs text-ink-600">{artist.email}</span>
                  </td>
                  <td className="px-5 py-3">
                    {artist.deal_path ? titleCase(artist.deal_path) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={artist.application_status ?? artist.onboarding_step} />
                    {artist.has_conflict ? (
                      <span className="ml-2 text-xs font-semibold text-clay-700">
                        Rights conflict
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 tabular-nums">{artist.song_count}</td>
                  <td className="px-5 py-3 tabular-nums">{artist.signed_count}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to={`/admin/artists/${artist.id}`}
                      className="text-ember-700 hover:text-ember-800"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
