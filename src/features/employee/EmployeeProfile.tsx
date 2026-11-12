import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Employee } from '@/types';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { formatDate } from '@/utils/formatters';
import { accessLabel } from '@/utils/access';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { EmptyState } from '@/components/common/EmptyState';
import { KeyValueList, MobileCard, MobileSkeleton, MobileTitle } from '@/components/employee/MobilePrimitives';
import { Pencil, LogOut, WifiOff } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, updateUser } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';

/** Accepts "98765 43210" or "+91 98765 43210" and keeps the 10-digit mobile number. */
const toMobile = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
};

const profileUpdateSchema = z.object({
  phone: z
    .string()
    .trim()
    .refine((v) => /^[6-9]\d{9}$/.test(toMobile(v)), 'Enter a valid 10-digit mobile number'),
  address: z.string().trim().min(5, 'Address is required'),
});

type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

const maskAccount = (account?: string) => (account && account.length > 4 ? `ending ${account.slice(-4)}` : account || 'Not provided');

export const EmployeeProfile: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const employeeId = user?.id || '';

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<ProfileUpdateFormValues>({ resolver: zodResolver(profileUpdateSchema) });

  const load = useCallback(async () => {
    if (!employeeId) {
      setIsLoading(false);
      setLoadError(true);
      return;
    }
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await api.employees.getById(employeeId);
      if (!data) throw new Error('No employee');
      setEmployee(data);
      reset({ phone: data.phone || '', address: data.address || '' });
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, reset]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpdateSubmit = async (values: ProfileUpdateFormValues) => {
    if (!employee) return;
    try {
      const phone = toMobile(values.phone);
      const address = values.address.trim();
      const updated = await api.employees.update(employee.id, { phone, address });
      setEmployee(updated);
      dispatch(updateUser({ phone, address }));
      setIsEditing(false);
      dispatch(addToast({ type: 'success', title: 'Profile updated', message: 'Your contact details were saved.' }));
    } catch {
      dispatch(addToast({ type: 'error', title: 'Update failed', message: 'Please try again.' }));
    }
  };

  const cancelEdit = () => {
    reset({ phone: employee?.phone || '', address: employee?.address || '' });
    setIsEditing(false);
  };

  if (isLoading) return <MobileSkeleton heights={[88, 180, 120]} />;

  if (loadError || !employee) {
    return <EmptyState tone="danger" icon={WifiOff} title="Unable to load your profile" actionLabel="Retry" onAction={load} />;
  }

  const shiftInfo = getShiftDefinition(employee.shift || 'MORNING');

  return (
    <div className="space-y-4 pb-6">
      <MobileTitle title="Profile" />

      <MobileCard className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white" aria-hidden="true">
          {(employee.firstName?.[0] || '') + (employee.lastName?.[0] || '') || employee.fullName[0]}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{employee.fullName}</p>
          <p className="truncate text-sm text-slate-600">
            {accessLabel(employee.role)} · {employee.location || 'No center'}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-slate-600">
            {employee.employeeCode} · {shiftInfo.name} · Joined {formatDate(employee.joiningDate)}
          </p>
        </div>
      </MobileCard>

      <MobileCard className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Contact details</h2>
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} leftIcon={<Pencil className="h-3.5 w-3.5" />}>
              Edit
            </Button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-4 pt-1">
            <Input label="Email" type="email" value={employee.email} disabled helperText="Managed by HR. Contact admin to change." />
            <Input label="Phone" type="tel" inputMode="tel" autoComplete="tel" required error={errors.phone?.message} {...register('phone')} />
            <Textarea label="Residential address" required rows={3} error={errors.address?.message} {...register('address')} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        ) : (
          <KeyValueList
            items={[
              { label: 'Email', value: <span className="break-all">{employee.email}</span> },
              { label: 'Phone', value: employee.phone || 'Not provided' },
              { label: 'Address', value: employee.address || 'Not provided' },
            ]}
          />
        )}
      </MobileCard>

      <MobileCard className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Bank and tax</h2>
        <KeyValueList
          items={[
            { label: 'Bank', value: employee.bankDetails?.bankName || 'Not provided' },
            { label: 'Account', value: <span className="tabular-nums">{maskAccount(employee.bankDetails?.accountNumber)}</span> },
            { label: 'PAN', value: <span className="tabular-nums">{employee.bankDetails?.panNumber || 'Not provided'}</span> },
            { label: 'UAN', value: <span className="tabular-nums">{employee.bankDetails?.uanNumber || 'Not applicable'}</span> },
          ]}
        />
      </MobileCard>

      <Button
        variant="danger-ghost"
        size="lg"
        className="w-full border border-rose-200 bg-white"
        onClick={() => {
          dispatch(logout());
          navigate('/login');
        }}
        leftIcon={<LogOut className="h-4 w-4" />}
      >
        Sign out
      </Button>
    </div>
  );
};
