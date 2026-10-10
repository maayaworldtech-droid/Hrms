import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Lock, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '@/services/api';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import maayaLogo from '@/assets/logo-new.png';

const resetSchema = z
  .object({
    token: z.string().min(4, 'Enter a valid verification token or OTP'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPassword: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: 'RST-9482',
    },
  });

  const onSubmit = async (values: ResetFormValues) => {
    setIsLoading(true);
    try {
      await api.auth.resetPassword(values.token, values.password);
      setIsSuccess(true);
      dispatch(
        addToast({
          type: 'success',
          title: 'Password Updated',
          message: 'You can now sign in with your updated credentials.',
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white shadow-sm border border-slate-200/90 mb-4">
          <img
            src={maayaLogo}
            alt="Maaya World Logo"
            className="h-10 w-auto object-contain"
          />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Create New Password
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Ensure your new password contains uppercase, lowercase, numbers & symbols
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200/90 rounded-2xl sm:px-10">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Password Reset Completed</h3>
              <p className="text-xs text-slate-600 mt-2">
                Your credentials have been securely updated. All active sessions have been reset.
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => navigate('/login')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Verification Token / OTP"
                type="text"
                placeholder="RST-XXXX"
                leftIcon={<KeyRound className="w-4 h-4" />}
                error={errors.token?.message}
                {...register('token')}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-3"
                isLoading={isLoading}
              >
                Set New Password
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-600 hover:text-indigo-600"
                >
                  Cancel and Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
