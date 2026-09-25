import { useId } from 'react';
import { maskPhone, normalizeEmail, normalizeWebsite, phoneDigits } from '@altar/shared';
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


/* ── masked inputs ──────────────────────────────────────────────────────────
 *
 * Each of these keeps TextInput's signature exactly: the handler still receives a change
 * event and still reads `event.target.value`. They rewrite that value before passing the
 * event on, so a form wired with `onChange={set('phone')}` needs no change at all — which
 * is the difference between masking the four fields that have one today and masking every
 * field that ever gets added.
 *
 * The transforms themselves live in @altar/shared, where they are tested and where the API
 * can read an address the same way the form wrote it.
 */

/**
 * Formats as it is typed. See maskPhone: international numbers are deliberately left alone
 * rather than forced into a US shape.
 */
export function PhoneInput({
  value,
  onChange,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TextInput
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      onChange={(event) => {
        const typed = event.target.value;
        const previous = String(value ?? '');
        let masked = maskPhone(typed);
        // Backspacing a formatting character deletes no DIGIT, so the mask puts the
        // character straight back and the field looks frozen. Read that as deleting the
        // digit in front of it, which is what the user meant.
        if (typed.length < previous.length && masked === previous) {
          masked = maskPhone(phoneDigits(typed).slice(0, -1));
        }
        event.target.value = masked;
        onChange?.(event);
      }}
    />
  );
}

/**
 * Trimmed and folded to lower case ON BLUR, not per keystroke — lowercasing under the
 * cursor makes a field feel broken while someone is still typing it.
 *
 * The keyboard hints matter more than the normalising: a phone that capitalises the first
 * letter and autocorrects the domain is the single most common way an address is entered
 * wrong, and three attributes turn all of it off.
 */
export function EmailInput({
  value,
  onChange,
  onBlur,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TextInput
      {...props}
      type="email"
      inputMode="email"
      autoComplete={props.autoComplete ?? 'email'}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      value={value}
      onChange={onChange}
      onBlur={(event) => {
        const normalized = normalizeEmail(event.target.value);
        if (normalized !== event.target.value) {
          event.target.value = normalized;
          onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>);
        }
        onBlur?.(event);
      }}
    />
  );
}

/**
 * Given a scheme on blur when it has none. A bare host in an href is a RELATIVE PATH, so
 * an artist who types "altar.camp" gets a link to a page on this site that does not exist.
 */
export function UrlInput({
  value,
  onChange,
  onBlur,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TextInput
      {...props}
      type="url"
      inputMode="url"
      autoCapitalize="off"
      spellCheck={false}
      value={value}
      onChange={onChange}
      onBlur={(event) => {
        const normalized = normalizeWebsite(event.target.value);
        if (normalized !== event.target.value) {
          event.target.value = normalized;
          onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>);
        }
        onBlur?.(event);
      }}
    />
  );
}

/**
 * Money. The step and the decimal keypad are the whole point: `type="number"` alone gives
 * a phone the full keyboard, and a contract amount typed on a phone is where that hurts.
 */
export function MoneyInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput type="number" inputMode="decimal" min={0} step="0.01" {...props} />;
}

/**
 * A share, in percent. Bounded 0-100 here so the browser rejects a fourth participant on
 * 40% before the split maths has to, and a decimal keypad for the same reason as money.
 */
export function PercentInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <TextInput type="number" inputMode="decimal" min={0} max={100} step="0.01" {...props} />
  );
}
