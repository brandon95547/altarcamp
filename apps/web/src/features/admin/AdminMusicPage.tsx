import { Link } from 'react-router-dom';
import { Callout } from '../../components/ui/Callout.js';
import { Card, CardBody, CardHeader } from '../../components/ui/Card.js';
import { PageHeader, Spinner } from '../../components/ui/Misc.js';
import { useQuery } from '../../lib/useApi.js';

interface Overview {
  releases: Record<string, number>;
  unbalanced: { id: string; title: string; artist_name: string; issue: string }[];
}

/** Spec §26 "MUSIC" — phase 1 shows rights readiness; release management follows in phase 2. */
export function AdminMusicPage() {
  const { data, loading } = useQuery<Overview>('/admin/overview');

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Music"
        title="Songs and rights readiness"
        description="Release management, metadata and distribution arrive in phase 2. What phase 1 tracks is whether the rights behind each song actually hold together."
      />

      {loading ? <Spinner /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(data?.releases ?? {}).map(([key, value]) => (
          <Card key={key}>
            <CardBody>
              <p className="text-sm text-ink-600">{key.replace(/_/g, ' ')}</p>
              <p className="text-3xl font-bold tracking-tight text-ink-950 tabular-nums">{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Rights incomplete"
          description="These cannot become agreements until they balance."
        />
        <CardBody>
          {data && data.unbalanced.length === 0 ? (
            <Callout tone="success">Every song's ownership adds up to exactly 100%.</Callout>
          ) : (
            <ul className="grid gap-2">
              {data?.unbalanced.map((song) => (
                <li
                  key={song.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 px-4 py-3"
                >
                  <span className="font-medium text-ink-950">{song.title}</span>
                  <span className="text-sm text-ink-600">{song.artist_name}</span>
                  <span className="ml-auto text-sm text-clay-700">{song.issue}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <p className="text-sm text-ink-600">
        Looking for a specific artist?{' '}
        <Link to="/admin" className="font-medium text-ember-700 hover:text-ember-800">
          Open the artist list
        </Link>
        .
      </p>
    </div>
  );
}
