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
        { label: 'Leave Records', path: '/admin/leaves', icon: CalendarDays },
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
          className="fixed inset-0 z-40 bg-[#101828]/50 backdrop-blur-xs lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white text-[#475467] border-r border-[#E4E7EC] transition-all duration-200 ease-in-out lg:static ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header with Maaya World Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-[#E4E7EC] bg-white">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'justify-start'} overflow-hidden`}>
            {sidebarCollapsed ? (
              <img
                src="/favicon.png"
                alt="Maaya World Logo"
                className="h-7 w-7 object-contain"
              />
            ) : (
              <img
                src={maayaLogo}
                alt="Maaya World Logo"
                className="h-8 w-auto max-w-[170px] object-contain"
              />
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={closeMobile}
            className="rounded-lg p-1.5 text-[#667085] hover:bg-[#F0F2F5] hover:text-[#101828] lg:hidden"
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
                <div className="flex items-center justify-between px-3 pt-3 pb-1">
                  <span className="text-[11px] font-semibold text-[#475467] tracking-tight">
                    {section.title}
                  </span>
                  {section.hasAddAction && (
                    <button
                      onClick={section.onAddClick}
                      className="text-[#475467] hover:text-[#101828] p-0.5 rounded hover:bg-[#F0F2F5] transition-colors"
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
                      `group flex items-center gap-2.5 px-3 py-2 text-sm transition-all relative ${
                        isActive
                          ? 'bg-[#EEF4FF] text-[#2A4FE0] font-semibold border-l-3 border-[#2A4FE0] rounded-r-lg'
                          : 'text-[#344054] hover:bg-[#F0F2F5] hover:text-[#101828] font-medium rounded-lg'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-colors" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Mobile-Only Role Switcher Drawer Section */}
        <div className="lg:hidden p-3 border-t border-[#E4E7EC] bg-[#F7F8FA] space-y-2">
          <span className="text-[11px] font-medium text-[#667085] block px-1">
            Switch View
          </span>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              onClick={() => {
                dispatch(switchRole('ADMIN'));
                closeMobile();
                navigate('/admin/dashboard');
              }}
              className={`p-2 rounded-lg text-center font-medium transition-colors ${
                activeRole === 'ADMIN'
                  ? 'bg-[#2A4FE0] text-white'
                  : 'bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F0F2F5]'
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
              className={`p-2 rounded-lg text-center font-medium transition-colors ${
                activeRole === 'MANAGER'
                  ? 'bg-[#2A4FE0] text-white'
                  : 'bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F0F2F5]'
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
              className={`p-2 rounded-lg text-center font-medium transition-colors ${
                activeRole === 'EMPLOYEE'
                  ? 'bg-[#2A4FE0] text-white'
                  : 'bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F0F2F5]'
              }`}
            >
              Employee
            </button>
          </div>
        </div>

        {/* Bottom Workspace Status & Collapse Toggle */}
        <div className="p-2.5 border-t border-[#E4E7EC] bg-[#F7F8FA] flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between w-full px-1 text-xs text-[#667085]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[#12B76A] shrink-0" />
                <span className="truncate font-medium text-[#344054]">Maaya World HRMS</span>
              </div>
              <button
                onClick={() => dispatch(toggleSidebar())}
                className="hidden lg:flex p-1 rounded-md hover:bg-[#E4E7EC] text-[#667085] hover:text-[#101828] transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="hidden lg:flex mx-auto p-1 rounded-md hover:bg-[#E4E7EC] text-[#667085] hover:text-[#101828] transition-colors"
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
