import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { KeyRound, CheckCircle2, ArrowLeft, Mail } from 'lucide-react';
import { api } from '@/services/api';
import { AuthLayout } from '@/components/layout/AuthLayout';

const resetSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address'),
    token: z.string().trim().min(4, 'Enter the code from the email'),
    password: z.string().min(6, 'Use at least 6 characters'),
    confirmPassword: z.string().min(1, 'Repeat your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get('email') || '';
  const urlToken = searchParams.get('token') || '';
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: urlEmail, token: urlToken, password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (urlEmail) setValue('email', urlEmail);
    if (urlToken) setValue('token', urlToken);
  }, [urlEmail, urlToken, setValue]);

  const onSubmit = async (values: ResetFormValues) => {
    setIsLoading(true);
    setFormError(null);
    try {
      const res = await api.auth.resetPassword({ email: values.email.trim(), token: values.token.trim(), password: values.password });
      if (res && res.success === false) throw new Error(res.message || 'The code is invalid or has expired');
      setIsSuccess(true);
    } catch (err: any) {
      setFormError(err?.message || 'The code is invalid or has expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout title="Password updated" subtitle="You can sign in with your new password.">
        <div className="space-y-5">
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Password changed
          </p>
          <Button size="lg" className="w-full" onClick={() => navigate(`/login?email=${encodeURIComponent(getValues('email'))}`)}>
            Go to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create a new password" subtitle="Enter the code from your email and choose a password.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {formError && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
            {formError}
          </div>
        )}
        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          className="h-11"
          leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          placeholder="6-digit code"
          className="h-11 font-mono tracking-widest"
          leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
          error={errors.token?.message}
          {...register('token')}
        />
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          className="h-11"
          helperText="At least 6 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput label="Confirm new password" autoComplete="new-password" className="h-11" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Set new password
        </Button>
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
};
