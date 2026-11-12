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
        <ShieldAlert className="mb-3 h-8 w-8 text-amber-600" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="text-xl font-semibold text-slate-900">You do not have access to this page</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          It is only available to {allowedRoles.map((r) => r.toLowerCase() + 's').join(' and ')}. You are signed in as {activeRole === 'ADMIN' ? 'an admin' : activeRole === 'MANAGER' ? 'a manager' : 'an employee'}.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              if (activeRole === 'ADMIN') navigate('/admin/dashboard');
              else if (activeRole === 'MANAGER') navigate('/manager/dashboard');
              else navigate('/employee/dashboard');
            }}
          >
            Go to my dashboard
          </Button>
          <Button
            variant="danger-ghost"
            onClick={handleSwitchAccount}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Sign in as someone else
          </Button>
        </div>
      </div>
    );
  }

  return children;
};
