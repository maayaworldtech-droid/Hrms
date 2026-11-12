import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Employee } from '@/types';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { Edit3, Check, X, LogOut, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout, updateUser } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';

const profileUpdateSchema = z.object({
  phone: z.string().min(10, '10-digit number required'),
  address: z.string().min(5, 'Address required'),
});

type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

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
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
  });

  useEffect(() => {
    if (!employeeId) {
      setIsLoading(false);
      setLoadError(true);
      return;
    }
    api.employees
      .getById(employeeId)
      .then((data) => {
        if (data) {
          setEmployee(data);
          reset({
            phone: data.phone || '',
            address: data.address || '',
          });
        } else {
          setLoadError(true);
        }
      })
      .catch(() => {
        setLoadError(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [employeeId, reset]);

  const onUpdateSubmit = async (values: ProfileUpdateFormValues) => {
    if (!employee) return;
    try {
      const updated = await api.employees.update(employee.id, {
        phone: values.phone,
        address: values.address,
      });
      setEmployee(updated);
      dispatch(updateUser({ phone: values.phone, address: values.address }));
      setIsEditing(false);
      dispatch(
        addToast({
          type: 'success',
          title: 'Profile updated',
          message: 'Contact details saved successfully.',
        })
      );
    } catch {
      dispatch(addToast({ type: 'error', title: 'Update failed' }));
    }
  };

  const handleSignOut = () => {
    dispatch(logout());
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]">
        Loading profile…
      </div>
    );
  }

  if (loadError || !employee) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] space-y-2">
        <p className="font-semibold text-slate-800">Unable to load employee profile</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const shiftInfo = getShiftDefinition(employee.shift || 'MORNING');

  return (
    <div className="space-y-3 pb-6">
      {/* Identity Card */}
      <div className="employee-card flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center font-semibold text-sm shrink-0">
            {employee.firstName?.[0] || 'E'}
            {employee.lastName?.[0] || 'M'}
          </div>

          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              {employee.fullName}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {employee.designation || 'Staff'} — {employee.location || 'Headquarters'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="tabular-nums text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {employee.employeeCode}
              </span>
              <span className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                {shiftInfo.name}
              </span>
            </div>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-default)] bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit profile</span>
          </button>
        )}
      </div>

      {/* Edit Form View */}
      {isEditing ? (
        <form
          onSubmit={handleSubmit(onUpdateSubmit)}
          className="p-4 rounded-xl bg-[var(--bg-surface)] border border-brand-200 space-y-3 text-xs"
        >
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border-default)]">
            <span className="font-semibold text-slate-900">Edit contact details</span>
            <button
              type="button"
              onClick={() => {
                reset();
                setIsEditing(false);
              }}
              className="text-slate-500 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Email (System)</label>
            <input
              type="text"
              value={employee.email}
              disabled
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-700 mb-1">Phone</label>
            <input
              type="text"
              {...register('phone')}
              placeholder="+91 99887 76655"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[var(--border-default)] text-slate-900 outline-none focus:border-brand-400"
            />
            {errors.phone && (
              <p className="text-accent-600 text-xs mt-0.5">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-slate-700 mb-1">Residential address</label>
            <input
              type="text"
              {...register('address')}
              placeholder="Address"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[var(--border-default)] text-slate-900 outline-none focus:border-brand-400"
            />
          </div>



          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                reset();
                setIsEditing(false);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving…' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Read-Only Clean Information Layout */
        <div className="employee-card space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border-default)]">
            <span className="text-xs font-semibold text-slate-900">Contact & address</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2 flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Email
              </span>
              <span className="font-medium text-slate-900 text-right break-all">
                {employee.email}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Phone
              </span>
              <span className="font-medium text-slate-900 text-right">
                {employee.phone || 'Not registered'}
              </span>
            </div>

            <div className="py-2 flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Address
              </span>
              <span className="font-medium text-slate-900 text-right max-w-[240px] leading-relaxed">
                {employee.address || 'Not specified'}
              </span>
            </div>


          </div>
        </div>
      )}

      {/* Bank and PF details */}
      <div className="employee-card space-y-2 text-xs">
        <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border-default)]">
          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-900">Bank and PF details</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2 flex items-center justify-between">
            <span className="text-slate-500">Bank account</span>
            <span className="font-medium text-slate-900 tabular-nums">
              {employee.bankDetails.bankName} (ending {employee.bankDetails.accountNumber.slice(-4)})
            </span>
          </div>

          <div className="py-2 flex items-center justify-between">
            <span className="text-slate-500">PAN</span>
            <span className="font-medium text-slate-900 tabular-nums">
              {employee.bankDetails.panNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Clean Sign Out */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-500" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};
