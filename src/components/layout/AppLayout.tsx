import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { RightUtilityBar } from './RightUtilityBar';
import { ToastContainer } from '@/components/common/ToastContainer';
import { useAppDispatch } from '@/store';
import { toggleMobileMenu } from '@/store/slices/uiSlice';
import { Menu } from 'lucide-react';
import maayaLogo from '@/assets/logo-new.png';

export const AppLayout: React.FC = () => {
  const dispatch = useAppDispatch();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F9] font-sans antialiased">
      {/* Left Zoho-style Dark Sidebar with Maaya World Branding */}
      <Sidebar />

      {/* Main Content Canvas - No Top Header on Desktop (Matches Zoho CPaaS Inspiration) */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Minimal Mobile-Only Bar (Hidden on desktop) */}
        <div className="lg:hidden flex h-14 items-center justify-between px-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => dispatch(toggleMobileMenu())}
              className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img src={maayaLogo} alt="Maaya World Logo" className="h-8 w-auto object-contain" />
          </div>
        </div>

        {/* Workspace Content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Right Zoho-style Vertical Utility Rail */}
      <RightUtilityBar />

      {/* Global Toast System */}
      <ToastContainer />
    </div>
  );
};
