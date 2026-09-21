import { Music, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge.js';
import { ButtonLink } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Card } from '../../components/ui/Card.js';
import { EmptyState, PageHeader, Spinner } from '../../components/ui/Misc.js';
import { formatDate } from '../../lib/format.js';
import { useQuery } from '../../lib/useApi.js';
import type { SongRecord } from './types.js';

export function SongListPage() {
  const { data, loading, error } = useQuery<{ songs: SongRecord[] }>('/songs');

  return (
    <div>
      <PageHeader
        eyebrow="My music"
        title="Your songs"
        description="Every recording you are making with Altar.Camp, and exactly where each one has got to."
        actions={
          <ButtonLink to="/songs/new">
            <Plus className="size-4" aria-hidden />
            New song
          </ButtonLink>
        }
      />

      {loading ? <Spinner /> : null}
      {error ? <Callout tone="blocker">{error.message}</Callout> : null}

      {data && data.songs.length === 0 ? (
        <EmptyState
          title="No songs yet"
          description="Start with the working title. You can change everything else as the record comes together."
          action={
            <ButtonLink to="/songs/new">
              <Plus className="size-4" aria-hidden />
              Create your first song
            </ButtonLink>
          }
        />
      ) : null}

      <ul className="grid gap-3">
        {data?.songs.map((song) => (
          <li key={song.id}>
            <Card className="transition-colors hover:border-ink-300">
              <Link
                to={`/songs/${song.id}/collaborators`}
                className="flex flex-wrap items-center gap-4 px-5 py-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                  <Music className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-medium text-ink-950">{song.title}</span>
                  <span className="block text-sm text-ink-600">
                    Created {formatDate(song.created_at)}
                    {song.expected_release_date
                      ? ` · Target release ${formatDate(song.expected_release_date)}`
                      : ''}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <StatusBadge status={song.recording_status} />
                  <StatusBadge status={song.status} />
                </span>
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
