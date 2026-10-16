import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { switchRole, logout } from '@/store/slices/authSlice';
import { markAllNotificationsAsRead } from '@/store/slices/uiSlice';
import { ToastContainer } from '@/components/common/ToastContainer';
import maayaLogo from '@/assets/logo-new.png';
import { Home, Clock, CalendarDays, FileText, User, Bell, X, ChevronRight, ShieldCheck, Users, LogOut } from 'lucide-react';
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
  const [open, setOpen] = useState<'notifications' | 'account' | null>(null);
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
            <button className="employee-icon-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => { setOpen('notifications'); dispatch(markAllNotificationsAsRead()); }}>
              <Bell size={21} />{unread > 0 && <span className="employee-notification-dot" />}
            </button>
            <button className="employee-avatar" aria-label="Account menu" aria-haspopup="dialog" onClick={() => setOpen('account')}>
              {user?.name.split(' ').map(name => name[0]).slice(0, 2).join('') || <User size={20} />}
            </button>
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
      {open && <dialog ref={sheet} className="employee-sheet" aria-label={open === 'account' ? 'Account menu' : 'Notifications'} onCancel={() => setOpen(null)} onClick={event => { if (event.target === event.currentTarget) setOpen(null); }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2>{open === 'account' ? 'My account' : 'Notifications'}</h2><button autoFocus className="employee-icon-button" aria-label="Close menu" onClick={() => setOpen(null)}><X size={22} /></button>
        </div>
        {open === 'account' ? <>
          <p className="font-semibold">{user?.name}</p>
          <p className="employee-muted mb-4">{user?.employeeId}</p>
          <button className="employee-history-link w-full" onClick={() => { setOpen(null); navigate('/employee/profile'); }}><User size={20} /><span className="text-left">My profile</span><ChevronRight size={18} /></button>
          <button className="employee-history-link w-full" onClick={() => { setOpen(null); dispatch(switchRole('ADMIN')); navigate('/admin/dashboard'); }}><ShieldCheck size={20} /><span className="text-left">Switch to Admin</span><ChevronRight size={18} /></button>
          <button className="employee-history-link w-full" onClick={() => { setOpen(null); dispatch(switchRole('MANAGER')); navigate('/manager/dashboard'); }}><Users size={20} /><span className="text-left">Switch to Manager</span><ChevronRight size={18} /></button>
          <button className="employee-history-link w-full text-rose-700" onClick={() => { setOpen(null); dispatch(logout()); navigate('/login'); }}><LogOut size={20} /><span className="text-left">Sign out</span></button>
        </> : notifications.length === 0 ? <p>You're all caught up. New updates will appear here.</p> : notifications.map(item => (
          <article key={item.id} className="employee-notice">
            <h3>{item.title}</h3><p>{item.message}</p><small>{item.timestamp}</small>
            {item.actionUrl?.startsWith('/employee/') && <button className="employee-text-link" onClick={() => { setOpen(null); navigate(item.actionUrl!); }}>View details <ChevronRight size={16} /></button>}
          </article>
        ))}
      </dialog>}
      <ToastContainer />
    </div>
  );
};
