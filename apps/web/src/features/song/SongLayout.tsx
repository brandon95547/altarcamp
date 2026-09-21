import { AlertTriangle } from 'lucide-react';
import { NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { Callout } from '../../components/ui/Callout.js';
import { StatusBadge } from '../../components/ui/Badge.js';
import { Spinner } from '../../components/ui/Misc.js';
import { cn } from '../../lib/cn.js';
import { useQuery } from '../../lib/useApi.js';
import type { SongContext, SongDeal } from './types.js';

const STEPS = [
  { to: 'collaborators', label: 'Who is on it' },
  { to: 'songwriting', label: 'Songwriting' },
  { to: 'master', label: 'The recording' },
  { to: 'revenue', label: 'When it earns' },
  { to: 'expenses', label: 'Costs' },
  { to: 'deal', label: 'Your deal' },
];

export function SongLayout() {
  const { songId } = useParams();
  const { data, loading, error, reload } = useQuery<SongDeal>(songId ? `/songs/${songId}` : null);

  if (loading) return <Spinner label="Opening the song" />;
  if (error)
    return (
      <Callout tone="blocker" title="We could not open this song">
        {error.message}
      </Callout>
    );
  if (!data) return null;

  const blockers = data.issues.filter((issue) => issue.severity === 'blocker');

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl sm:text-4xl">{data.song.title}</h1>
          <StatusBadge status={data.song.status} />
          <StatusBadge status={data.song.recording_status} />
        </div>
        <p className="mt-2 text-ink-700">
          Each step below is one decision. Nothing is generated or signed until they all add up.
        </p>
      </header>

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-ink-200 pb-3">
        {STEPS.map((step, index) => (
          <NavLink
            key={step.to}
            to={step.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-ink-950 text-ink-50'
                  : 'text-ink-700 hover:bg-ink-100 hover:text-ink-950',
              )
            }
          >
            <span className="text-xs opacity-70">{index + 1}</span>
            {step.label}
          </NavLink>
        ))}
      </nav>

      {blockers.length > 0 ? (
        <Callout
          tone="blocker"
          className="mb-6"
          title={`${blockers.length} ${blockers.length === 1 ? 'thing' : 'things'} still to settle`}
        >
          <ul className="grid gap-1.5">
            {blockers.map((issue) => (
              <li key={`${issue.code}-${issue.message}`} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      <Outlet context={{ deal: data, reload } satisfies SongContext} />
    </div>
  );
}

export function useSong(): SongContext {
  return useOutletContext<SongContext>();
}
