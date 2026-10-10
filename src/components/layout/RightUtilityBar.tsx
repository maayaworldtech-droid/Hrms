import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { switchRole, logout } from '@/store/slices/authSlice';
import { UserRole } from '@/types';
import {
  LayoutGrid,
  Search,
  Megaphone,
  HelpCircle,
  ShieldCheck,
  User,
  LogOut,
  Sparkles,
  ExternalLink,
  X,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@/components/common/CommandPalette';

export const RightUtilityBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, activeRole } = useAppSelector((state) => state.auth);
  const { notifications } = useAppSelector((state) => state.ui);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRoleChange = (role: UserRole) => {
    dispatch(switchRole(role));
    setRoleMenuOpen(false);
    if (role === 'ADMIN') navigate('/admin/dashboard');
    else if (role === 'MANAGER') navigate('/manager/dashboard');
    else navigate('/employee/dashboard');
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <>
      <aside className="hidden lg:flex w-13 flex-col items-center justify-between border-l border-slate-200/90 bg-white py-4 z-20 shrink-0">
        {/* Top Actions */}
        <div className="flex flex-col items-center gap-4">
          {/* App Launcher 9-dots */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="App Launcher & Quick Command (Ctrl+K)"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setRoleMenuOpen(false);
                setNotifOpen(false);
                setHelpOpen(false);
              }}
              className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100 hover:ring-indigo-300 transition-all cursor-pointer"
              title={`${user?.name} (${activeRole})`}
            >
              {user?.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'US'}
            </button>

            {userMenuOpen && (
              <div className="absolute right-12 top-0 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {activeRole}
                    </span>
                    <span className="text-[10px] text-slate-400">{user?.department}</span>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/employee/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setRoleMenuOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Switch Role</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Search */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Global Search (Ctrl+K)"
          >
            <Search className="w-4.5 h-4.5" />
          </button>

          {/* Role Switcher Button */}
          <div className="relative">
            <button
              onClick={() => {
                setRoleMenuOpen(!roleMenuOpen);
                setUserMenuOpen(false);
                setNotifOpen(false);
                setHelpOpen(false);
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
              title="Switch Active Role"
            >
              <ShieldCheck className="w-4.5 h-4.5 text-indigo-600" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-12 top-0 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900">Switch Workspace Role</p>
                  <p className="text-[10px] text-slate-500">Live preview of RBAC permissions</p>
                </div>

                <button
                  onClick={() => handleRoleChange('ADMIN')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold">Administrator</div>
                    <div className="text-[10px] text-slate-400">Sarah Jenkins (Full HR)</div>
                  </div>
                  {activeRole === 'ADMIN' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>

                <button
                  onClick={() => handleRoleChange('MANAGER')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'MANAGER' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold">Team Manager</div>
                    <div className="text-[10px] text-slate-400">Rajesh Kumar (Direct Reports)</div>
                  </div>
                  {activeRole === 'MANAGER' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </button>

                <button
                  onClick={() => handleRoleChange('EMPLOYEE')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-colors ${
                    activeRole === 'EMPLOYEE' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold">Individual Employee</div>
                    <div className="text-[10px] text-slate-400">Priya Sharma (Self Service)</div>
                  </div>
                  {activeRole === 'EMPLOYEE' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Announcements / Notifications with Red Dot */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setUserMenuOpen(false);
                setRoleMenuOpen(false);
                setHelpOpen(false);
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
              title="Notifications & Updates"
            >
              <Megaphone className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] font-bold text-rose-600 font-mono leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-12 top-0 w-80 rounded-xl border border-slate-200 bg-white p-0 shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Updates & Alerts</span>
                  <span className="text-xs text-indigo-600 font-semibold">
                    {unreadCount} new
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-3 text-xs hover:bg-slate-50">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{notif.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{notif.timestamp}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px]">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Help & Documentation */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <button
              onClick={() => {
                setHelpOpen(!helpOpen);
                setUserMenuOpen(false);
                setRoleMenuOpen(false);
                setNotifOpen(false);
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Help & System Info"
            >
              <HelpCircle className="w-4.5 h-4.5" />
            </button>

            {helpOpen && (
              <div className="absolute right-12 bottom-0 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl z-50 text-xs">
                <div className="font-bold text-slate-900 mb-1">PulseHRMS Suite</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Enterprise HR & Indian Statutory Payroll system with automated EPF, PT & TDS rules.
                </p>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between">
                  <span>Version 2.6.4</span>
                  <span className="text-emerald-600 font-semibold">SOC2 Type II</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
};
