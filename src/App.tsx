import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, Outlet } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store, useAppSelector } from '@/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmployeeMobileLayout } from '@/components/layout/EmployeeMobileLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { ToastContainer } from '@/components/common/ToastContainer';

// Auth Feature Screens
import { Login } from '@/features/auth/Login';
import { ForgotPassword } from '@/features/auth/ForgotPassword';
import { ResetPassword } from '@/features/auth/ResetPassword';

// Screens load on demand so the phone portal does not download the admin workspace
const AdminDashboard = lazy(() => import('@/features/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const EmployeeManagement = lazy(() => import('@/features/admin/EmployeeManagement').then((m) => ({ default: m.EmployeeManagement })));
const AttendanceManagement = lazy(() => import('@/features/admin/AttendanceManagement').then((m) => ({ default: m.AttendanceManagement })));
const LeaveManagement = lazy(() => import('@/features/admin/LeaveManagement').then((m) => ({ default: m.LeaveManagement })));
const OnDutyManagement = lazy(() => import('@/features/admin/OnDutyManagement').then((m) => ({ default: m.OnDutyManagement })));
const PayrollProcessing = lazy(() => import('@/features/admin/PayrollProcessing').then((m) => ({ default: m.PayrollProcessing })));
const ReportsAnalytics = lazy(() => import('@/features/admin/ReportsAnalytics').then((m) => ({ default: m.ReportsAnalytics })));
const CompanySettings = lazy(() => import('@/features/admin/CompanySettings').then((m) => ({ default: m.CompanySettings })));
const ManagerDashboard = lazy(() => import('@/features/manager/ManagerDashboard').then((m) => ({ default: m.ManagerDashboard })));
const TeamAttendance = lazy(() => import('@/features/manager/TeamAttendance').then((m) => ({ default: m.TeamAttendance })));
const TeamLeaves = lazy(() => import('@/features/manager/TeamLeaves').then((m) => ({ default: m.TeamLeaves })));
const DailyCollections = lazy(() => import('@/features/manager/DailyCollections').then((m) => ({ default: m.DailyCollections })));
const TeamOnDuty = lazy(() => import('@/features/manager/TeamOnDuty').then((m) => ({ default: m.TeamOnDuty })));
const EmployeeDashboard = lazy(() => import('@/features/employee/EmployeeDashboard').then((m) => ({ default: m.EmployeeDashboard })));
const MyLeaves = lazy(() => import('@/features/employee/MyLeaves').then((m) => ({ default: m.MyLeaves })));
const MyOnDuty = lazy(() => import('@/features/employee/MyOnDuty').then((m) => ({ default: m.MyOnDuty })));
const MySalary = lazy(() => import('@/features/employee/MySalary').then((m) => ({ default: m.MySalary })));
const EmployeeProfile = lazy(() => import('@/features/employee/EmployeeProfile').then((m) => ({ default: m.EmployeeProfile })));

const RouteFallback: React.FC = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
    <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
  </div>
);

/** /profile opens inside the shell the person is working in. */
const ProfileRedirect: React.FC = () => {
  const activeRole = useAppSelector((state) => state.auth.activeRole);
  return <Navigate to={activeRole === 'ADMIN' ? '/admin/dashboard' : activeRole === 'MANAGER' ? '/account/profile' : '/employee/profile'} replace />;
};

const RoleRootRedirect: React.FC = () => {
  const { isAuthenticated, activeRole } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (activeRole === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (activeRole === 'MANAGER') {
    return <Navigate to="/manager/dashboard" replace />;
  }
  return <Navigate to="/employee/dashboard" replace />;
};

/** Wraps every route: error screen, loading state and the toast stack. */
const RootLayout: React.FC = () => (
  <ErrorBoundary>
    <Suspense fallback={<RouteFallback />}>
      <Outlet />
    </Suspense>
    <ToastContainer />
  </ErrorBoundary>
);

/**
 * A data router (rather than <BrowserRouter>) so screens can block navigation with useBlocker,
 * for example to stop an admin losing a half-finished new employee.
 */
const router = createBrowserRouter(
  createRoutesFromElements(
        <Route element={<RootLayout />}>
          {/* Public Authentication Screens */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Root Redirect based on authentication & role */}
          <Route path="/" element={<RoleRootRedirect />} />

          {/* Protected Application Workspace for Admin & Manager */}
          <Route element={<AppLayout />}>
            {/* Admin Module (Role Protected: ADMIN only) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            {/* One route for the list and /new, so moving between them keeps the screen mounted */}
            <Route
              path="/admin/employees/:mode?/:employeeId?"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <EmployeeManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/attendance"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AttendanceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leaves"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <LeaveManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/on-duty"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <OnDutyManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/payroll"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <PayrollProcessing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ReportsAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <CompanySettings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/account/profile"
              element={
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <div className="max-w-2xl">
                    <EmployeeProfile />
                  </div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manager/payroll"
              element={
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <PayrollProcessing />
                </ProtectedRoute>
              }
            />

            {/* Manager Module (Role Protected: MANAGER & ADMIN) */}
            <Route
              path="/manager/dashboard"
              element={
                <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/attendance"
              element={
                <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                  <TeamAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/leaves"
              element={
                <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                  <TeamLeaves />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/sales"
              element={
                <ProtectedRoute allowedRoles={['MANAGER']}>
                  <DailyCollections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/on-duty"
              element={
                <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
                  <TeamOnDuty />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Dedicated Mobile-First Employee Portal Shell */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE', 'MANAGER']}>
                <EmployeeMobileLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            {/* Attendance now lives on Home; keep old links working */}
            <Route path="/employee/attendance" element={<Navigate to="/employee/dashboard" replace />} />
            <Route path="/employee/leaves" element={<MyLeaves />} />
            <Route path="/employee/on-duty" element={<MyOnDuty />} />
            <Route path="/employee/salary" element={<MySalary />} />
            <Route path="/employee/profile" element={<EmployeeProfile />} />
          </Route>
          <Route path="/profile" element={<ProfileRedirect />} />

          {/* Catch-all Fallback */}
          <Route path="*" element={<RoleRootRedirect />} />
        </Route>
  )
);

export const AppContent: React.FC = () => <RouterProvider router={router} />;

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
