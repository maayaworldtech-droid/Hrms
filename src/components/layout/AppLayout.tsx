import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './operations.css';
import { useShiftTimes } from '@/utils/shiftUtils';

/** Desktop workspace shell for admins and managers: sidebar, top bar and a scrolling content column. */
export const AppLayout = () => {
  useShiftTimes();
  return (
    <div className="operations-app flex h-dvh overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <a href="#workspace-main" className="skip-link">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <main id="workspace-main" className="operations-content flex-1 overflow-y-auto" tabIndex={-1}>
          <div className="mx-auto max-w-7xl">
            <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading"><span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" /></div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};
