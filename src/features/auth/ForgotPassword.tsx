import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';
import { AuthLayout } from '@/components/layout/AuthLayout';

const requestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

const verifySchema = z
  .object({
    token: z.string().trim().min(4, 'Enter the code from the email'),
    password: z.string().min(6, 'Use at least 6 characters'),
    confirmPassword: z.string().min(1, 'Repeat your new password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RequestFormValues = z.infer<typeof requestSchema>;
type VerifyFormValues = z.infer<typeof verifySchema>;

export const ForgotPassword: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlEmail = searchParams.get('email') || '';
  const urlToken = searchParams.get('token') || '';

  const [step, setStep] = useState<'request' | 'verify' | 'success'>(urlToken ? 'verify' : 'request');
  const [activeEmail, setActiveEmail] = useState(urlEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const requestForm = useForm<RequestFormValues>({ resolver: zodResolver(requestSchema), defaultValues: { email: urlEmail } });
  const verifyForm = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { token: urlToken, password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (urlEmail) {
      setActiveEmail(urlEmail);
      requestForm.setValue('email', urlEmail);
    }
    if (urlToken) {
      verifyForm.setValue('token', urlToken);
      setStep('verify');
    }
  }, [urlEmail, urlToken, requestForm, verifyForm]);

  const onRequestCode = async (values: RequestFormValues) => {
    setIsLoading(true);
    setFormError(null);
    try {
      const res = await api.auth.forgotPassword(values.email.trim());
      if (res && res.success === false) throw new Error(res.message || 'Could not send the code');
      setActiveEmail(values.email.trim());
      setStep('verify');
    } catch (err: any) {
      setFormError(err?.message || 'No account is registered with this email.');
    } finally {
      setIsLoading(false);
    }
  };

  const onResendCode = async () => {
    if (!activeEmail || isResending) return;
    setIsResending(true);
    try {
      await api.auth.forgotPassword(activeEmail);
      dispatch(addToast({ type: 'info', title: 'Code sent again', message: `Check ${activeEmail}.` }));
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not resend', message: err?.message || 'Please try again.' }));
    } finally {
      setIsResending(false);
    }
  };

  const onVerifyAndReset = async (values: VerifyFormValues) => {
    setIsLoading(true);
    setFormError(null);
    try {
      const res = await api.auth.resetPassword({ email: activeEmail, token: values.token.trim(), password: values.password });
      if (res && res.success === false) throw new Error(res.message || 'The code is invalid or has expired');
      setStep('success');
    } catch (err: any) {
      setFormError(err?.message || 'The code is invalid or has expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const errorBanner = formError && (
    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
      {formError}
    </div>
  );

  if (step === 'success') {
    return (
      <AuthLayout title="Password updated" subtitle="You can sign in with your new password.">
        <div className="space-y-5">
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Password changed for {activeEmail}
          </p>
          <Button size="lg" className="w-full" onClick={() => navigate(`/login?email=${encodeURIComponent(activeEmail)}`)}>
            Go to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (step === 'verify') {
    return (
      <AuthLayout title="Set a new password" subtitle={`Enter the code we emailed to ${activeEmail}.`}>
        <form onSubmit={verifyForm.handleSubmit(onVerifyAndReset)} className="space-y-5" noValidate>
          {errorBanner}
          <Input
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            placeholder="6-digit code"
            className="h-11 font-mono tracking-widest"
            leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            error={verifyForm.formState.errors.token?.message}
            {...verifyForm.register('token')}
          />
          <PasswordInput
            label="New password"
            autoComplete="new-password"
            className="h-11"
            helperText="At least 6 characters."
            error={verifyForm.formState.errors.password?.message}
            {...verifyForm.register('password')}
          />
          <PasswordInput
            label="Confirm new password"
            autoComplete="new-password"
            className="h-11"
            error={verifyForm.formState.errors.confirmPassword?.message}
            {...verifyForm.register('confirmPassword')}
          />
          <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
            Update password
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={onResendCode} disabled={isResending} className="font-medium text-brand-700 hover:underline disabled:opacity-50">
              {isResending ? 'Sending...' : 'Resend code'}
            </button>
            <button type="button" onClick={() => setStep('request')} className="font-medium text-slate-700 hover:underline">
              Use a different email
            </button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We will email you a code that is valid for 15 minutes.">
      <form onSubmit={requestForm.handleSubmit(onRequestCode)} className="space-y-5" noValidate>
        {errorBanner}
        <Input
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="name@themaayaworld.com"
          className="h-11"
          leftIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          error={requestForm.formState.errors.email?.message}
          {...requestForm.register('email')}
        />
        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Send code
        </Button>
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
};
