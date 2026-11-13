import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { api } from '@/services/api';
import { Employee } from '@/types';
import { Search, LayoutDashboard, Users, Clock, CalendarDays, Banknote, BarChart3, Settings, User as UserIcon, Briefcase, Wallet } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  role?: string[];
}

/** Keyboard-first jump box (Ctrl or Cmd K) for pages and, for admins, people. */
export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const activeRole = useAppSelector((state) => state.auth.activeRole);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listId = React.useId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen && !el.open) {
      el.showModal();
      inputRef.current?.focus();
      if (activeRole === 'ADMIN') {
        api.employees.getAll().then(setEmployees).catch(() => setEmployees([]));
      }
    } else if (!isOpen && el.open) {
      el.close();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen, activeRole]);

  const allCommands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'admin-dash', title: 'Dashboard', category: 'Admin', icon: LayoutDashboard, action: () => navigate('/admin/dashboard'), role: ['ADMIN'] },
      { id: 'employees', title: 'Employees', category: 'Admin', icon: Users, action: () => navigate('/admin/employees'), role: ['ADMIN'] },
      { id: 'attendance', title: 'Attendance', category: 'Admin', icon: Clock, action: () => navigate('/admin/attendance'), role: ['ADMIN'] },
      { id: 'leaves', title: 'Leave', category: 'Admin', icon: CalendarDays, action: () => navigate('/admin/leaves'), role: ['ADMIN'] },
      { id: 'on-duty', title: 'On Duty and claims', category: 'Admin', icon: Briefcase, action: () => navigate('/admin/on-duty'), role: ['ADMIN'] },
      { id: 'payroll', title: 'Payroll', category: 'Admin', icon: Banknote, action: () => navigate('/admin/payroll'), role: ['ADMIN'] },
      { id: 'reports', title: 'Reports', category: 'Admin', icon: BarChart3, action: () => navigate('/admin/reports'), role: ['ADMIN'] },
      { id: 'settings', title: 'Settings', category: 'Admin', icon: Settings, action: () => navigate('/admin/settings'), role: ['ADMIN'] },
      { id: 'mgr-dash', title: 'Team dashboard', category: 'Manager', icon: LayoutDashboard, action: () => navigate('/manager/dashboard'), role: ['MANAGER'] },
      { id: 'mgr-att', title: 'Team attendance', category: 'Manager', icon: Clock, action: () => navigate('/manager/attendance'), role: ['MANAGER'] },
      { id: 'mgr-leaves', title: 'Leave approvals', category: 'Manager', icon: CalendarDays, action: () => navigate('/manager/leaves'), role: ['MANAGER'] },
      { id: 'mgr-od', title: 'On Duty approvals', category: 'Manager', icon: Briefcase, action: () => navigate('/manager/on-duty'), role: ['MANAGER'] },
      { id: 'mgr-payroll', title: 'Payroll for my center', category: 'Manager', icon: Banknote, action: () => navigate('/manager/payroll'), role: ['MANAGER'] },
      { id: 'profile', title: 'My profile', category: 'Me', icon: UserIcon, action: () => navigate('/profile'), role: ['MANAGER', 'EMPLOYEE'] },
      { id: 'my-att', title: 'My attendance', category: 'Me', icon: Clock, action: () => navigate('/employee/dashboard'), role: ['MANAGER', 'EMPLOYEE'] },
      { id: 'my-leaves', title: 'My leave', category: 'Me', icon: CalendarDays, action: () => navigate('/employee/leaves'), role: ['MANAGER', 'EMPLOYEE'] },
      { id: 'my-salary', title: 'My payslips', category: 'Me', icon: Wallet, action: () => navigate('/employee/salary'), role: ['MANAGER', 'EMPLOYEE'] },
    ];
    const authorizedNav = nav.filter((item) => !item.role || item.role.includes(activeRole));
    const people: Command[] =
      activeRole === 'ADMIN'
        ? employees.map((emp) => ({
            id: `emp-${emp.id}`,
            title: `${emp.fullName} · ${emp.employeeCode} · ${emp.location}`,
            category: 'People',
            icon: Users,
            action: () => navigate(`/admin/employees?q=${encodeURIComponent(emp.employeeCode || emp.fullName)}`),
          }))
        : [];
    return [...authorizedNav, ...people];
  }, [navigate, employees, activeRole]);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allCommands.filter((c) => c.category !== 'People').slice(0, 12);
    return allCommands.filter((c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)).slice(0, 20);
  }, [allCommands, query]);

  const run = (command: Command) => {
    command.action();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) run(filteredCommands[selectedIndex]);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog w-full sm:max-w-xl sm:!mt-[12vh]"
      aria-label="Search"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {isOpen && (
        <div onKeyDown={onKeyDown}>
          <div className="flex items-center gap-3 border-b border-slate-200 px-4">
            <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={filteredCommands[selectedIndex] ? `${listId}-${filteredCommands[selectedIndex].id}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={activeRole === 'ADMIN' ? 'Search pages or people' : 'Search pages'}
              className="h-12 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />
            <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600" aria-hidden="true">
              Esc
            </kbd>
          </div>

          <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <li className="py-8 text-center text-sm text-slate-600">Nothing matches "{query}".</li>
            ) : (
              filteredCommands.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <li key={item.id} id={`${listId}-${item.id}`} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => run(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isSelected ? 'bg-brand-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-brand-700' : 'text-slate-500'}`} aria-hidden="true" />
                        <span className="truncate">{item.title}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-600">{item.category}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            <span>Type a page or a person's name</span>
          </div>
        </div>
      )}
    </dialog>
  );
};
