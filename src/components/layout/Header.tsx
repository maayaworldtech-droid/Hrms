import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { switchRole, logout } from '@/store/slices/authSlice';
import { toggleSidebar, toggleMobileMenu, markAllNotificationsAsRead } from '@/store/slices/uiSlice';
import { UserRole } from '@/types';
import {
  Menu,
  Bell,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, activeRole } = useAppSelector((state) => state.auth);
  const { notifications } = useAppSelector((state) => state.ui);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    dispatch(switchRole(newRole));
    setRoleMenuOpen(false);
    if (newRole === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (newRole === 'MANAGER') {
      navigate('/manager/dashboard');
    } else {
      navigate('/employee/dashboard');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const roleLabels: Record<UserRole, { label: string; badge: string; color: string }> = {
    ADMIN: { label: 'Administrator', badge: 'Admin Portal', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    MANAGER: { label: 'People Manager', badge: 'Manager Portal', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    EMPLOYEE: { label: 'Staff Member', badge: 'Self Service', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleMobileMenu())}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:flex focus:outline-none"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 hidden sm:inline">Portal:</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${roleLabels[activeRole].color}`}>
            {roleLabels[activeRole].badge}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Role Switcher */}
        <div className="relative" ref={roleMenuRef}>
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            title="Switch simulation role"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="hidden md:inline">Role:</span>
            <span className="text-indigo-600 font-bold">{activeRole}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-xs font-bold text-slate-900">Switch Active Role</p>
                <p className="text-[11px] text-slate-500">Live preview of role-based permissions</p>
              </div>

              <button
                onClick={() => handleRoleChange('ADMIN')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                  activeRole === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold">Administrator</div>
                  <div className="text-[10px] text-slate-500">Full HR, Payroll & Settings access</div>
                </div>
                {activeRole === 'ADMIN' && <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
              </button>

              <button
                onClick={() => handleRoleChange('MANAGER')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                  activeRole === 'MANAGER' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold">Team Manager</div>
                  <div className="text-[10px] text-slate-500">Team attendance, leave approvals</div>
                </div>
                {activeRole === 'MANAGER' && <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
              </button>

              <button
                onClick={() => handleRoleChange('EMPLOYEE')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                  activeRole === 'EMPLOYEE' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold">Individual Employee</div>
                  <div className="text-[10px] text-slate-500">Self attendance punch, leave, payslips</div>
                </div>
                {activeRole === 'EMPLOYEE' && <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notifMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-0 shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => dispatch(markAllNotificationsAsRead())}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Mark all as read
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-indigo-50/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{notif.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">{notif.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                    {notif.actionUrl && (
                      <button
                        onClick={() => {
                          setNotifMenuOpen(false);
                          navigate(notif.actionUrl!);
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        <span>View details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100 transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-100">
              {user?.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'US'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-xs font-semibold text-slate-900 leading-none">{user?.name || 'Account'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-none">{user?.designation || 'Staff'}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <p className="text-[10px] text-indigo-600 font-semibold mt-1">{user?.employeeId} • {user?.department}</p>
              </div>

              <div className="pt-1 pb-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/employee/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>My Employee Profile</span>
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/employee/attendance');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                >
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Time & Attendance</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
