import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { setUser, switchRole } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';
import { api } from '@/services/api';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Lock, Mail, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { UserRole } from '@/types';
import maayaLogo from '@/assets/logo-new.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@maayaworld.com',
      password: 'password123',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const user = await api.auth.login(values.email, values.password);
      dispatch(setUser(user));
      dispatch(
        addToast({
          type: 'success',
          title: 'Welcome back!',
          message: `Logged into Maaya World Suite as ${user.name} (${user.role})`,
        })
      );

      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'MANAGER') {
        navigate('/manager/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Authentication Failed',
          message: err.message || 'Invalid credentials provided.',
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole, email: string) => {
    setValue('email', email);
    setValue('password', 'password123');
    setIsLoading(true);
    try {
      const user = await api.auth.login(email, 'password123');
      dispatch(setUser(user));
      dispatch(switchRole(role));
      dispatch(
        addToast({
          type: 'success',
          title: 'Demo Session Active',
          message: `Logged in as ${user.name} (${role})`,
        })
      );

      if (role === 'ADMIN') navigate('/admin/dashboard');
      else if (role === 'MANAGER') navigate('/manager/dashboard');
      else navigate('/employee/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Maaya World Official Logo */}
        <div className="flex items-center justify-center mb-4">
          <img
            src={maayaLogo}
            alt="Maaya World Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Maaya World HRMS
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Enterprise Workforce & Payroll Management Platform
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xs border border-slate-200/90 rounded-2xl sm:px-10">
          {/* Quick Role Access Bar */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Instant Sign-In Options
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold">Demo Ready</span>
            </div>
            
            {/* Primary Mobile Employee Sign-in Button */}
            <button
              type="button"
              onClick={() => handleQuickLogin('EMPLOYEE', 'employee@maayaworld.com')}
              className="w-full mb-2.5 p-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950 transition-colors cursor-pointer flex items-center justify-between shadow-xs"
            >
              <div className="text-left">
                <div className="text-xs font-bold text-emerald-800">Employee Mobile Portal</div>
                <div className="text-[11px] text-emerald-600 font-medium">Priya Sharma • Staff Code: MW-1003</div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-md">
                One-Tap Log In
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN', 'admin@maayaworld.com')}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer"
              >
                <span className="font-semibold text-slate-700">Admin</span>
                <span className="text-[10px] text-slate-400">Sarah J.</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('MANAGER', 'manager@maayaworld.com')}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer"
              >
                <span className="font-semibold text-slate-700">Manager</span>
                <span className="text-[10px] text-slate-400">Rajesh K.</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Corporate Email"
              type="email"
              placeholder="name@maayaworld.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-600">Remember this workstation</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Suite
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-bit SSL Encrypted & SOC2 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
