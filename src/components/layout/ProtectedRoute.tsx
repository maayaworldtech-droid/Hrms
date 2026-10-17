import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { UserRole } from '@/types';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();
  const { isAuthenticated, activeRole } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md">
          Your current active role (<span className="font-semibold text-slate-900">{activeRole}</span>) does not have authorization to view this module. Use the role switcher in the top bar to simulate appropriate permissions.
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (activeRole === 'ADMIN') window.location.href = '/admin/dashboard';
              else if (activeRole === 'MANAGER') window.location.href = '/manager/dashboard';
              else window.location.href = '/employee/dashboard';
            }}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return children;
};
