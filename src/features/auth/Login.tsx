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
import { Lock, Mail, ArrowRight, KeyRound, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
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
  const [authError, setAuthError] = useState<string | null>(null);

  // Extract email dynamically from URL query parameters (e.g. from onboarding email link)
  const initialEmail = searchParams.get('email') || '';

  // First-time login forced password change state
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [pendingOldPassword, setPendingOldPassword] = useState<string>('');
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
    setAuthError(null);
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
        setPendingOldPassword(values.password);
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
          department: userData.department || '',
          employeeId: userData.employeeCode || `MW-${userData.id}`,
          joiningDate: userData.dateOfJoining || userData.joiningDate || '',
          phone: userData.phone || '',
          address: userData.address || '',
          location: userData.location || userData.locationName || '',
          shift: userData.shift || 'MORNING',
          status: userData.status || 'ACTIVE',
          mustChangePassword: false,
          enrolledFacePhoto: userData.enrolledFacePhoto,
          enrolledFaceBiometrics: userData.enrolledFaceBiometrics,
        })
      );

      dispatch(
        addToast({
          type: 'success',
          title: 'Welcome Back',
          message: `Signed in as ${userData.fullName || userData.email}. Opening your dashboard...`,
        })
      );

      redirectByRole(userData.role || 'EMPLOYEE');
    } catch (err: any) {
      const msg = err.message || 'Unable to sign in. Please check your email and password.';
      setAuthError(msg);
      dispatch(
        addToast({
          type: 'error',
          title: 'Authentication Failed',
          message: msg,
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
        oldPassword: pendingOldPassword,
        newPassword: values.newPassword,
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to update password');
      }

      if (res.user) {
        localStorage.setItem('maaya_current_user', JSON.stringify(res.user));
      }
      setPendingOldPassword('');
      dispatch(setPasswordChanged());
      dispatch(
        setUser({
          id: String(pendingUser.id),
          name: pendingUser.fullName || pendingUser.email,
          email: pendingUser.email,
          role: pendingUser.role || 'EMPLOYEE',
          designation: pendingUser.jobTitle || 'Staff',
          department: pendingUser.department || '',
          employeeId: pendingUser.employeeCode || `MW-${pendingUser.id}`,
          joiningDate: pendingUser.dateOfJoining || '',
          phone: pendingUser.phone || '',
          address: pendingUser.address || '',
          location: pendingUser.location || pendingUser.locationName || '',
          shift: pendingUser.shift || 'MORNING',
          status: 'ACTIVE',
          mustChangePassword: false,
          enrolledFacePhoto: pendingUser.enrolledFacePhoto,
          enrolledFaceBiometrics: pendingUser.enrolledFaceBiometrics,
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
    <AuthLayout
      title={'Sign in'}
      subtitle={'Use your work email to continue.'}
    >
          {showForceChange ? (
            /* First-Time Login: Mandatory Password Change View */
            <div className="space-y-5">
              <div className="text-center pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2.5">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Create new password</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Welcome to Maaya World, <strong className="text-slate-700">{pendingUser?.fullName}</strong>. Please set a confidential password to complete activation.
                </p>
              </div>

              <form onSubmit={handleSubmitChange(onForceChangePassword)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white border ${
                        changeErrors.newPassword ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
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
                    Confirm new password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      placeholder="Repeat new password"
                      className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white border ${
                        changeErrors.confirmPassword ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
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
                  size="lg" className="w-full mt-2"
                  isLoading={isSubmittingChange}
                  rightIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Save password and continue
                </Button>
              </form>
            </div>
          ) : (
            /* Sign-in form; users are sent to their own dashboard after signing in */
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {authError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="name@themaayaworld.com"
                    className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white border ${
                      errors.email ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
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
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`block w-full h-11 pl-10 pr-10 text-sm text-slate-900 bg-white border ${
                      errors.password ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-600 focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg" className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign in
              </Button>
            </form>
          )}
    </AuthLayout>
  );
};
