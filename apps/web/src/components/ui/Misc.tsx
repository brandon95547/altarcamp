import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-ember-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-ink-700">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-ink-600">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
      <h3 className="text-lg">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-ink-600">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function DefinitionRow({
  label,
  value,
  note,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-ink-200 py-3 last:border-0 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
      <dt className="text-sm font-semibold uppercase tracking-wide text-ink-600">{label}</dt>
      <dd>
        <div className="text-ink-950">{value}</div>
        {note ? <p className="mt-1 text-sm text-ink-600">{note}</p> : null}
      </dd>
    </div>
  );
}

/** Progress through a multi-step flow — used by onboarding and the song builder. */
export function Stepper({
  steps,
  currentIndex,
}: {
  steps: { label: string; complete?: boolean }[];
  currentIndex: number;
}) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
      {steps.map((step, index) => {
        const state = step.complete ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
        return (
          <li key={step.label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                state === 'complete' && 'bg-moss-600 text-white',
                state === 'current' && 'bg-ember-600 text-white',
                state === 'upcoming' && 'bg-ink-200 text-ink-700',
              )}
            >
              {step.complete ? '✓' : index + 1}
            </span>
            <span
              className={cn(state === 'current' ? 'font-semibold text-ink-950' : 'text-ink-600')}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span className="mx-1 hidden h-px w-6 bg-ink-300 sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
