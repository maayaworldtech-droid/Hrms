import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { markAllNotificationsAsRead } from '@/store/slices/uiSlice';
import maayaLogo from '@/assets/logo-new.png';
import { Home, CalendarDays, Wallet, User, Bell, X, ChevronRight, LogOut, Briefcase, LayoutDashboard } from 'lucide-react';
import './employee.css';
import { useShiftTimes } from '@/utils/shiftUtils';

const destinations = [
  { label: 'Home', path: 'dashboard', icon: Home },
  { label: 'Leave', path: 'leaves', icon: CalendarDays },
  { label: 'On Duty', path: 'on-duty', icon: Briefcase },
  { label: 'Payslips', path: 'salary', icon: Wallet },
  { label: 'Profile', path: 'profile', icon: User },
];

const initials = (name?: string) =>
  name
    ?.split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '';

export const EmployeeMobileLayout: React.FC = () => {
  useShiftTimes();
  const { user, activeRole } = useAppSelector((state) => state.auth);
  const { notifications } = useAppSelector((state) => state.ui);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<'notifications' | 'account' | null>(null);
  const unread = notifications.filter((item) => !item.read).length;
  const workspacePath = activeRole === 'ADMIN' ? '/admin/dashboard' : activeRole === 'MANAGER' ? '/manager/dashboard' : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    sheet.current?.showModal();
  }, [open]);

  const close = () => setOpen(null);

  const menuRow = (icon: React.ReactNode, label: string, onClick: () => void, tone: 'default' | 'danger' = 'default') => (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
        tone === 'danger' ? 'text-rose-700 hover:bg-rose-50' : 'text-slate-800 hover:bg-slate-100'
      }`}
    >
      <span className={tone === 'danger' ? 'text-rose-600' : 'text-slate-600'} aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ChevronRight size={16} className="text-slate-500" aria-hidden="true" />
    </button>
  );

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

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="employee-icon-button"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
              aria-haspopup="dialog"
              onClick={() => {
                setOpen('notifications');
                dispatch(markAllNotificationsAsRead());
              }}
            >
              <Bell size={20} strokeWidth={1.75} />
              {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
            </button>

            <button type="button" className="employee-avatar" aria-label="Account menu" aria-haspopup="dialog" onClick={() => setOpen('account')}>
              {initials(user?.name) || <User size={18} />}
            </button>
          </div>
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
          aria-label={open === 'account' ? 'Account menu' : 'Notifications'}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">{open === 'account' ? 'My account' : 'Notifications'}</h2>
            <button type="button" autoFocus className="employee-icon-button" aria-label="Close" onClick={close}>
              <X size={20} />
            </button>
          </div>

          {open === 'account' ? (
            <div className="space-y-2">
              <div className="rounded-lg bg-slate-50 px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="mt-0.5 text-sm text-slate-600 break-all">{user?.email}</p>
                <p className="mt-1 text-xs text-slate-600 tabular-nums">
                  {user?.employeeId}
                  {user?.location ? ` · ${user.location}` : ''}
                </p>
              </div>

              {menuRow(<User size={18} />, 'My profile', () => {
                close();
                navigate('/employee/profile');
              })}
              {workspacePath &&
                menuRow(<LayoutDashboard size={18} />, activeRole === 'ADMIN' ? 'Back to admin screens' : 'Back to my team', () => {
                  close();
                  navigate(workspacePath);
                })}
              <div className="border-t border-slate-200 pt-2">
                {menuRow(
                  <LogOut size={18} />,
                  'Sign out',
                  () => {
                    close();
                    dispatch(logout());
                    navigate('/login');
                  },
                  'danger'
                )}
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-600">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((item) => (
                <li key={item.id} className="py-3">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-sm text-slate-700">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.timestamp}</p>
                  {item.actionUrl?.startsWith('/employee/') && (
                    <button
                      type="button"
                      className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
                      onClick={() => {
                        close();
                        navigate(item.actionUrl!);
                      }}
                    >
                      View details <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </dialog>
      )}
    </div>
  );
};
