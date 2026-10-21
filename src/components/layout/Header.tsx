import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@/store';
import { toggleMobileMenu } from '@/store/slices/uiSlice';
import maayaLogo from '@/assets/logo-new.png';
import { Menu } from 'lucide-react';
import { CommandPalette } from '@/components/common/CommandPalette';

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Mobile-only header with navigation toggle and brand logo */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => dispatch(toggleMobileMenu())}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none cursor-pointer"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <img
            src={maayaLogo}
            alt="Maaya World Logo"
            className="h-7 w-auto object-contain"
          />
        </div>
      </header>

      {/* Global Command Palette (accessible via Ctrl+K / Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
};
