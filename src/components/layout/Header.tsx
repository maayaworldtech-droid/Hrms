import React, { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { switchRole, logout } from '@/store/slices/authSlice';
import { toggleSidebar, toggleMobileMenu, markAllNotificationsAsRead } from '@/store/slices/uiSlice';
import { UserRole } from '@/types';
import maayaLogo from '@/assets/logo-new.png';
import {
  Menu,
  Bell,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Clock,
  ExternalLink,
  Search,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/common/CommandPalette';

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, activeRole } = useAppSelector((state) => state.auth);
  const { notifications } = useAppSelector((state) => state.ui);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const roleBadges: Record<UserRole, { label: string; color: string }> = {
    ADMIN: { label: 'Admin Portal', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    MANAGER: { label: 'Manager Portal', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    EMPLOYEE: { label: 'Self Service', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md sm:px-6">
        {/* Left: Hamburger & Maaya World Top Branding */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => dispatch(toggleMobileMenu())}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden focus:outline-none"
            aria-label="Toggle navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:flex focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Maaya World Branding at Top */}
          <div className="flex items-center gap-2.5 pl-1 border-l border-slate-200 lg:border-l-0 lg:pl-0">
            <img
              src={maayaLogo}
              alt="Maaya World Logo"
              className="h-7 w-auto object-contain"
            />
            <span
              className={`text-xs font-semibold ${activeRole === 'ADMIN' ? 'text-indigo-600' : activeRole === 'MANAGER' ? 'text-amber-600' : 'text-emerald-600'} ml-1`}
            >
              {roleBadges[activeRole].label}
            </span>
          </div>
        </div>

        {/* Center/Right: Quick Command Search & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Command Palette Trigger Button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-xs text-slate-500 hover:text-slate-700 transition-colors cursor-pointer w-44 lg:w-56"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-[11px]">Search or run command...</span>
            <kbd className="ml-auto text-[9px] font-mono px-1 py-0.2 rounded border border-slate-200 bg-white text-slate-400">
              Ctrl+K
            </kbd>
          </button>

          {/* Quick Role Switcher */}
          <div className="relative" ref={roleMenuRef}>
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
              title="Switch simulation workspace"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="hidden sm:inline text-slate-500 text-[11px]">Role:</span>
              <span className="text-slate-900 font-semibold text-[11px]">{activeRole}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50">
                <div className="px-2.5 py-1.5 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900">Switch Workspace Role</p>
                  <p className="text-[10px] text-slate-400">Simulation of live RBAC permissions</p>
                </div>

                <button
                  onClick={() => handleRoleChange('ADMIN')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">Administrator</div>
                    <div className="text-[10px] text-slate-400">Full HR, Payroll & Policies</div>
                  </div>
                  {activeRole === 'ADMIN' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>

                <button
                  onClick={() => handleRoleChange('MANAGER')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'MANAGER' ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">Team Manager</div>
                    <div className="text-[10px] text-slate-400">Direct reports & attendance</div>
                  </div>
                  {activeRole === 'MANAGER' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>

                <button
                  onClick={() => handleRoleChange('EMPLOYEE')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'EMPLOYEE' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">Individual Employee</div>
                    <div className="text-[10px] text-slate-400">Self attendance & payslips</div>
                  </div>
                  {activeRole === 'EMPLOYEE' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-100 transition-colors focus:outline-none"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-200">
                {user?.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'MW'}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.name || 'Staff'}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{user?.employeeId || 'Maaya World'}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden md:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50">
                <div className="px-2.5 py-1.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                  <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                    {user?.employeeId} • Maaya World
                  </p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/employee/profile');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/employee/attendance');
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Attendance</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
};
