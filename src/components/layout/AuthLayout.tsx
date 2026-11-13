import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import maayaLogo from '@/assets/logo-new.png';

interface AuthLayoutProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}

const POINTS = [
  'Staff check in with their face when they arrive at the center',
  'Center managers approve leave and outside work from their phone',
  'Salaries and payslips for every center, every month',
];

/**
 * Shared shell for sign-in, forgot password and reset password. On large screens a brand panel in
 * deep logo blue sits beside the form. The logo sits centred above the form on every screen size.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
    <aside className="hidden lg:flex flex-col justify-between bg-brand-900 px-12 py-10 text-white">
      <span aria-hidden="true" />

      <div className="max-w-md">
        <p className="text-3xl font-semibold leading-tight tracking-tight">
          Run every Maaya World center from one place.
        </p>
        <ul className="mt-8 space-y-3">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-brand-100">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-brand-200">Maaya World team app</p>
    </aside>

    <main className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:min-h-0 lg:px-16">
      <div className="mx-auto w-full max-w-sm">
        <img src={maayaLogo} alt="Maaya World" className="mx-auto mb-10 h-20 w-auto object-contain sm:h-24" />
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-sm text-slate-600">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  </div>
);
