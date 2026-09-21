import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ALTAR_PROMISE } from '@altar/shared';
import { useAuth } from '../../lib/auth.js';
import { cn } from '../../lib/cn.js';
import { ButtonLink } from '../ui/Button.js';
import { Brand } from './Brand.js';

const LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/learn', label: 'Learn the terms' },
  { to: '/mission', label: 'The mission' },
];

export function MarketingLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-ink-50/90 backdrop-blur">
        <div className="altar-container flex h-16 items-center justify-between gap-4">
          <Brand />

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ink-200 text-ink-950'
                      : 'text-ink-700 hover:bg-ink-100 hover:text-ink-950',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <ButtonLink to="/dashboard" size="sm">
                Go to your dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/signup" size="sm">
                  Start
                </ButtonLink>
              </>
            )}
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-ink-800 hover:bg-ink-100 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>

        {open ? (
          <div className="border-t border-ink-200 bg-ink-50 md:hidden">
            <nav className="altar-container grid gap-1 py-3">
              {LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-ink-800 hover:bg-ink-100"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 grid gap-2">
                {user ? (
                  <ButtonLink to="/dashboard" onClick={() => setOpen(false)}>
                    Go to your dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink to="/login" variant="secondary" onClick={() => setOpen(false)}>
                      Sign in
                    </ButtonLink>
                    <ButtonLink to="/signup" onClick={() => setOpen(false)}>
                      Start
                    </ButtonLink>
                  </>
                )}
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-ink-200 bg-ink-950 py-12 text-ink-300">
        <div className="altar-container grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Brand tone="light" />
            <ul className="mt-4 space-y-1 font-display text-lg text-ink-100">
              {ALTAR_PROMISE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-400">
              Two ways in
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/signup?path=single_song" className="hover:text-ember-300">
                  One song
                </Link>
              </li>
              <li>
                <Link to="/signup?path=one_year" className="hover:text-ember-300">
                  One year
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-ember-300">
                  How it works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-400">
              Understand it first
            </h2>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/learn" className="hover:text-ember-300">
                  Music business terms
                </Link>
              </li>
              <li>
                <Link to="/mission" className="hover:text-ember-300">
                  What the mission means
                </Link>
              </li>
              <li>
                <a href="/docs" className="hover:text-ember-300">
                  API documentation
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="altar-container mt-10 border-t border-ink-800 pt-6 text-sm text-ink-400">
          <p>
            Altar.Camp is a record label and mission community. Nothing on this site is legal
            advice. Agreements generated here are reviewed by counsel before use, and you are always
            encouraged to have your own advisor read anything before you sign it.
          </p>
        </div>
      </footer>
    </div>
  );
}
