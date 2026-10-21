import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { markAllNotificationsAsRead } from '@/store/slices/uiSlice';
import { ToastContainer } from '@/components/common/ToastContainer';
import maayaLogo from '@/assets/logo-new.png';
import { Home, Clock, CalendarDays, FileText, User, Bell, X, ChevronRight, LogOut } from 'lucide-react';
import './employee.css';

const destinations = [
  { label: 'Home', path: 'dashboard', icon: Home },
  { label: 'Attendance', path: 'attendance', icon: Clock },
  { label: 'Leave', path: 'leaves', icon: CalendarDays },
  { label: 'Payslips', path: 'salary', icon: FileText },
  { label: 'Profile', path: 'profile', icon: User },
];

export const EmployeeMobileLayout: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { notifications } = useAppSelector((state) => state.ui);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<'notifications' | 'account' | null>(null);
  const unread = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    sheet.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="employee-app">
      <div className="employee-shell">
        {/* Mobile Header */}
        <header className="employee-header">
          <NavLink to="/employee/dashboard" aria-label="Maaya World home" className="employee-brand">
            <img src={maayaLogo} alt="Maaya World" />
            <span>Employee Portal</span>
          </NavLink>

          <div className="flex items-center gap-2">
            <button
              className="employee-icon-button"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
              onClick={() => {
                setOpen('notifications');
                dispatch(markAllNotificationsAsRead());
              }}
            >
              <Bell size={19} strokeWidth={1.8} />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[14px] h-3.5 px-0.5 bg-[var(--accent-500)] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unread}
                </span>
              )}
            </button>

            <button
              className="employee-avatar"
              aria-label="Account menu"
              aria-haspopup="dialog"
              onClick={() => setOpen('account')}
            >
              {user?.name
                ?.split(' ')
                .map((name) => name[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || <User size={18} />}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="employee-content">
          <Outlet />
        </main>

        {/* Pinned Bottom Navigation */}
        <nav className="employee-nav" aria-label="Employee navigation">
          {destinations.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/employee/${path}`}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Account / Notification Bottom Sheet */}
      {open && (
        <dialog
          ref={sheet}
          className="employee-sheet"
          aria-label={open === 'account' ? 'Account menu' : 'Notifications'}
          onCancel={() => setOpen(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(null);
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {open === 'account' ? 'My Account' : 'Notifications'}
            </h2>
            <button
              autoFocus
              className="employee-icon-button"
              aria-label="Close menu"
              onClick={() => setOpen(null)}
            >
              <X size={20} />
            </button>
          </div>

          {open === 'account' ? (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700">
                    {user?.employeeId}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--brand-50)] text-[var(--brand-700)]">
                    {user?.department || 'Operations'}
                  </span>
                </div>
              </div>

              <button
                className="employee-history-link w-full text-xs"
                onClick={() => {
                  setOpen(null);
                  navigate('/employee/profile');
                }}
              >
                <User size={16} className="text-slate-400" />
                <span className="text-left">My Profile</span>
                <ChevronRight size={16} className="text-slate-400" />
              </button>

              <button
                className="employee-history-link w-full text-xs text-[var(--accent-600)] hover:bg-[var(--accent-50)]"
                onClick={() => {
                  setOpen(null);
                  dispatch(logout());
                  navigate('/admin/dashboard');
                }}
              >
                <LogOut size={16} className="text-[var(--accent-500)]" />
                <span className="text-left font-medium">Sign Out</span>
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              You're all caught up. New updates will appear here.
            </p>
          ) : (
            notifications.map((item) => (
              <article key={item.id} className="employee-notice">
                <h3>{item.title}</h3>
                <p>{item.message}</p>
                <small>{item.timestamp}</small>
                {item.actionUrl?.startsWith('/employee/') && (
                  <button
                    className="employee-text-link"
                    onClick={() => {
                      setOpen(null);
                      navigate(item.actionUrl!);
                    }}
                  >
                    View details <ChevronRight size={14} />
                  </button>
                )}
              </article>
            ))
          )}
        </dialog>
      )}

      <ToastContainer />
    </div>
  );
};
