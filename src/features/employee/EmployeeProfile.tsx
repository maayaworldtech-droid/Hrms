import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Employee } from '@/types';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { formatDate } from '@/utils/formatters';
import { getShiftDefinition } from '@/utils/shiftUtils';
import {
  User,
  Mail,
  Phone,
  Building2,
  CreditCard,
  ShieldCheck,
  Save,
  Check,
  Briefcase,
  MapPin,
  Calendar,
  LogOut,
  Clock,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';

const profileUpdateSchema = z.object({
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  emergencyName: z.string().min(2, 'Emergency contact name required'),
  emergencyPhone: z.string().min(10, 'Emergency phone required'),
  emergencyRelationship: z.string().min(2, 'Relationship required'),
});

type ProfileUpdateFormValues = z.infer<typeof profileUpdateSchema>;

export const EmployeeProfile: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const employeeId = 'emp-003'; // Priya Sharma

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
          phone: data.phone,
          emergencyName: data.emergencyContact?.name || '',
          emergencyPhone: data.emergencyContact?.phone || '',
          emergencyRelationship: data.emergencyContact?.relationship || 'Family',
        });
      }
      setIsLoading(false);
    });
  }, [reset]);

  const onUpdateSubmit = async (values: ProfileUpdateFormValues) => {
    if (!employee) return;
    try {
      const updated = await api.employees.update(employee.id, {
        phone: values.phone,
        emergencyContact: {
          name: values.emergencyName,
          phone: values.emergencyPhone,
          relationship: values.emergencyRelationship,
        },
      });
      setEmployee(updated);
      dispatch(
        addToast({
          type: 'success',
          title: 'Profile Updated',
          message: 'Contact and emergency details saved successfully.',
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
      <div className="p-8 text-center text-[13px] text-slate-400 bg-white rounded-xl border border-slate-200">
        Loading employee profile...
      </div>
    );
  }

  const shiftInfo = getShiftDefinition(employee.shift || 'MORNING');

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-slate-900">
          My Profile
        </h1>
        <p className="text-[13px] text-slate-500">
          Your details, work schedule and emergency contacts
        </p>
      </div>

      {/* Identity Card */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-[16px] shrink-0 shadow-md shadow-indigo-600/20">
          {employee.firstName[0]}
          {employee.lastName[0]}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-bold text-slate-900 truncate">
            {employee.fullName}
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[13px] font-mono text-slate-500 font-semibold">
              {employee.employeeCode}
            </span>
            <span className="text-[13px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              {employee.location} Center
            </span>
          </div>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Joined {formatDate(employee.joiningDate)}
          </p>
        </div>
      </div>

      {/* Venue & Shift Schedule Card */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5">
        <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400 block">
          Work Schedule & Venue
        </span>

        <div className="grid grid-cols-2 gap-2 text-[13px]">
          <div className="py-2">
            <span className="text-[13px] text-slate-400 block font-medium">Assigned Shift</span>
            <span className="font-bold text-slate-900 block mt-0.5">{shiftInfo.name}</span>
            <span className="text-[13px] text-slate-500 font-mono">{shiftInfo.timing}</span>
          </div>

          <div className="py-2">
            <span className="text-[13px] text-slate-400 block font-medium">Employment Type</span>
            <span className="font-bold text-slate-900 block mt-0.5">
              {(employee.employmentType || 'FULL_TIME').replace('_', ' ')}
            </span>
            <span className="text-[13px] text-slate-500">Confirmed Regular</span>
          </div>
        </div>
      </div>

      {/* Editable Contact & Emergency Directory */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400">
            Contact & Emergency Details
          </span>
          <span className="text-[13px] text-indigo-600 font-medium">Editable</span>
        </div>

        <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-3 text-[13px]">
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">
              Work email (contact HR to change)
            </label>
            <input
              type="text"
              value={employee.email}
              disabled
              className="w-full px-3 py-2 text-[13px] rounded-xl bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-1">
              Mobile Phone Number
            </label>
            <input
              type="text"
              {...register('phone')} aria-label="Mobile phone number" aria-invalid={!!errors.phone}
              placeholder="+91 99887 76655"
              className="w-full px-3 py-2 text-[13px] rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="block text-[13px] font-bold uppercase tracking-wider text-slate-400">
              Primary Emergency Contact
            </span>

            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-semibold text-slate-600 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  {...register('emergencyName')} aria-label="Emergency contact name" aria-invalid={!!errors.emergencyName}
                  placeholder="e.g. Ramesh Sharma"
                  className="w-full px-3 py-2 text-[13px] rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-slate-600 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  {...register('emergencyRelationship')} aria-label="Relationship" aria-invalid={!!errors.emergencyRelationship}
                  placeholder="e.g. Spouse / Parent"
                  className="w-full px-3 py-2 text-[13px] rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-1">
                Emergency Telephone
              </label>
              <input
                type="text"
                {...register('emergencyPhone')} aria-label="Emergency phone number" aria-invalid={!!errors.emergencyPhone}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 text-[13px] rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="pt-2">{Object.values(errors).map((error, index) => <p key={index} role="alert" className="text-rose-700 mb-2">{error.message}</p>)}
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              leftIcon={<Save className="w-4 h-4" />}
              className="w-full !py-2.5 !text-[13px] font-semibold"
            >
              Save Contact Details
            </Button>
          </div>
        </form>
      </div>

      {/* Statutory Records Card (Read-only verified) */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2.5 text-[13px]">
        <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400 block">
          Bank & tax details
        </span>

        <div className="py-3 space-y-1">
          <span className="text-[13px] text-slate-400 block font-medium">Bank Account</span>
          <p className="font-semibold text-slate-900">{employee.bankDetails.bankName}</p>
          <p className="font-mono text-slate-600 text-[13px]">A/C: {employee.bankDetails.accountNumber}</p>
          <p className="font-mono text-slate-400 text-[13px]">IFSC: {employee.bankDetails.ifscCode}</p>
        </div>

        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
          <div className="py-3">
            <span className="text-[13px] text-slate-400 block font-medium">Income Tax PAN</span>
            <p className="font-mono font-bold text-slate-900 text-[13px] mt-0.5">{employee.bankDetails.panNumber}</p>
            <span className="text-[13px] text-emerald-600 font-semibold block mt-0.5">Verified</span>
          </div>

          <div className="py-3">
            <span className="text-[13px] text-slate-400 block font-medium">EPFO UAN</span>
            <p className="font-mono font-bold text-slate-900 text-[13px] mt-0.5">{employee.bankDetails.uanNumber}</p>
            <span className="text-[13px] text-emerald-600 font-semibold block mt-0.5">Linked</span>
          </div>
        </div>
      </div>

      {/* Prominent One-Tap Sign Out Button */}
      <div className="pt-2 pb-6">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full py-3 px-4 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 text-rose-700 font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          Sign Out of Staff Portal
        </button>
      </div>
    </div>
  );
};
