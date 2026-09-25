import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import { cn } from '../../lib/cn.js';

type Tone = 'neutral' | 'success';

const ICON_TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  success: 'bg-moss-100 text-moss-700',
};

/**
 * A modal dialog, after the UI Bible's: 32rem wide, a toned icon beside the title and one line
 * of consequence, then the body, then the actions at the right. It is built on the native
 * <dialog>, which supplies the top layer, the backdrop, the focus trap and Escape; theme.css
 * locks the page's scroll while one is open.
 *
 * A dialog stops the page, so it is for a moment the artist should stop for. A message that
 * needs no response is a Callout.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  icon,
  tone = 'neutral',
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Fires for Escape as well as for close(), so the parent's state never disagrees.
      onClose={onClose}
      // The panel fills the element, so a click that lands on the element itself is the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card border border-ink-200 bg-white p-0 text-ink-800 shadow-raised backdrop:bg-ink-950/70 backdrop:backdrop-blur-xs',
        className,
      )}
    >
      <div className="p-6">
        <header className="flex items-start gap-3">
          {icon ? (
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full',
                ICON_TONES[tone],
              )}
              aria-hidden
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-ink-700">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mt-1 -mr-2 rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        {children ? <div className="mt-5">{children}</div> : null}

        {footer ? (
          // Stacked full width on a phone, the primary (last) on top; a row at the right above.
          <footer className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
