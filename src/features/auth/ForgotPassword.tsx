import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/api';
import maayaLogo from '@/assets/logo-new.png';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid corporate email address'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export const ForgotPassword: React.FC = () => {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (values: ForgotFormValues) => {
    setIsLoading(true);
    try {
      await api.auth.forgotPassword(values.email);
      setSubmittedEmail(values.email);
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
          Reset Your Password
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your registered email to receive password recovery instructions
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200/90 rounded-2xl sm:px-10">
          {submittedEmail ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Recovery Instructions Sent</h3>
              <p className="text-xs text-slate-600 mt-2">
                We have dispatched a password reset link to <strong className="text-slate-800">{submittedEmail}</strong>. Please check your corporate inbox.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <Link to="/reset-password">
                  <Button variant="outline" size="sm" className="w-full">
                    Enter Recovery Code Manually
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Return to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Registered Corporate Email"
                type="email"
                placeholder="name@maayaworld.com"
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                helperText="We will send a one-time recovery token valid for 30 minutes."
                {...register('email')}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-3"
                isLoading={isLoading}
              >
                Send Recovery Link
              </Button>

              <div className="pt-3 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
