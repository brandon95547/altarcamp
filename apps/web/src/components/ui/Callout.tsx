import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react';
import { cn } from '../../lib/cn.js';

type Tone = 'info' | 'success' | 'warning' | 'blocker';

const TONES: Record<Tone, { wrap: string; icon: string; Icon: typeof Info }> = {
  info: { wrap: 'border-dusk-200 bg-dusk-50 text-dusk-900', icon: 'text-dusk-600', Icon: Info },
  success: {
    wrap: 'border-moss-200 bg-moss-50 text-moss-900',
    icon: 'text-moss-600',
    Icon: CheckCircle2,
  },
  warning: {
    wrap: 'border-ember-200 bg-ember-50 text-ember-900',
    icon: 'text-ember-600',
    Icon: AlertTriangle,
  },
  blocker: {
    wrap: 'border-clay-200 bg-clay-50 text-clay-900',
    icon: 'text-clay-600',
    Icon: OctagonAlert,
  },
};

export function Callout({
  tone = 'info',
  title,
  children,
  className,
  action,
}: {
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const { wrap, icon, Icon } = TONES[tone];
  return (
    <div className={cn('rounded-lg border px-4 py-3', wrap, className)}>
      <div className="flex gap-3">
        <Icon className={cn('mt-0.5 size-5 shrink-0', icon)} aria-hidden />
        <div className="min-w-0 flex-1">
          {title ? <p className="font-semibold">{title}</p> : null}
          {children ? <div className={cn('text-sm', title && 'mt-1')}>{children}</div> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
