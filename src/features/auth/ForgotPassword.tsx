import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { Button } from '@/components/common/Button';
import { Mail, ArrowLeft, ArrowRight, KeyRound, Lock, CheckCircle2, Eye, EyeOff, RotateCw } from 'lucide-react';
import { api } from '@/services/api';
import { AuthLayout } from '@/components/layout/AuthLayout';

const requestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const verifySchema = z
  .object({
    token: z.string().min(4, 'Enter the 6-digit verification code'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your new password'),
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

  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [activeEmail, setActiveEmail] = useState<string>(urlEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form for Step 1: Request Code
  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    setValue: setRequestEmail,
    formState: { errors: requestErrors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: urlEmail },
  });

  // Form for Step 2: Verify & Reset
  const {
    register: registerVerify,
    handleSubmit: handleSubmitVerify,
    setValue: setVerifyValue,
    formState: { errors: verifyErrors },
  } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      token: urlToken,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (urlEmail) {
      setActiveEmail(urlEmail);
      setRequestEmail('email', urlEmail);
    }
    if (urlToken) {
      setVerifyValue('token', urlToken);
      setStep('verify');
    }
  }, [urlEmail, urlToken, setRequestEmail, setVerifyValue]);

  const onRequestCode = async (values: RequestFormValues) => {
    setIsLoading(true);
    try {
      const res = await api.auth.forgotPassword(values.email.trim());
      if (res && res.success === false) {
        throw new Error(res.message || 'Unable to process password reset request');
      }

      setActiveEmail(values.email.trim());
      setStep('verify');
      dispatch(
        addToast({
          type: 'success',
          title: 'Verification Code Sent',
          message: `A 6-digit recovery code has been sent to ${values.email.trim()}.`,
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Recovery Request Failed',
          message: err.message || 'No account registered with this email address.',
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onResendCode = async () => {
    if (!activeEmail || isResending) return;
    setIsResending(true);
    try {
      await api.auth.forgotPassword(activeEmail);
      dispatch(
        addToast({
          type: 'info',
          title: 'Code Resent',
          message: `A fresh verification code was dispatched to ${activeEmail}.`,
        })
      );
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Resend Failed',
          message: err.message || 'Could not resend verification code.',
        })
      );
    } finally {
      setIsResending(false);
    }
  };

  const onVerifyAndReset = async (values: VerifyFormValues) => {
    setIsLoading(true);
    try {
      const res = await api.auth.resetPassword({
        email: activeEmail,
        token: values.token.trim(),
        password: values.password,
      });

      if (res && res.success === false) {
        throw new Error(res.message || 'Invalid or expired verification code');
      }

      setStep('success');
      dispatch(
        addToast({
          type: 'success',
          title: 'Password Updated',
          message: 'Your account password has been updated successfully.',
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
      title={step === 'request'
            ? 'Reset your password'
            : step === 'verify'
            ? 'Set a new password'
            : 'Password updated'}
      subtitle={step === 'request'
            ? 'Enter your email address to receive password recovery instructions'
            : step === 'verify'
            ? 'Enter the 6-digit verification code sent to your email'
            : 'Your credentials have been securely updated'}
    >
          {step === 'request' && (
            <form onSubmit={handleSubmitRequest(onRequestCode)} className="space-y-4">
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
                      requestErrors.email
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...registerRequest('email')}
                  />
                </div>
                {requestErrors.email && (
                  <p className="text-xs text-rose-600 mt-1">{requestErrors.email.message}</p>
                )}
                <p className="text-xs text-slate-500 mt-1.5">
                  We will send a 6-digit verification code valid for 15 minutes.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg" className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send recovery code
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleSubmitVerify(onVerifyAndReset)} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Destination: </span>
                  <strong className="text-slate-800">{activeEmail}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-brand-600 hover:text-brand-700 font-semibold text-xs ml-2"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  6-Digit Verification Code
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
                      verifyErrors.token
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...registerVerify('token')}
                  />
                </div>
                {verifyErrors.token && (
                  <p className="text-xs text-rose-600 mt-1">{verifyErrors.token.message}</p>
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
                      verifyErrors.password
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...registerVerify('password')}
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
                {verifyErrors.password && (
                  <p className="text-xs text-rose-600 mt-1">{verifyErrors.password.message}</p>
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
                      verifyErrors.confirmPassword
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-brand-600 focus:ring-brand-500/10'
                    } rounded-lg focus:outline-none focus:ring-4 transition-all`}
                    {...registerVerify('confirmPassword')}
                  />
                </div>
                {verifyErrors.confirmPassword && (
                  <p className="text-xs text-rose-600 mt-1">{verifyErrors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg" className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Update password & continue
              </Button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={onResendCode}
                  disabled={isResending}
                  className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  <span>Resend code</span>
                </button>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </Link>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-2 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Password reset completed</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your password has been changed. You can now sign in.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg" className="w-full mt-4"
                onClick={() => navigate(`/login?email=${encodeURIComponent(activeEmail)}`)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Sign In
              </Button>
            </div>
          )}
    </AuthLayout>
  );
};
