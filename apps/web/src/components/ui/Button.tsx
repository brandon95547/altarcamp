import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn.js';

type Variant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'secondary-on-dark' | 'ghost-on-dark';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ember-600 text-white hover:bg-ember-700 active:bg-ember-800 disabled:bg-ember-300 disabled:text-ember-50',
  secondary:
    'bg-white text-ink-900 ring-1 ring-inset ring-ink-300 hover:bg-ink-50 active:bg-ink-100 disabled:text-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-100 active:bg-ink-200 disabled:text-ink-400',
  danger: 'bg-clay-600 text-white hover:bg-clay-700 active:bg-clay-800 disabled:bg-clay-300',
  dark: 'bg-ink-950 text-ink-50 hover:bg-ink-800 active:bg-ink-900 disabled:bg-ink-400',
  // The secondary and ghost roles again, for a dark surface (the marketing header).
  'secondary-on-dark':
    'text-ink-50 ring-1 ring-inset ring-ink-700 hover:bg-ink-800 active:bg-ink-700 disabled:text-ink-500',
  'ghost-on-dark':
    'text-ink-100 hover:bg-ink-800 hover:text-ink-50 active:bg-ink-700 disabled:text-ink-500',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 gap-2',
  lg: 'h-13 px-6 text-lg gap-2.5',
};

const BASE =
  'inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:cursor-not-allowed select-none';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  to,
  ...props
}: CommonProps & { to: string } & Omit<React.ComponentProps<typeof Link>, 'to' | 'className'>) {
  return (
    <Link to={to} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />
  );
}
