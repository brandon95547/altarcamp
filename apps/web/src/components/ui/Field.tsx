import { useId } from 'react';
import { cn } from '../../lib/cn.js';

const CONTROL =
  'w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-ink-900 placeholder:text-ink-500 ' +
  'focus:border-ember-600 focus:outline-none focus:ring-2 focus:ring-ember-600/25 disabled:bg-ink-100 disabled:text-ink-600';

interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: (props: {
    id: string;
    className: string;
    'aria-describedby'?: string;
  }) => React.ReactNode;
}

/**
 * One label/hint/error wrapper for every control, so the accessible wiring is written once.
 */
export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900">
        {label}
        {required ? <span className="ml-1 text-clay-600">*</span> : null}
      </label>
      {hint ? (
        <p id={hintId} className="mb-1.5 text-sm text-ink-600">
          {hint}
        </p>
      ) : null}
      {children({
        id,
        className: cn(
          CONTROL,
          error && 'border-clay-500 focus:border-clay-600 focus:ring-clay-600/25',
        ),
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-clay-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={cn(CONTROL, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(CONTROL, 'pr-8', props.className)} />;
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input
        type="checkbox"
        {...props}
        className="mt-1 size-5 shrink-0 cursor-pointer rounded border-ink-400 text-ember-600 focus:ring-ember-600/40 accent-ember-600"
      />
      <span>
        <span className="block text-ink-900">{label}</span>
        {description ? <span className="block text-sm text-ink-600">{description}</span> : null}
      </span>
    </label>
  );
}

export function RadioGroup<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T | null;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; description?: React.ReactNode }[];
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors',
              selected
                ? 'border-ember-500 bg-ember-50 ring-1 ring-ember-500'
                : 'border-ink-300 bg-white hover:bg-ink-50',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="mt-1 size-4 shrink-0 accent-ember-600"
            />
            <span>
              <span className="block font-medium text-ink-900">{option.label}</span>
              {option.description ? (
                <span className="block text-sm text-ink-600">{option.description}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
