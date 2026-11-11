import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import './operations.css';

export const AppLayout = () => (
  <div className="operations-app flex h-dvh overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden min-w-0">
      <Header />
      <main className="operations-content flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  </div>
);
