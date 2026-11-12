import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { setUser, setPasswordChanged } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';
import { api } from '@/services/api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Mail, AlertCircle } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const forceChangeSchema = z
  .object({
    newPassword: z.string().min(6, 'Use at least 6 characters'),
    confirmPassword: z.string().min(1, 'Repeat your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type ForceChangeValues = z.infer<typeof forceChangeSchema>;

const dashboardFor = (role: string) => {
  const clean = (role || '').toUpperCase();
  return clean === 'ADMIN' ? '/admin/dashboard' : clean === 'MANAGER' ? '/manager/dashboard' : '/employee/dashboard';
};

const toSessionUser = (data: any) => ({
  id: String(data.id),
  name: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email,
  email: data.email,
  role: data.role || 'EMPLOYEE',
  designation: data.jobTitle || data.designation || 'Staff',
  department: data.department || '',
  employeeId: data.employeeCode || `MW-${data.id}`,
  joiningDate: data.dateOfJoining || data.joiningDate || '',
  phone: data.phone || '',
  address: data.address || '',
  location: data.location || data.locationName || '',
  shift: data.shift || 'MORNING',
  status: data.status || 'ACTIVE',
  mustChangePassword: false,
  enrolledFacePhoto: data.enrolledFacePhoto,
  enrolledFaceBiometrics: data.enrolledFaceBiometrics,
});

export const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const initialEmail = searchParams.get('email') || '';

  // First sign-in: the account must set its own password before continuing
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [pendingOldPassword, setPendingOldPassword] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: '' },
  });

  useEffect(() => {
    if (initialEmail) setValue('email', initialEmail);
  }, [initialEmail, setValue]);

  const {
    register: registerChange,
    handleSubmit: handleSubmitChange,
    formState: { errors: changeErrors, isSubmitting: isSubmittingChange },
  } = useForm<ForceChangeValues>({ resolver: zodResolver(forceChangeSchema) });

  const finishSignIn = (data: any) => {
    dispatch(setUser(toSessionUser(data)));
    const role = String(data.role || 'EMPLOYEE').toUpperCase();
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '';
    const allowed = role === 'ADMIN' ? ['/admin', '/manager'] : role === 'MANAGER' ? ['/manager', '/account', '/employee'] : ['/employee'];
    const canReturn = allowed.some((prefix) => from.startsWith(prefix + '/'));
    navigate(canReturn ? from : dashboardFor(role), { replace: true });
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await api.auth.login({ email: values.email.trim(), password: values.password });
      if (!res.success) throw new Error(res.message || 'Incorrect email or password');

      if (res.mustChangePassword) {
        setPendingUser(res.user);
        setPendingOldPassword(values.password);
        return;
      }
      finishSignIn(res.user);
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to sign in. Check your email and password.');
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
      if (!res.success) throw new Error(res.message || 'Could not update the password');

      if (res.user) localStorage.setItem('maaya_current_user', JSON.stringify(res.user));
      setPendingOldPassword('');
      dispatch(setPasswordChanged());
      dispatch(addToast({ type: 'success', title: 'Password set', message: 'Your account is ready.' }));
      finishSignIn(pendingUser);
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not set password', message: err?.message || 'Please try again.' }));
    }
  };

  if (pendingUser) {
    return (
      <AuthLayout
        title="Set your password"
        subtitle={`Welcome, ${pendingUser.fullName || pendingUser.email}. Choose a password you will use from now on.`}
      >
        <form onSubmit={handleSubmitChange(onForceChangePassword)} className="space-y-5" noValidate>
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            className="h-11"
            helperText="At least 6 characters."
            error={changeErrors.newPassword?.message}
            {...registerChange('newPassword')}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            className="h-11"
            error={changeErrors.confirmPassword?.message}
            {...registerChange('confirmPassword')}
          />
          <Button type="submit" size="lg" className="w-full" isLoading={isSubmittingChange}>
            Save password and continue
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign in" subtitle="Use your work email to continue.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {authError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <span>{authError}</span>
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus={!initialEmail}
          placeholder="name@themaayaworld.com"
          className="h-11"
          leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-800">
              Password
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            autoFocus={Boolean(initialEmail)}
            className="h-11"
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};
