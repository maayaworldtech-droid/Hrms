import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { UserRole } from '@/types';
import { ShieldAlert, LogOut } from 'lucide-react';
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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, activeRole } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    const handleSwitchAccount = () => {
      dispatch(logout());
      navigate('/login');
    };

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md">
          Your current account role (<span className="font-semibold text-slate-900">{activeRole}</span>) does not have authorization to view this module.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (activeRole === 'ADMIN') navigate('/admin/dashboard');
              else if (activeRole === 'MANAGER') navigate('/manager/dashboard');
              else navigate('/employee/dashboard');
            }}
          >
            Go to My Dashboard
          </Button>
          <Button
            variant="outline"
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
            onClick={handleSwitchAccount}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Switch Account
          </Button>
        </div>
      </div>
    );
  }

  return children;
};
