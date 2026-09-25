import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
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
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  // The home hero runs up behind the header, so at the top of that page the bar is clear and
  // the photograph shows through. Everywhere else, and once the page moves, it is solid.
  const overHero = pathname === '/' && !scrolled && !open;

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header
        className={cn(
          // The header is exactly --altar-header tall, border included, because the home hero
          // pulls itself up by that token; the mobile menu hangs below it rather than inside.
          'sticky top-0 z-40 h-(--altar-header) border-b transition-colors duration-200',
          overHero ? 'border-transparent' : 'border-ink-800 bg-ink-950/95 backdrop-blur',
        )}
      >
        <div className="altar-container flex h-full items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
          <Brand tone="outline" className="justify-self-start" />

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-2 py-2 font-medium whitespace-nowrap transition-colors lg:px-3.5',
                    isActive
                      ? 'bg-ink-800 text-ink-50'
                      : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 justify-self-end whitespace-nowrap md:flex">
            {user ? (
              <ButtonLink to="/dashboard" className="px-5 lg:px-6">
                Go to your dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="ghost-on-dark">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/signup" className="px-5 lg:px-6">
                  Start
                </ButtonLink>
              </>
            )}
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-ink-100 hover:bg-ink-800 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>

        {open ? (
          <div className="absolute inset-x-0 top-full border-b border-ink-800 bg-ink-950 md:hidden">
            <nav className="altar-container grid gap-1 py-3">
              {LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 font-medium text-ink-100 hover:bg-ink-800 hover:text-ink-50"
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
                    <ButtonLink
                      to="/login"
                      variant="secondary-on-dark"
                      onClick={() => setOpen(false)}
                    >
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

      {/* `after-band` (theme.css): a page ending on a dark band runs straight into the footer. */}
      <footer className="mt-20 border-t border-ink-800 bg-ink-950 py-12 text-ink-300 after-band:mt-0">
        <div className="altar-container grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Brand tone="light" />
            <ul className="mt-4 space-y-1 text-ink-100">
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
