import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { api } from '@/services/api';
import { Employee } from '@/types';
import {
  Search,
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Banknote,
  BarChart3,
  Settings,
  User as UserIcon,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      api.employees.getAll().then(setEmployees);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // All actionable commands
  const allCommands = useMemo(() => {
    const navItems = [
      {
        id: 'nav-admin-dash',
        title: 'Admin Executive Dashboard',
        category: 'Navigation',
        icon: LayoutDashboard,
        action: () => navigate('/admin/dashboard'),
        role: ['ADMIN'],
      },
      {
        id: 'nav-employees',
        title: 'Employee Directory & Roster',
        category: 'Navigation',
        icon: Users,
        action: () => navigate('/admin/employees'),
        role: ['ADMIN'],
      },
      {
        id: 'nav-attendance-mgmt',
        title: 'Attendance Records & Time Tracking',
        category: 'Navigation',
        icon: Clock,
        action: () => navigate('/admin/attendance'),
        role: ['ADMIN'],
      },
      {
        id: 'nav-leaves-mgmt',
        title: 'Company Leave Records',
        category: 'Navigation',
        icon: CalendarDays,
        action: () => navigate('/admin/leaves'),
        role: ['ADMIN'],
      },
      {
        id: 'nav-payroll',
        title: 'Payroll Processing & Disbursals',
        category: 'Navigation',
        icon: Banknote,
        action: () => navigate('/admin/payroll'),
        role: ['ADMIN'],
      },
      {
        id: 'nav-reports',
        title: 'Workforce Reports & Analytics',
        category: 'Navigation',
        icon: BarChart3,
        action: () => navigate('/admin/reports'),
        role: ['ADMIN'],
      },
      {
        id: 'nav-settings',
        title: 'Corporate Settings & Compliance',
        category: 'Navigation',
        icon: Settings,
        action: () => navigate('/admin/settings'),
        role: ['ADMIN'],
      },
      {
        id: 'nav-mgr-dash',
        title: 'Manager Team Dashboard',
        category: 'Navigation',
        icon: LayoutDashboard,
        action: () => navigate('/manager/dashboard'),
        role: ['MANAGER'],
      },
      {
        id: 'nav-mgr-att',
        title: 'Team Attendance & Approvals',
        category: 'Navigation',
        icon: Clock,
        action: () => navigate('/manager/attendance'),
        role: ['MANAGER'],
      },
      {
        id: 'nav-mgr-leaves',
        title: 'Team Leave Requests Queue',
        category: 'Navigation',
        icon: CalendarDays,
        action: () => navigate('/manager/leaves'),
        role: ['MANAGER'],
      },
      {
        id: 'nav-emp-dash',
        title: 'Employee Self-Service Dashboard',
        category: 'Navigation',
        icon: LayoutDashboard,
        action: () => navigate('/employee/dashboard'),
      },
      {
        id: 'nav-my-att',
        title: 'My Daily Attendance & Timesheets',
        category: 'Navigation',
        icon: Clock,
        action: () => navigate('/employee/attendance'),
      },
      {
        id: 'nav-my-leaves',
        title: 'My Leave Applications & Balance',
        category: 'Navigation',
        icon: CalendarDays,
        action: () => navigate('/employee/leaves'),
      },
      {
        id: 'nav-my-salary',
        title: 'My Salary Structure & Payslips',
        category: 'Navigation',
        icon: CreditCard,
        action: () => navigate('/employee/salary'),
      },
      {
        id: 'nav-my-profile',
        title: 'My Employee Profile File',
        category: 'Navigation',
        icon: UserIcon,
        action: () => navigate('/employee/profile'),
      },
    ];

    const employeeMatches = employees.map((emp) => ({
      id: `emp-${emp.id}`,
      title: `${emp.fullName} (${emp.employeeCode}) — ${emp.location} Center`,
      category: 'Employees Directory',
      icon: Users,
      action: () => {
        navigate('/admin/employees');
      },
    }));

    return [...navItems, ...employeeMatches];
  }, [navigate, employees]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands.slice(0, 10);
    const q = query.toLowerCase().trim();
    return allCommands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [allCommands, query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative mx-auto max-w-xl rounded-xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-100">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search pages, employees, actions, or switch roles..."
            className="w-full px-3 py-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-50">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching pages, actions, or employees found for "{query}".
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/80 text-indigo-950 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Use</span>
            <kbd className="px-1 py-0.2 rounded border bg-white border-slate-200 font-mono text-[9px]">↑</kbd>
            <kbd className="px-1 py-0.2 rounded border bg-white border-slate-200 font-mono text-[9px]">↓</kbd>
            <span>to navigate</span>
            <kbd className="px-1.5 py-0.2 rounded border bg-white border-slate-200 font-mono text-[9px]">↵</kbd>
            <span>to select</span>
          </div>
          <span>PulseHRMS Quick Actions</span>
        </div>
      </div>
    </div>
  );
};
