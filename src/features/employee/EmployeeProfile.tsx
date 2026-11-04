import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Employee } from '@/types';
import { getShiftDefinition } from '@/utils/shiftUtils';
import { Edit3, Check, X, LogOut, Phone, Mail, MapPin, ShieldAlert, CreditCard } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/slices/authSlice';
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
  const [isEditing, setIsEditing] = useState(false);

  const employeeId = user?.id || 'emp-003';

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
  });

  useEffect(() => {
    api.employees.getById(employeeId).then((data) => {
      if (data) {
        setEmployee(data);
        reset({
          phone: data.phone || '',
          address: data.address || '',
        });
      }
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

  if (isLoading || !employee) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)]">
        Loading profile…
      </div>
    );
  }

  const shiftInfo = getShiftDefinition(employee.shift || 'MORNING');

  return (
    <div className="space-y-3 pb-6">
      {/* Identity Card */}
      <div className="employee-card flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-sm shrink-0">
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
              <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {employee.employeeCode}
              </span>
              <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
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
          className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--brand-200)] space-y-3 text-xs"
        >
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border-default)]">
            <span className="font-semibold text-slate-900">Edit contact details</span>
            <button
              type="button"
              onClick={() => {
                reset();
                setIsEditing(false);
              }}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Email (System)</label>
            <input
              type="text"
              value={employee.email}
              disabled
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-700 mb-1">Phone</label>
            <input
              type="text"
              {...register('phone')}
              placeholder="+91 99887 76655"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[var(--border-default)] text-slate-900 outline-none focus:border-[var(--brand-400)]"
            />
            {errors.phone && (
              <p className="text-[var(--accent-600)] text-[10px] mt-0.5">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] text-slate-700 mb-1">Residential Address</label>
            <input
              type="text"
              {...register('address')}
              placeholder="Address"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white border border-[var(--border-default)] text-slate-900 outline-none focus:border-[var(--brand-400)]"
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
              className="px-3.5 py-1.5 rounded-lg bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
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
            <span className="text-xs font-semibold text-slate-900">Contact & Address</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2 flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                Email
              </span>
              <span className="font-medium text-slate-900 text-right break-all">
                {employee.email}
              </span>
            </div>

            <div className="py-2 flex items-center justify-between gap-3">
              <span className="text-slate-500 shrink-0 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Phone
              </span>
              <span className="font-medium text-slate-900 text-right">
                {employee.phone || 'Not registered'}
              </span>
            </div>

            <div className="py-2 flex items-start justify-between gap-3">
              <span className="text-slate-500 shrink-0 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Address
              </span>
              <span className="font-medium text-slate-900 text-right max-w-[240px] leading-relaxed">
                {employee.address || 'Not specified'}
              </span>
            </div>


          </div>
        </div>
      )}

      {/* Statutory & Bank Information */}
      <div className="employee-card space-y-2 text-xs">
        <div className="flex items-center gap-1.5 pb-1 border-b border-[var(--border-default)]">
          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">Bank & Statutory</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2 flex items-center justify-between">
            <span className="text-slate-500">Bank Account</span>
            <span className="font-medium text-slate-900 font-mono">
              {employee.bankDetails.bankName} (ending {employee.bankDetails.accountNumber.slice(-4)})
            </span>
          </div>

          <div className="py-2 flex items-center justify-between">
            <span className="text-slate-500">PAN</span>
            <span className="font-medium text-slate-900 font-mono">
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
          className="w-full py-2.5 px-3 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 text-red-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
