import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { setUser, setPasswordChanged } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';
import { api } from '@/services/api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Lock, Mail, ShieldCheck, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';
import maayaLogo from '@/assets/logo-new.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid work email address'),
  password: z.string().min(4, 'Password is required'),
});

const forceChangeSchema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type ForceChangeValues = z.infer<typeof forceChangeSchema>;

export const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // First-time login forced password change state
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [showForceChange, setShowForceChange] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'shyamsundaryedla1@gmail.com',
      password: 'Admin@12345',
    },
  });

  const {
    register: registerChange,
    handleSubmit: handleSubmitChange,
    formState: { errors: changeErrors, isSubmitting: isSubmittingChange },
  } = useForm<ForceChangeValues>({
    resolver: zodResolver(forceChangeSchema),
  });

  const redirectByRole = (role: string) => {
    if (role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (role === 'MANAGER') {
      navigate('/manager/dashboard');
    } else {
      navigate('/employee/dashboard');
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({
        email: values.email,
        password: values.password,
      });

      if (!res.success) {
        throw new Error(res.message || 'Invalid credentials');
      }

      const userData = res.user;

      // Check if user is forced to change password on first login
      if (res.mustChangePassword) {
        setPendingUser(userData);
        setShowForceChange(true);
        dispatch(
          addToast({
            type: 'info',
            title: 'First-time Login Detected',
            message: 'For security, please set a new personal password before accessing your dashboard.',
          })
        );
        return;
      }

      dispatch(
        setUser({
          id: String(userData.id),
          name: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email,
          email: userData.email,
          role: userData.role || 'EMPLOYEE',
          designation: userData.jobTitle || userData.designation || 'Staff',
          department: userData.department || 'General',
          employeeId: userData.employeeCode || `MW-${userData.id}`,
          joiningDate: userData.dateOfJoining || userData.joiningDate || '2024-01-15',
          phone: userData.phone || '+91 98765 43210',
          address: userData.address || '',
          status: userData.status || 'ACTIVE',
          mustChangePassword: false,
        })
      );

      dispatch(
        addToast({
          type: 'success',
          title: 'Authentication Successful',
          message: `Logged in as ${userData.fullName || userData.email} (${userData.role || 'EMPLOYEE'})`,
        })
      );

      redirectByRole(userData.role || 'EMPLOYEE');
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Sign In Failed',
          message: err.message || 'Could not authenticate. Verify your credentials and database connection.',
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onForceChangePassword = async (values: ForceChangeValues) => {
    if (!pendingUser) return;
    try {
      const res = await api.auth.changePassword({
        email: pendingUser.email,
        newPassword: values.newPassword,
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to update password');
      }

      dispatch(setPasswordChanged());
      dispatch(
        setUser({
          id: String(pendingUser.id),
          name: pendingUser.fullName || pendingUser.email,
          email: pendingUser.email,
          role: pendingUser.role || 'EMPLOYEE',
          designation: pendingUser.jobTitle || 'Staff',
          department: pendingUser.department || 'General',
          employeeId: pendingUser.employeeCode || `MW-${pendingUser.id}`,
          joiningDate: pendingUser.dateOfJoining || '2024-01-15',
          phone: pendingUser.phone || '',
          address: pendingUser.address || '',
          status: 'ACTIVE',
          mustChangePassword: false,
        })
      );

      dispatch(
        addToast({
          type: 'success',
          title: 'Password Set Successfully',
          message: 'Your account is secured. Directing you to your portal...',
        })
      );

      redirectByRole(pendingUser.role || 'EMPLOYEE');
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Password Change Failed',
          message: err.message || 'Could not update password. Please try again.',
        })
      );
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Maaya World Official Logo */}
        <div className="flex items-center justify-center mb-4">
          <img
            src={maayaLogo}
            alt="Maaya World Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Maaya World HRMS
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Enterprise Workforce, Payroll & Operations Suite
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200/90 rounded-2xl sm:px-10">
          {showForceChange ? (
            /* First-Time Login: Mandatory Password Change View */
            <div className="space-y-4">
              <div className="text-center pb-2 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Create Your New Password</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Welcome to Maaya World, <strong className="text-slate-700">{pendingUser?.fullName}</strong>. Please set a secure password for your staff account.
                </p>
              </div>

              <form onSubmit={handleSubmitChange(onForceChangePassword)} className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 6 characters"
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={changeErrors.newPassword?.message}
                  {...registerChange('newPassword')}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Repeat new password"
                  leftIcon={<Lock className="w-4 h-4" />}
                  error={changeErrors.confirmPassword?.message}
                  {...registerChange('confirmPassword')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  isLoading={isSubmittingChange}
                  rightIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Activate Account & Enter Portal
                </Button>
              </form>
            </div>
          ) : (
            /* Main Login Form */
            <>
              {/* Quick Preset Buttons for verified database roles */}
              <div className="mb-6 pb-5 border-b border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Official Sign-In Credentials
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                    PostgreSQL Live
                  </span>
                </div>

                {/* Primary Admin Access Button */}
                <button
                  type="button"
                  onClick={() => handleQuickFill('shyamsundaryedla1@gmail.com', 'Admin@12345')}
                  className="w-full p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-left transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-blue-900">HR Administrator</div>
                    <div className="text-[11px] text-blue-700">shyamsundaryedla1@gmail.com</div>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    Use Admin
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('rajesh.kumar@maayaworld.com', 'Manager@12345')}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">Team Manager</div>
                    <div className="text-[10px] text-slate-500 truncate">rajesh.kumar@maaya...</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickFill('priya.sharma@maayaworld.com', 'Welcome@2026')}
                    className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">Staff Employee</div>
                    <div className="text-[10px] text-slate-500 truncate">priya.sharma@maaya...</div>
                  </button>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Work Email Address"
                  type="email"
                  placeholder="name@maayaworld.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={errors.email?.message}
                  {...register('email')}
                />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                    error={errors.password?.message}
                    {...register('password')}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mt-2"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Sign In to Workplace
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>256-bit SSL Encrypted & ZeptoMail Integrated</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
