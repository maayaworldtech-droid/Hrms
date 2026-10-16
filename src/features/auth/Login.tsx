import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { setUser, setPasswordChanged } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';
import { api } from '@/services/api';
import { Button } from '@/components/common/Button';
import { Lock, Mail, ArrowRight, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import maayaLogo from '@/assets/logo-new.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid corporate email address'),
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
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Extract email dynamically from URL query parameters (e.g. from onboarding email link)
  const initialEmail = searchParams.get('email') || '';

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
      email: initialEmail,
      password: '',
    },
  });

  // Sync email when search params change
  useEffect(() => {
    if (initialEmail) {
      setValue('email', initialEmail);
    }
  }, [initialEmail, setValue]);

  const {
    register: registerChange,
    handleSubmit: handleSubmitChange,
    formState: { errors: changeErrors, isSubmitting: isSubmittingChange },
  } = useForm<ForceChangeValues>({
    resolver: zodResolver(forceChangeSchema),
  });

  // Automatically route user to their respective portal based strictly on their backend role
  const redirectByRole = (role: string) => {
    const cleanRole = (role || '').toUpperCase();
    if (cleanRole === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (cleanRole === 'MANAGER') {
      navigate('/manager/dashboard');
    } else {
      navigate('/employee/dashboard');
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({
        email: values.email.trim(),
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
            title: 'Initial Sign-In Verification',
            message: 'Please set your permanent password to complete your account setup.',
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
          title: 'Welcome Back',
          message: `Signed in as ${userData.fullName || userData.email}. Redirecting to your workplace...`,
        })
      );

      redirectByRole(userData.role || 'EMPLOYEE');
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Authentication Failed',
          message: err.message || 'Unable to sign in. Please verify your corporate email and password.',
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
          title: 'Password Updated',
          message: 'Your account is secured. Directing you to your portal...',
        })
      );

      redirectByRole(pendingUser.role || 'EMPLOYEE');
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: err.message || 'Could not update password. Please try again.',
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle brand ambient glow per design.md Section 2.5.4 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,104,245,0.06),transparent)] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* Official Maaya World Logo */}
        <div className="flex items-center justify-center mb-4">
          <img
            src={maayaLogo}
            alt="Maaya World Logo"
            className="h-11 w-auto object-contain"
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Sign In to Your Account
        </h1>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-9 shadow-sm hover:shadow-md transition-shadow border border-slate-200/90 rounded-2xl">
          {showForceChange ? (
            /* First-Time Login: Mandatory Password Change View */
            <div className="space-y-5">
              <div className="text-center pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Create New Password</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Welcome to Maaya World, <strong className="text-slate-700">{pendingUser?.fullName}</strong>. Please set a confidential password to complete activation.
                </p>
              </div>

              <form onSubmit={handleSubmitChange(onForceChangePassword)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white border ${
                        changeErrors.newPassword ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/10'
                      } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                      {...registerChange('newPassword')}
                    />
                  </div>
                  {changeErrors.newPassword && (
                    <p className="text-xs text-rose-600 mt-1">{changeErrors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      placeholder="Repeat new password"
                      className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white border ${
                        changeErrors.confirmPassword ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/10'
                      } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                      {...registerChange('confirmPassword')}
                    />
                  </div>
                  {changeErrors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1">{changeErrors.confirmPassword.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full !h-11 mt-2 text-sm font-semibold !bg-slate-900 hover:!bg-slate-800"
                  isLoading={isSubmittingChange}
                  rightIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Activate Account & Enter Workplace
                </Button>
              </form>
            </div>
          ) : (
            /* Clean Corporate Login Form (No Role Mentions) */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="name@themaayaworld.com"
                    className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white border ${
                      errors.email ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`block w-full h-11 pl-10 pr-10 text-sm text-slate-900 bg-white border ${
                      errors.password ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-xs text-slate-600">Remember this workstation</span>
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full !h-11 mt-2 text-sm font-semibold !bg-slate-900 hover:!bg-slate-800 text-white shadow-xs"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Workplace
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
