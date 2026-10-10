import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store';
import { setMobileMenuOpen, toggleSidebar } from '@/store/slices/uiSlice';
import { switchRole } from '@/store/slices/authSlice';
import maayaLogo from '@/assets/logo-new.png';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Banknote,
  BarChart3,
  Settings,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';

interface NavSection {
  title?: string;
  hasAddAction?: boolean;
  onAddClick?: () => void;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { activeRole } = useAppSelector((state) => state.auth);
  const { sidebarCollapsed, mobileMenuOpen } = useAppSelector((state) => state.ui);

  const adminSections: NavSection[] = [
    {
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Workforce',
      hasAddAction: true,
      onAddClick: () => navigate('/admin/employees'),
      items: [
        { label: 'Employee Directory', path: '/admin/employees', icon: Users },
        { label: 'Attendance Records', path: '/admin/attendance', icon: Clock },
        { label: 'Leave Management', path: '/admin/leaves', icon: CalendarDays },
      ],
    },
    {
      title: 'Payroll & Statutory',
      items: [
        { label: 'Payroll Processing', path: '/admin/payroll', icon: Banknote },
      ],
    },
    {
      title: 'Analytics & Compliance',
      items: [
        { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
        { label: 'Company Settings', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const managerSections: NavSection[] = [
    {
      items: [
        { label: 'Manager Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Team Management',
      items: [
        { label: 'Team Attendance', path: '/manager/attendance', icon: Clock },
        { label: 'Team Leave Approvals', path: '/manager/leaves', icon: CalendarDays },
      ],
    },
    {
      title: 'Personal',
      items: [
        { label: 'My Profile', path: '/employee/profile', icon: User },
      ],
    },
  ];

  const employeeSections: NavSection[] = [
    {
      items: [
        { label: 'My Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Time & Compensation',
      items: [
        { label: 'My Attendance', path: '/employee/attendance', icon: Clock },
        { label: 'My Leave Requests', path: '/employee/leaves', icon: CalendarDays },
        { label: 'My Salary & Payslips', path: '/employee/salary', icon: CreditCard },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'My Profile', path: '/employee/profile', icon: User },
      ],
    },
  ];

  const sections =
    activeRole === 'ADMIN'
      ? adminSections
      : activeRole === 'MANAGER'
      ? managerSections
      : employeeSections;

  const closeMobile = () => dispatch(setMobileMenuOpen(false));

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Container (Zoho CPaaS Inspiration) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#070D19] text-slate-300 border-r border-slate-800/80 transition-all duration-200 ease-in-out lg:static ${
          sidebarCollapsed ? 'w-18' : 'w-62'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header with Maaya World Logo */}
        <div className="flex h-16 items-center justify-between px-4 sm:px-5 border-b border-slate-800/80 bg-[#070D19]">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'justify-start'} overflow-hidden`}>
            {sidebarCollapsed ? (
              <img
                src="/favicon.png"
                alt="Maaya World Logo"
                className="h-9 w-9 object-contain"
              />
            ) : (
              <img
                src={maayaLogo}
                alt="Maaya World Logo"
                className="h-[46px] w-auto max-w-[190px] object-contain drop-shadow-[0_0_12px_rgba(227,58,53,0.25)]"
              />
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={closeMobile}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!sidebarCollapsed && section.title && (
                <div className="flex items-center justify-between px-2.5 pt-2 pb-1">
                  <span className="text-[11px] font-medium text-slate-400">
                    {section.title}
                  </span>
                  {section.hasAddAction && (
                    <button
                      onClick={section.onAddClick}
                      className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800/60 transition-colors"
                      title="Quick Action"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-[#14213B] text-white font-semibold border border-[#23355C] shadow-xs'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 font-medium'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Mobile-Only Role Switcher Drawer Section */}
        <div className="lg:hidden p-3 border-t border-slate-800 bg-[#060B15]/95 space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block px-1">
            Switch View
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              onClick={() => {
                dispatch(switchRole('ADMIN'));
                closeMobile();
                navigate('/admin/dashboard');
              }}
              className={`p-2 rounded-lg text-center transition-colors ${
                activeRole === 'ADMIN'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => {
                dispatch(switchRole('MANAGER'));
                closeMobile();
                navigate('/manager/dashboard');
              }}
              className={`p-2 rounded-lg text-center transition-colors ${
                activeRole === 'MANAGER'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => {
                dispatch(switchRole('EMPLOYEE'));
                closeMobile();
                navigate('/employee/dashboard');
              }}
              className={`p-2 rounded-lg text-center transition-colors ${
                activeRole === 'EMPLOYEE'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Employee
            </button>
          </div>
        </div>

        {/* Bottom Workspace Status & Collapse Toggle */}
        <div className="p-2.5 border-t border-slate-800/80 bg-[#060B15] flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between w-full px-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate">Maaya World Cloud</span>
              </div>
              <button
                onClick={() => dispatch(toggleSidebar())}
                className="hidden lg:flex p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="hidden lg:flex mx-auto p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
