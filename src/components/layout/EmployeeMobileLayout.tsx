import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import maayaLogo from '@/assets/logo-new.png';
import { Home, CalendarDays, Wallet, User, Bell, X, ChevronRight, Briefcase } from 'lucide-react';
import { api } from '@/services/api';
import type { StaffNotification } from '@/types';
import './employee.css';
import { useShiftTimes } from '@/utils/shiftUtils';

const destinations = [
  { label: 'Home', path: 'dashboard', icon: Home },
  { label: 'Leave', path: 'leaves', icon: CalendarDays },
  { label: 'On Duty', path: 'on-duty', icon: Briefcase },
  { label: 'Payslips', path: 'salary', icon: Wallet },
  { label: 'Profile', path: 'profile', icon: User },
];

/** How often the unread count is refreshed while the portal is open. */
const POLL_MS = 60_000;

/** "Just now", "5 min ago", "3 hours ago", "Yesterday", then the date. */
const whenText = (value: string) => {
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return '';
  const minutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (hours < 48) return 'Yesterday';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(then);
};

export const EmployeeMobileLayout: React.FC = () => {
  useShiftTimes();
  const navigate = useNavigate();
  const location = useLocation();
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<StaffNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [listState, setListState] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await api.notifications.unreadCount());
    } catch {
      // keep the last known count; the next poll tries again
    }
  }, []);

  const loadList = useCallback(async () => {
    setListState('loading');
    try {
      const res = await api.notifications.list(30);
      setItems(res.items);
      setUnread(res.unread);
      setListState('idle');
    } catch {
      setListState('error');
    }
  }, []);

  // Unread count: on open, every minute while the tab is visible, and when the person comes back to it
  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshCount();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (open) sheet.current?.showModal();
  }, [open]);

  const openSheet = () => {
    setOpen(true);
    void loadList();
  };

  const close = () => {
    sheet.current?.close();
    setOpen(false);
  };

  const openItem = (item: StaffNotification) => {
    if (!item.read) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnread((count) => Math.max(0, count - 1));
      api.notifications
        .markRead(item.id)
        .then(setUnread)
        .catch(() => undefined);
    }
    if (item.link?.startsWith('/')) {
      close();
      navigate(item.link);
    }
  };

  const markAllRead = () => {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    api.notifications.markAllRead().catch(() => void refreshCount());
  };

  const badge = unread > 9 ? '9+' : String(unread);

  return (
    <div className="employee-app">
      <a href="#employee-main" className="skip-link">
        Skip to content
      </a>
      <div className="employee-shell">
        <header className="employee-header">
          <NavLink to="/employee/dashboard" aria-label="Maaya World home" className="employee-brand">
            <img src={maayaLogo} alt="Maaya World" />
          </NavLink>

          <button
            type="button"
            className="employee-icon-button"
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            aria-haspopup="dialog"
            onClick={openSheet}
          >
            <Bell size={20} strokeWidth={1.75} />
            {unread > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white tabular-nums"
              >
                {badge}
              </span>
            )}
          </button>
        </header>

        <main id="employee-main" className="employee-content" tabIndex={-1}>
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" /></div>}>
            <Outlet />
          </Suspense>
        </main>

        <nav className="employee-nav" aria-label="Employee navigation">
          {destinations.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={`/employee/${path}`} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {open && (
        <dialog
          ref={sheet}
          className="employee-sheet"
          aria-labelledby="notifications-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="notifications-title" className="text-base font-semibold text-slate-900">
              Notifications
            </h2>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button type="button" onClick={markAllRead} className="h-9 rounded-lg px-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60">
                  Mark all as read
                </button>
              )}
              <button type="button" autoFocus className="employee-icon-button" aria-label="Close" onClick={close}>
                <X size={20} />
              </button>
            </div>
          </div>

          {listState === 'loading' && items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600" role="status">
              Loading…
            </p>
          ) : listState === 'error' && items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-700">Could not load notifications.</p>
              <button type="button" onClick={() => void loadList()} className="mt-2 text-sm font-medium text-brand-700 hover:underline">
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600">No notifications yet. Leave, On Duty and salary updates will show here.</p>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${item.read ? '' : 'bg-brand-50/60'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-transparent' : 'bg-brand-600'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="sr-only">{item.read ? 'Read: ' : 'Unread: '}</span>
                      <span className={`block text-sm text-slate-900 ${item.read ? 'font-medium' : 'font-semibold'}`}>{item.title}</span>
                      {item.message && <span className="mt-0.5 block text-sm text-slate-700">{item.message}</span>}
                      <span className="mt-1 block text-xs text-slate-600">{whenText(item.createdAt)}</span>
                    </span>
                    {item.link?.startsWith('/') && <ChevronRight size={16} className="mt-1 shrink-0 text-slate-500" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </dialog>
      )}
    </div>
  );
};
