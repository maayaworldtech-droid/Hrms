import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Lock, KeyRound, CheckCircle2, ArrowRight, ArrowLeft, Eye, EyeOff, Mail } from 'lucide-react';
import { api } from '@/services/api';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { AuthLayout } from '@/components/layout/AuthLayout';

const resetSchema = z
  .object({
    email: z.string().trim().min(1, 'Email address is required').email('Please enter a valid email address'),
    token: z.string().min(4, 'Enter the 6-digit verification code'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPassword: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlEmail = searchParams.get('email') || '';
  const urlToken = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: urlEmail,
      token: urlToken,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (urlEmail) setValue('email', urlEmail);
    if (urlToken) setValue('token', urlToken);
  }, [urlEmail, urlToken, setValue]);

  const onSubmit = async (values: ResetFormValues) => {
    setIsLoading(true);
    try {
      const res = await api.auth.resetPassword({
        email: values.email.trim(),
        token: values.token.trim(),
        password: values.password,
      });

      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to update password');
      }

      setIsSuccess(true);
      dispatch(
        addToast({
          type: 'success',
          title: 'Password Updated',
          message: 'Your credentials have been updated. You can now sign in.',
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Reset Failed',
          message: err.message || 'Invalid or expired verification code.',
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={'Create new password'}
      subtitle={'Enter your verification code and choose a secure password'}
    >
          {isSuccess ? (
            <div className="text-center py-2 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Password reset completed</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your credentials have been securely updated. You can now sign in.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg" className="w-full"
                  onClick={() => navigate('/login')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    placeholder="name@company.com"
                    className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white border ${
                      errors.email
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Verification code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 849201"
                    className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white font-mono border ${
                      errors.token
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...register('token')}
                  />
                </div>
                {errors.token && (
                  <p className="text-xs text-rose-600 mt-1">{errors.token.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    className={`block w-full h-11 pl-10 pr-10 text-sm text-slate-900 bg-white border ${
                      errors.password
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
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
                      errors.confirmPassword
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-600 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg" className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Set new password
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel and Return to Sign In</span>
                </Link>
              </div>
            </form>
          )}
    </AuthLayout>
  );
};
