import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '@/components/common/ToastContainer';
import './operations.css';

export const AppLayout = () => (
  <div className="operations-app flex h-dvh overflow-hidden bg-[#F7F8FA] text-[#101828]">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden min-w-0">
      <Header />
      <main className="operations-content flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl"><Outlet /></div>
      </main>
    </div>
    <ToastContainer />
  </div>
);
