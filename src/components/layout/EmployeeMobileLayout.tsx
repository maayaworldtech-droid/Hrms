import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { markAllNotificationsAsRead } from '@/store/slices/uiSlice';
import { ToastContainer } from '@/components/common/ToastContainer';
import maayaLogo from '@/assets/logo-new.png';
import { Home, Clock, CalendarDays, FileText, User, Bell, X, ChevronRight } from 'lucide-react';
import './employee.css';

const destinations = [
  { label: 'Home', path: 'dashboard', icon: Home },
  { label: 'Attendance', path: 'attendance', icon: Clock },
  { label: 'Leave', path: 'leaves', icon: CalendarDays },
  { label: 'Payslips', path: 'salary', icon: FileText },
  { label: 'Profile', path: 'profile', icon: User },
];

export const EmployeeMobileLayout: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const { notifications } = useAppSelector(state => state.ui);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const sheet = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(item => !item.read).length;
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    sheet.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return (
    <div className="employee-app">
      <div className="employee-shell">
        <header className="employee-header">
          <NavLink to="/employee/dashboard" aria-label="Maaya World home" className="employee-brand">
            <img src={maayaLogo} alt="Maaya World" /><span>My workspace</span>
          </NavLink>
          <div className="flex items-center gap-2">
            <button className="employee-icon-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => { setOpen(true); dispatch(markAllNotificationsAsRead()); }}>
              <Bell size={21} />{unread > 0 && <span className="employee-notification-dot" />}
            </button>
            <NavLink to="/employee/profile" className="employee-avatar" aria-label="My profile">
              {user?.name.split(' ').map(name => name[0]).slice(0, 2).join('') || <User size={20} />}
            </NavLink>
          </div>
        </header>
        <main className="employee-content"><Outlet /></main>
        <nav className="employee-nav" aria-label="Employee navigation">
          {destinations.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={`/employee/${path}`} className={({ isActive }) => isActive ? 'is-active' : ''}>
              <Icon size={22} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      {open && <dialog ref={sheet} className="employee-sheet" aria-label="Notifications" onCancel={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2>Notifications</h2><button autoFocus className="employee-icon-button" aria-label="Close notifications" onClick={() => setOpen(false)}><X size={22} /></button>
        </div>
        {notifications.length === 0 ? <p>You're all caught up. New updates will appear here.</p> : notifications.map(item => (
          <article key={item.id} className="employee-notice">
            <h3>{item.title}</h3><p>{item.message}</p><small>{item.timestamp}</small>
            {item.actionUrl?.startsWith('/employee/') && <button className="employee-text-link" onClick={() => { setOpen(false); navigate(item.actionUrl!); }}>View details <ChevronRight size={16} /></button>}
          </article>
        ))}
      </dialog>}
      <ToastContainer />
    </div>
  );
};
