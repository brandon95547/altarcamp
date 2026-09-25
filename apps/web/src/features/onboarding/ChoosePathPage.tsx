import { Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Callout } from '../../components/ui/Callout.js';
import { Stepper } from '../../components/ui/Misc.js';
import { api } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { useMutation } from '../../lib/useApi.js';
import { onboardingSteps } from './steps.js';

const OPTIONS = [
  {
    path: 'single_song' as const,
    title: 'One song',
    lead: 'Collaborate with Altar.Camp on one specific recording.',
    points: [
      'Covers this recording only',
      'Your catalogue is untouched',
      'Ownership and revenue agreed per song',
      'Nothing renews, nothing carries over',
    ],
    accent: 'border-ember-500 bg-ember-50',
  },
  {
    path: 'one_year' as const,
    title: 'One year',
    lead: 'Join Altar.Camp as an artist and missionary for a year.',
    points: [
      'A framework for the whole year',
      'Label support, funding and services',
      'Mission and outreach commitments',
      'Each recording still gets its own ownership record',
    ],
    accent: 'border-moss-500 bg-moss-50',
  },
];

/** Spec §5, gated on the orientation being complete. */
export function ChoosePathPage() {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<'single_song' | 'one_year' | null>(null);

  const save = useMutation(async (path: 'single_song' | 'one_year') => {
    await api.post('/artists/me/path', { path });
    return path;
  });

  const submit = async () => {
    if (!choice) return;
    const result = await save.run(choice);
    if (result === 'single_song') navigate('/songs/new');
    else if (result === 'one_year') navigate('/year');
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Stepper steps={onboardingSteps('choose_path')} currentIndex={4} />
      <h1 className="text-3xl sm:text-4xl">How do you want to work with Altar.Camp?</h1>
      <p className="mt-2 text-ink-700">
        You can change this later — starting with one song and moving to a year is the most common
        path.
      </p>

      {save.error ? (
        <Callout tone="blocker" className="mt-5">
          {save.error.message}
        </Callout>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {OPTIONS.map((option) => {
          const selected = choice === option.path;
          return (
            <button
              key={option.path}
              type="button"
              onClick={() => setChoice(option.path)}
              aria-pressed={selected}
              className={cn(
                'flex h-full flex-col rounded-card border-2 p-6 text-left transition-colors',
                selected ? option.accent : 'border-ink-200 bg-white hover:border-ink-300',
              )}
            >
              <span className="flex items-center justify-between">
                <span className="text-3xl font-bold tracking-tight text-ink-950">
                  {option.title}
                </span>
                {selected ? <Check className="size-6 text-moss-600" aria-hidden /> : null}
              </span>
              <span className="mt-2 block text-ink-800">{option.lead}</span>
              <ul className="mt-4 grid flex-1 gap-2 text-sm text-ink-700">
                {option.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <Button className="mt-7" size="lg" disabled={!choice || save.pending} onClick={submit}>
        {save.pending ? 'Saving…' : choice === 'one_year' ? 'Start my year' : 'Start a song'}
      </Button>
    </div>
  );
}
