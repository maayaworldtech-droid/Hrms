import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store, useAppSelector } from '@/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

// Auth Feature Screens (Screens 1, 2, 3)
import { Login } from '@/features/auth/Login';
import { ForgotPassword } from '@/features/auth/ForgotPassword';
import { ResetPassword } from '@/features/auth/ResetPassword';

// Admin Feature Screens (Screens 4 - 12)
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { EmployeeManagement } from '@/features/admin/EmployeeManagement';
import { AttendanceManagement } from '@/features/admin/AttendanceManagement';
import { LeaveManagement } from '@/features/admin/LeaveManagement';
import { SalarySetup } from '@/features/admin/SalarySetup';
import { PayrollProcessing } from '@/features/admin/PayrollProcessing';
import { ReportsAnalytics } from '@/features/admin/ReportsAnalytics';
import { HolidayCalendar } from '@/features/admin/HolidayCalendar';
import { CompanySettings } from '@/features/admin/CompanySettings';

// Manager Feature Screens (Screens 13, 14, 15)
import { ManagerDashboard } from '@/features/manager/ManagerDashboard';
import { TeamAttendance } from '@/features/manager/TeamAttendance';
import { TeamLeaves } from '@/features/manager/TeamLeaves';

// Employee Feature Screens (Screens 16, 17, 18, 19, 20)
import { EmployeeDashboard } from '@/features/employee/EmployeeDashboard';
import { MyAttendance } from '@/features/employee/MyAttendance';
import { MyLeaves } from '@/features/employee/MyLeaves';
import { MySalary } from '@/features/employee/MySalary';
import { EmployeeProfile } from '@/features/employee/EmployeeProfile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const RoleRootRedirect: React.FC = () => {
  const { activeRole, isAuthenticated } = useAppSelector((state) => state.auth);

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

export const AppContent: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Public Authentication Screens */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Application Workspace */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<RoleRootRedirect />} />

            {/* Admin Module (Role Protected) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees"
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
              path="/admin/salary-setup"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <SalarySetup />
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
              path="/admin/holidays"
              element={
                <ProtectedRoute>
                  <HolidayCalendar />
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

            {/* Manager Module (Role Protected) */}
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

            {/* Employee Self-Service Module */}
            <Route
              path="/employee/dashboard"
              element={
                <ProtectedRoute>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/attendance"
              element={
                <ProtectedRoute>
                  <MyAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/leaves"
              element={
                <ProtectedRoute>
                  <MyLeaves />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/salary"
              element={
                <ProtectedRoute>
                  <MySalary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee/profile"
              element={
                <ProtectedRoute>
                  <EmployeeProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <EmployeeProfile />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<RoleRootRedirect />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </Provider>
  );
}
