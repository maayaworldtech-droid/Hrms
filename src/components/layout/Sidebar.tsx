import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store';
import { setMobileMenuOpen, toggleSidebar } from '@/store/slices/uiSlice';
import { logout } from '@/store/slices/authSlice';
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
  Briefcase,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  LogOut,
} from 'lucide-react';

interface NavSection {
  title?: string;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

export const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, activeRole } = useAppSelector((state) => state.auth);
  const { sidebarCollapsed, mobileMenuOpen } = useAppSelector((state) => state.ui);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const adminSections: NavSection[] = [
    {
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'People',
      items: [
        { label: 'Employees', path: '/admin/employees', icon: Users },
        { label: 'Attendance', path: '/admin/attendance', icon: Clock },
        { label: 'Leave', path: '/admin/leaves', icon: CalendarDays },
        { label: 'On Duty & claims', path: '/admin/on-duty', icon: Briefcase },
      ],
    },
    {
      title: 'Finance',
      items: [{ label: 'Payroll', path: '/admin/payroll', icon: Banknote }],
    },
    {
      title: 'Insights',
      items: [
        { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
        { label: 'Settings', path: '/admin/settings', icon: Settings },
      ],
    },
  ];

  const managerSections: NavSection[] = [
    {
      items: [
        { label: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'My team',
      items: [
        { label: 'Attendance', path: '/manager/attendance', icon: Clock },
        { label: 'Leave approvals', path: '/manager/leaves', icon: CalendarDays },
        { label: 'On Duty approvals', path: '/manager/on-duty', icon: Briefcase },
      ],
    },
    {
      title: 'Personal',
      items: [
        { label: 'My profile', path: '/employee/profile', icon: User },
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
        { label: 'My On Duty (OD)', path: '/employee/on-duty', icon: Briefcase },
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
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white text-slate-600 border-r border-slate-200 transition-all duration-200 ease-in-out lg:static ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header with Maaya World Logo & Collapse Toggle */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 bg-white">
          <div className="flex items-center overflow-hidden">
            {sidebarCollapsed ? (
              <button
                onClick={() => dispatch(toggleSidebar())}
                className="w-full flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Expand sidebar"
              >
                <img
                  src="/favicon.png"
                  alt="Maaya World Logo"
                  className="h-7 w-7 object-contain"
                />
              </button>
            ) : (
              <img
                src={maayaLogo}
                alt="Maaya World Logo"
                className="h-9 w-auto max-w-[150px] object-contain"
              />
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="hidden lg:flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={closeMobile}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Main">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!sidebarCollapsed && section.title && (
                <p className="px-3 pb-1 text-xs font-medium text-slate-500">{section.title}</p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-brand-50 text-brand-700 font-semibold'
                          : 'text-slate-700 font-medium hover:bg-slate-100 hover:text-slate-900'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`
                    }
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-600" aria-hidden="true" />
                        )}
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                            isActive ? 'text-brand-600' : 'text-slate-500 group-hover:text-slate-700'
                          }`}
                        />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Profile Section */}
        <div className="border-t border-slate-200 p-3 bg-white relative" ref={profileMenuRef}>
          {profileMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 ${
                sidebarCollapsed ? 'left-2 w-52' : 'left-2.5 right-2.5'
              } rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-1.5 shadow-lg ring-1 ring-black/5 z-50`}
            >
              <div className="px-3 py-2 border-b border-[var(--border-default)] mb-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || ''}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
              </div>

              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  closeMobile();
                  navigate('/employee/profile');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>My profile</span>
              </button>

              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  closeMobile();
                  navigate('/employee/attendance');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors text-left cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>My attendance</span>
              </button>

              <div className="border-t border-[var(--border-default)] pt-1 mt-1">
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    closeMobile();
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-accent-600 hover:bg-accent-50 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-accent-500" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left focus:outline-none cursor-pointer ${
              sidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
            title={sidebarCollapsed ? `${user?.name || ''}${user?.employeeId ? ` (${user.employeeId})` : ''}` : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">
                {user?.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || ''}
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                    {user?.name || ''}
                  </p>
                  <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                    {activeRole === 'ADMIN' ? 'Administrator' : activeRole === 'MANAGER' ? 'Manager' : 'Employee'}
                    {user?.employeeId ? ` · ${user.employeeId}` : ''}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
