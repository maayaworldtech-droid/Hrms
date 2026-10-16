import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, HelpCircle, LogOut, Menu, Search, ShieldCheck, User, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, switchRole } from '@/store/slices/authSlice';
import { markAllNotificationsAsRead, toggleMobileMenu, toggleSidebar } from '@/store/slices/uiSlice';
import { CommandPalette } from '@/components/common/CommandPalette';
import { UserRole } from '@/types';

export const WorkspaceHeader = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeRole } = useAppSelector(state => state.auth);
  const notifications = useAppSelector(state => state.ui.notifications);
  const [panel, setPanel] = useState<'account' | 'notifications' | 'help' | null>(null);
  const [search, setSearch] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!panel) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [panel]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearch(value => !value); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const changeRole = (role: UserRole) => { setPanel(null); dispatch(switchRole(role)); navigate(`/${role.toLowerCase()}/dashboard`); };
  const unread = notifications.filter(item => !item.read).length;
  return <>
    <header className="workspace-header">
      <div className="flex items-center gap-3 min-w-0">
        <button className="workspace-icon lg:hidden" aria-label="Open navigation" onClick={() => dispatch(toggleMobileMenu())}><Menu size={21} /></button>
        <button className="workspace-icon hidden lg:flex" aria-label="Toggle sidebar" onClick={() => dispatch(toggleSidebar())}><Menu size={21} /></button>
        <span className="workspace-role">{activeRole === 'ADMIN' ? 'People & operations' : activeRole === 'MANAGER' ? 'Venue operations' : 'My workspace'}</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="workspace-search" aria-label="Search workspace" onClick={() => setSearch(true)}><Search size={18} /><span className="hidden md:inline">Search workspace</span><kbd className="hidden xl:inline">Ctrl K</kbd></button>
        <button className="workspace-icon hidden sm:flex" aria-label="Help" onClick={() => setPanel('help')}><HelpCircle size={20} /></button>
        <button className="workspace-icon relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => { setPanel('notifications'); dispatch(markAllNotificationsAsRead()); }}><Bell size={20} />{unread > 0 && <span className="workspace-dot" />}</button>
        <button className="workspace-account" aria-label="Account and workspace menu" aria-haspopup="dialog" onClick={() => setPanel('account')}><span className="workspace-initials">{user?.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><span className="hidden sm:inline">{activeRole === 'ADMIN' ? 'Admin' : 'Manager'}</span><ChevronDown size={15} /></button>
      </div>
    </header>
    {panel && <dialog ref={dialog} className="workspace-dialog" aria-label={panel === 'account' ? 'Account menu' : panel === 'help' ? 'Help' : 'Notifications'} onCancel={() => setPanel(null)} onClick={event => { if (event.target === event.currentTarget) setPanel(null); }}>
      <div className="flex items-center justify-between gap-4 mb-4"><h2>{panel === 'account' ? 'My account' : panel === 'help' ? 'Workspace help' : 'Notifications'}</h2><button autoFocus className="workspace-icon" aria-label="Close menu" onClick={() => setPanel(null)}><X size={21} /></button></div>
      {panel === 'account' ? <>
        <p className="font-semibold">{user?.name}</p><p className="ops-muted mb-4">{user?.email}</p>
        <button className="workspace-menu-row" onClick={() => { setPanel(null); navigate('/employee/profile'); }}><User size={18} />My profile</button>
        {(['ADMIN', 'MANAGER', 'EMPLOYEE'] as UserRole[]).map(role => <button key={role} disabled={role === activeRole} className="workspace-menu-row" onClick={() => changeRole(role)}><ShieldCheck size={18} />{role === activeRole ? 'Current workspace: ' : 'Switch to '}{role === 'ADMIN' ? 'Admin' : role === 'MANAGER' ? 'Manager' : 'Employee'}</button>)}
        <button className="workspace-menu-row text-rose-700" onClick={() => { dispatch(logout()); navigate('/login'); }}><LogOut size={18} />Sign out</button>
      </> : panel === 'help' ? <><p>Use the sidebar to open attendance, leave approvals and employee records.</p><p className="mt-3">Search with Ctrl K. Use the account menu to switch workspaces or sign out.</p></> : notifications.length ? notifications.map(item => <article key={item.id} className="workspace-notice"><h3>{item.title}</h3><p>{item.message}</p><p className="ops-muted mt-2">{item.timestamp}</p>{item.actionUrl && item.actionUrl.startsWith(`/${activeRole.toLowerCase()}/`) && <button className="ops-link" onClick={() => { setPanel(null); navigate(item.actionUrl!); }}>View details</button>}</article>) : <p>You’re all caught up.</p>}
    </dialog>}
    <CommandPalette key={location.pathname} isOpen={search} onClose={() => setSearch(false)} />
  </>;
};
