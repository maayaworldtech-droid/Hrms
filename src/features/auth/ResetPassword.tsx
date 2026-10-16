import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Lock, KeyRound, CheckCircle2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api } from '@/services/api';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import maayaLogo from '@/assets/logo-new.png';

const resetSchema = z
  .object({
    email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
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
        email: values.email || undefined,
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle brand ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,104,245,0.06),transparent)] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="flex items-center justify-center mb-4">
          <img
            src={maayaLogo}
            alt="Maaya World Logo"
            className="h-11 w-auto object-contain"
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Create New Password
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          Enter your verification code and choose a secure password
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-9 shadow-sm hover:shadow-md transition-shadow border border-slate-200/90 rounded-2xl">
          {isSuccess ? (
            <div className="text-center py-2 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Password Reset Completed</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your credentials have been securely updated. You can now sign in.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="primary"
                  className="w-full !h-11 text-sm font-semibold !bg-slate-900 hover:!bg-slate-800 text-white"
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
                  Verification Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. 849201"
                    className={`block w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white font-mono tracking-wider border ${
                      errors.token
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/10'
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
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    className={`block w-full h-11 pl-10 pr-10 text-sm text-slate-900 bg-white border ${
                      errors.password
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/10'
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
                      errors.confirmPassword
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-blue-500/10'
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
                className="w-full !h-11 mt-2 text-sm font-semibold !bg-slate-900 hover:!bg-slate-800 text-white shadow-xs"
                isLoading={isLoading}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Set New Password
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
        </div>
      </div>
    </div>
  );
};
