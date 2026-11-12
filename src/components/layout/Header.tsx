import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@/store';
import { toggleMobileMenu } from '@/store/slices/uiSlice';
import maayaLogo from '@/assets/logo-new.png';
import { Menu } from 'lucide-react';
import { CommandPalette } from '@/components/common/CommandPalette';

/**
 * Phone-only top bar for the admin and manager screens: it holds the button that opens the
 * navigation. On desktop the sidebar is always visible, so there is no top bar at all.
 * Ctrl or Cmd + K still opens the quick search on any screen size.
 */
export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => dispatch(toggleMobileMenu())}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <img src={maayaLogo} alt="Maaya World" className="h-7 w-auto object-contain" />
      </header>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </>
  );
};
