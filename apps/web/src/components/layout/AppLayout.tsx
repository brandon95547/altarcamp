import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, isStaff } from '../../lib/auth.js';
import { cn } from '../../lib/cn.js';
import { useQuery } from '../../lib/useApi.js';
import { Brand } from './Brand.js';

/** Spec §42 — the artist's primary navigation. */
const NAV = [
  { to: '/dashboard', label: 'Home' },
  { to: '/songs', label: 'My music' },
  { to: '/deal', label: 'My deal' },
  { to: '/money', label: 'My money' },
  { to: '/mission-hub', label: 'My mission' },
  { to: '/documents', label: 'Documents' },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const notifications = useQuery<{ notifications: { id: string; read_at: string | null }[] }>(
    '/artists/me/notifications',
  );
  const unread = notifications.data?.notifications.filter((item) => !item.read_at).length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div className="altar-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Brand />
            <nav className="hidden items-center gap-0.5 lg:flex">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-ink-950 text-ink-50'
                        : 'text-ink-700 hover:bg-ink-100 hover:text-ink-950',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <NavLink
              to="/notifications"
              className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-100"
              aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            >
              <Bell className="size-5" aria-hidden />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-ember-600 text-[10px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </NavLink>

            {isStaff(user) ? (
              <NavLink
                to="/admin"
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-dusk-800 hover:bg-dusk-50 sm:block"
              >
                Admin
              </NavLink>
            ) : null}

            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100 sm:flex"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>

            <button
              type="button"
              className="rounded-lg p-2 text-ink-800 hover:bg-ink-100 lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? (
                <X className="size-5" aria-hidden />
              ) : (
                <Menu className="size-5" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {open ? (
          <nav className="border-t border-ink-200 bg-white lg:hidden">
            <div className="altar-container grid gap-1 py-3">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2.5 font-medium',
                      isActive ? 'bg-ink-950 text-ink-50' : 'text-ink-800 hover:bg-ink-100',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {isStaff(user) ? (
                <NavLink
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-dusk-800"
                >
                  Admin
                </NavLink>
              ) : null}
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="rounded-lg px-3 py-2.5 text-left font-medium text-ink-800 hover:bg-ink-100"
              >
                Sign out
              </button>
            </div>
          </nav>
        ) : null}
      </header>

      <main className="altar-container flex-1 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ink-200 py-6 text-sm text-ink-600">
        <div className="altar-container flex flex-wrap justify-between gap-3">
          <p>Know what you own. Know what you share. Know where the money goes.</p>
          <p>Signed in as {user?.legalName}</p>
        </div>
      </footer>
    </div>
  );
}
