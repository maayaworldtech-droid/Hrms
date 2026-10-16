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

  const roleBadges: Record<UserRole, { label: string; dot: string; text: string; bg: string }> = {
    ADMIN: { label: 'Admin Portal', dot: 'bg-[#2A4FE0]', text: 'text-[#233FB8]', bg: 'bg-[#EEF4FF]' },
    MANAGER: { label: 'Manager Portal', dot: 'bg-[#F79009]', text: 'text-[#B54708]', bg: 'bg-[#FFFAEB]' },
    EMPLOYEE: { label: 'Self Service', dot: 'bg-[#12B76A]', text: 'text-[#027A48]', bg: 'bg-[#ECFDF3]' },
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#E4E7EC] bg-white/90 px-4 backdrop-blur-md sm:px-6">
        {/* Left: Hamburger & Maaya World Top Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleMobileMenu())}
            className="rounded-lg p-1.5 text-[#667085] hover:bg-[#F0F2F5] hover:text-[#101828] lg:hidden focus:outline-none"
            aria-label="Toggle navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="hidden rounded-lg p-1.5 text-[#667085] hover:bg-[#F0F2F5] hover:text-[#101828] lg:flex focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Maaya World Branding at Top */}
          <div className="flex items-center gap-2.5 pl-1 border-l border-[#E4E7EC] lg:border-l-0 lg:pl-0">
            <img
              src={maayaLogo}
              alt="Maaya World Logo"
              className="h-7 w-auto object-contain lg:hidden"
            />
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${roleBadges[activeRole].bg} ${roleBadges[activeRole].text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${roleBadges[activeRole].dot}`} />
              {roleBadges[activeRole].label}
            </span>
          </div>
        </div>

        {/* Center/Right: Quick Command Search & Role Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Command Palette Trigger Button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D0D5DD] bg-[#F7F8FA] hover:bg-white text-xs text-[#667085] hover:text-[#101828] transition-all cursor-pointer w-48 lg:w-60 shadow-xs"
          >
            <Search className="w-3.5 h-3.5 text-[#667085] shrink-0" />
            <span className="truncate text-xs">Search or jump to...</span>
            <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#D0D5DD] bg-white text-[#667085]">
              Ctrl+K
            </kbd>
          </button>

          {/* Quick Role Switcher */}
          <div className="relative" ref={roleMenuRef}>
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D0D5DD] bg-white hover:bg-[#F7F8FA] text-xs font-medium text-[#344054] transition-colors shadow-xs"
              title="Switch simulation workspace"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#2A4FE0] shrink-0" />
              <span className="hidden sm:inline text-[#667085]">Role:</span>
              <span className="text-[#101828] font-semibold">{activeRole}</span>
              <ChevronDown className="w-3 h-3 text-[#667085]" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-[#E4E7EC] bg-white p-1.5 shadow-lg ring-1 ring-black/5 z-50">
                <div className="px-3 py-2 border-b border-[#E4E7EC] mb-1">
                  <p className="text-xs font-semibold text-[#101828]">Switch Workspace Role</p>
                  <p className="text-[11px] text-[#667085]">Simulation of live RBAC permissions</p>
                </div>

                <button
                  onClick={() => handleRoleChange('ADMIN')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'ADMIN' ? 'bg-[#EEF4FF] text-[#233FB8] font-semibold' : 'text-[#344054] hover:bg-[#F0F2F5]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">Administrator</div>
                    <div className="text-[11px] text-[#667085]">Full HR, Payroll & Policies</div>
                  </div>
                  {activeRole === 'ADMIN' && <Check className="w-4 h-4 text-[#2A4FE0]" />}
                </button>

                <button
                  onClick={() => handleRoleChange('MANAGER')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'MANAGER' ? 'bg-[#FFFAEB] text-[#B54708] font-semibold' : 'text-[#344054] hover:bg-[#F0F2F5]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">Team Manager</div>
                    <div className="text-[11px] text-[#667085]">Direct reports & attendance</div>
                  </div>
                  {activeRole === 'MANAGER' && <Check className="w-4 h-4 text-[#F79009]" />}
                </button>

                <button
                  onClick={() => handleRoleChange('EMPLOYEE')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'EMPLOYEE' ? 'bg-[#ECFDF3] text-[#027A48] font-semibold' : 'text-[#344054] hover:bg-[#F0F2F5]'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs">Individual Employee</div>
                    <div className="text-[11px] text-[#667085]">Self attendance & payslips</div>
                  </div>
                  {activeRole === 'EMPLOYEE' && <Check className="w-4 h-4 text-[#12B76A]" />}
                </button>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-[#F0F2F5] transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-[#101828] text-white flex items-center justify-center font-semibold text-xs ring-1 ring-[#E4E7EC]">
                {user?.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || 'MW'}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-xs font-semibold text-[#101828] leading-tight">{user?.name || 'Staff'}</p>
                <p className="text-[11px] text-[#667085] leading-tight">{user?.employeeId || 'Maaya World'}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#667085] hidden md:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-[#E4E7EC] bg-white p-1.5 shadow-lg ring-1 ring-black/5 z-50">
                <div className="px-3 py-2 border-b border-[#E4E7EC]">
                  <p className="text-xs font-semibold text-[#101828]">{user?.name}</p>
                  <p className="text-[11px] text-[#667085] truncate">{user?.email}</p>
                  <p className="text-[11px] text-[#2A4FE0] font-medium mt-0.5">
                    {user?.employeeId} • Maaya World
                  </p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/employee/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#344054] hover:bg-[#F0F2F5] rounded-lg transition-colors text-left"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-[#667085]" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/employee/attendance');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#344054] hover:bg-[#F0F2F5] rounded-lg transition-colors text-left"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#667085]" />
                    <span>My Attendance</span>
                  </button>
                </div>

                <div className="border-t border-[#E4E7EC] pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#B42318] hover:bg-[#FEF3F2] rounded-lg transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5 text-[#F04438]" />
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
