import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth.js';
import { cn } from '../../lib/cn.js';
import { Callout } from '../ui/Callout.js';
import { Brand } from './Brand.js';

/** Spec §42 — staff navigation. Phases 2 and 3 fill the last four. */
const NAV = [
  { to: '/admin', label: 'Artists', end: true },
  { to: '/admin/music', label: 'Music' },
  { to: '/admin/agreements', label: 'Agreements' },
  { to: '/admin/rights', label: 'Rights' },
  { to: '/admin/audit', label: 'Audit' },
];

const LATER = ['Releases', 'Royalties', 'Mission', 'Reports'];

export function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col bg-ink-100">
      <header className="border-b border-ink-800 bg-ink-950 text-ink-100">
        <div className="altar-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Brand tone="light" />
            <span className="rounded-full bg-ink-800 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-ember-300">
              Staff
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <NavLink
              to="/dashboard"
              className="rounded-lg px-3 py-2 text-ink-300 hover:bg-ink-800 hover:text-ink-50"
            >
              Artist view
            </NavLink>
          </div>
        </div>

        <div className="altar-container flex flex-wrap items-center gap-1 pb-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  isActive
                    ? 'bg-ember-500 text-ink-950'
                    : 'text-ink-300 hover:bg-ink-800 hover:text-ink-50',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {LATER.map((label) => (
            <span
              key={label}
              className="cursor-not-allowed rounded-lg px-3 py-1.5 text-sm text-ink-500"
              title="Arrives in a later phase"
            >
              {label}
            </span>
          ))}
        </div>
      </header>

      <main className="altar-container flex-1 py-8">
        {user?.mfaRequired ? (
          <Callout
            tone="warning"
            className="mb-6"
            title="Multi-factor authentication is not set up"
          >
            Administrator accounts are required to use a second factor before this platform handles
            real artist agreements. Phase 1 records the requirement; the second factor is wired to
            the identity provider before launch.
          </Callout>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}
