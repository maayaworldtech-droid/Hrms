import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { switchRole, logout } from '@/store/slices/authSlice';
import { ToastContainer } from '@/components/common/ToastContainer';
import maayaLogo from '@/assets/logo-new.png';
import {
  Home,
  Clock,
  CalendarDays,
  CreditCard,
  User,
  Bell,
  LogOut,
  ShieldCheck,
  ChevronRight,
  X,
  MapPin,
  Megaphone,
} from 'lucide-react';

export const EmployeeMobileLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, activeRole } = useAppSelector((state) => state.auth);
  const { notifications } = useAppSelector((state) => state.ui);

  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const unreadAnnouncements = notifications.length;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { label: 'Home', path: '/employee/dashboard', icon: Home },
    { label: 'Attendance', path: '/employee/attendance', icon: Clock },
    { label: 'Leave', path: '/employee/leaves', icon: CalendarDays },
    { label: 'Payslips', path: '/employee/salary', icon: CreditCard },
    { label: 'Profile', path: '/employee/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9] font-sans antialiased text-slate-900 flex flex-col justify-between">
      {/* Container wrapper for mobile ergonomics on desktop / tablet screens */}
      <div className="w-full max-w-lg mx-auto min-h-screen bg-white border-x border-slate-200/80 flex flex-col relative shadow-sm">
        {/* Sticky Mobile App Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={maayaLogo} alt="Maaya World Logo" className="h-7 w-auto object-contain" />
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Staff Portal
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Announcements / Alerts Trigger */}
            <button
              onClick={() => {
                setAnnouncementsOpen(true);
                setUserMenuOpen(false);
              }}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative transition-colors"
              aria-label="Announcements"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {unreadAnnouncements > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
              )}
            </button>

            {/* Profile Avatar / Quick Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setAnnouncementsOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center hover:opacity-90 transition-opacity"
                aria-label="User menu"
              >
                {user?.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'PS'}
              </button>

              {/* Mobile Quick Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.name || 'Priya Sharma'}</p>
                    <p className="text-[11px] text-slate-500 truncate">Staff Code: MW-1003</p>
                    <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">Hyderabad Center</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/employee/profile');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                    >
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        My Profile
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        dispatch(switchRole('ADMIN'));
                        navigate('/admin/dashboard');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-lg text-left"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        Switch to Admin
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg text-left font-medium"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area (Mobile Viewport Optimized) */}
        <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
          <Outlet />
        </main>

        {/* Fixed Native App Bottom Navigation Bar */}
        <nav
          className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-40 max-w-lg mx-auto"
          aria-label="Bottom navigation"
        >
          <div className="grid grid-cols-5 h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center gap-1 transition-colors select-none ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'stroke-[2.5px] scale-105' : 'stroke-[1.8px]'
                    }`}
                  />
                  <span
                    className={`text-[10px] tracking-tight ${
                      isActive ? 'font-bold' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Announcements Modal / Bottom Sheet */}
      {announcementsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Company Announcements</h3>
              </div>
              <button
                onClick={() => setAnnouncementsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 divide-y divide-slate-100 overflow-y-auto space-y-3">
              <div className="pt-2 first:pt-0">
                <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">
                  Venue Operations
                </span>
                <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                  Weekend Festival Deployment & Shift Roster
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  All experience destinations across Hyderabad, Vizag, and Bhubaneswar are operating on extended weekend schedules. Morning shifts start promptly at 09:00 AM.
                </p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">Today, 08:30 AM</span>
              </div>

              <div className="pt-3">
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                  Payroll Remittance
                </span>
                <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                  September 2026 Monthly Salaries Disbursed
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Monthly salaries and bank transfers have been processed. You can review your detailed payslip and statutory deductions in the Payslips tab.
                </p>
                <span className="text-[10px] text-slate-400 font-mono mt-1 block">30 Sep 2026</span>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setAnnouncementsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast System */}
      <ToastContainer />
    </div>
  );
};
