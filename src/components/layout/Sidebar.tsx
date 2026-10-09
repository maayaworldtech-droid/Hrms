import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store';
import { toggleSidebar, setMobileMenuOpen } from '@/store/slices/uiSlice';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  FileSpreadsheet,
  Banknote,
  BarChart3,
  PartyPopper,
  Settings,
  UserCheck,
  User,
  Shield,
  Layers,
  ChevronLeft,
  X,
  CreditCard,
  Briefcase,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { activeRole } = useAppSelector((state) => state.auth);
  const { sidebarCollapsed, mobileMenuOpen } = useAppSelector((state) => state.ui);

  const adminNav = [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Employee Directory', path: '/admin/employees', icon: Users },
    { label: 'Attendance Records', path: '/admin/attendance', icon: Clock },
    { label: 'Leave Management', path: '/admin/leaves', icon: CalendarDays },
    { label: 'Salary Setup', path: '/admin/salary-setup', icon: FileSpreadsheet },
    { label: 'Payroll Processing', path: '/admin/payroll', icon: Banknote },
    { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { label: 'Company Holidays', path: '/admin/holidays', icon: PartyPopper },
    { label: 'Company Settings', path: '/admin/settings', icon: Settings },
  ];

  const managerNav = [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
    { label: 'Team Attendance', path: '/manager/attendance', icon: Clock },
    { label: 'Team Leave Approvals', path: '/manager/leaves', icon: CalendarDays },
    { label: 'Company Holidays', path: '/admin/holidays', icon: PartyPopper },
    { label: 'My Profile', path: '/employee/profile', icon: User },
  ];

  const employeeNav = [
    { label: 'Employee Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { label: 'My Attendance', path: '/employee/attendance', icon: Clock },
    { label: 'My Leave Requests', path: '/employee/leaves', icon: CalendarDays },
    { label: 'My Salary & Payslips', path: '/employee/salary', icon: CreditCard },
    { label: 'Company Holidays', path: '/admin/holidays', icon: PartyPopper },
    { label: 'My Profile', path: '/employee/profile', icon: User },
  ];

  const navItems = activeRole === 'ADMIN' ? adminNav : activeRole === 'MANAGER' ? managerNav : employeeNav;

  const closeMobile = () => dispatch(setMobileMenuOpen(false));

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out lg:static ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Logo Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white font-sans">PulseHRMS</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-indigo-400">Enterprise</span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={closeMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Pill */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Active Workspace</span>
              <span className="font-semibold text-indigo-400">{activeRole}</span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/30'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                  } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105`} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500">
              <span>PulseHRMS v2.6.4</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Cloud
              </span>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
