import { cn } from '../../lib/cn.js';

export function Card({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-card border border-ink-200 bg-white shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-lg">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 border-t border-ink-200 bg-ink-50 px-5 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
