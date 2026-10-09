import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { Employee } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { formatDate } from '@/utils/formatters';
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
} from 'lucide-react';
import { useAppDispatch } from '@/store';
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
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const employeeId = 'emp-003'; // Priya Sharma

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileUpdateFormValues>({
    resolver: zodResolver(profileUpdateSchema),
  });

  useEffect(() => {
    api.employees.getById(employeeId).then((data) => {
      if (data) {
        setEmployee(data);
        reset({
          phone: data.phone,
          emergencyName: data.emergencyContact.name,
          emergencyPhone: data.emergencyContact.phone,
          emergencyRelationship: data.emergencyContact.relationship,
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

  if (isLoading || !employee) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading employee profile...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Profile & Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal particulars, organizational designation, reporting hierarchy & statutory credentials
          </p>
        </div>
      </div>

      {/* Top Banner Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-600/20">
            {employee.firstName[0]}
            {employee.lastName[0]}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900">{employee.fullName}</h2>
              <Badge variant="purple" size="md">{employee.role}</Badge>
              <Badge variant="success" size="md" dot>{employee.status}</Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {employee.designation} • {employee.departmentName}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-mono">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {employee.employeeCode}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {employee.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Joined {formatDate(employee.joiningDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Editable Contact Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Particulars */}
          <Card>
            <CardHeader
              title="Employment & Role Architecture"
              subtitle="Corporate hierarchy and placement records"
              icon={<Briefcase className="w-4 h-4" />}
            />
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Department:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{employee.departmentName}</p>
              </div>
              <div>
                <span className="text-slate-500">Employment Type:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{employee.employmentType.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-slate-500">Reporting Manager:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{employee.managerName || 'Rajesh Kumar (Lead)'}</p>
              </div>
              <div>
                <span className="text-slate-500">Primary Work Location:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{employee.location}</p>
              </div>
            </CardContent>
          </Card>

          {/* Editable Contact Information */}
          <Card>
            <CardHeader
              title="Contact & Emergency Directory"
              subtitle="Update your mobile phone number and primary emergency notification contact"
              icon={<Phone className="w-4 h-4" />}
            />
            <CardContent>
              <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Corporate Email (Immutable)"
                    value={employee.email}
                    disabled
                  />
                  <Input
                    label="Mobile Telephone Number"
                    {...register('phone')}
                  />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Emergency Contact Particulars
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Contact Person Name"
                      {...register('emergencyName')}
                    />
                    <Input
                      label="Relationship"
                      {...register('emergencyRelationship')}
                    />
                    <Input
                      label="Emergency Telephone"
                      {...register('emergencyPhone')}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Save Contact Info
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Banking & Statutory Records */}
        <div>
          <Card>
            <CardHeader
              title="Statutory Identification"
              subtitle="Verified compliance identification documents"
              icon={<ShieldCheck className="w-4 h-4" />}
            />
            <CardContent className="space-y-3.5 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-[11px]">Primary Bank Account</span>
                <p className="font-semibold text-slate-900">{employee.bankDetails.bankName}</p>
                <p className="font-mono text-slate-600">A/C: {employee.bankDetails.accountNumber}</p>
                <p className="font-mono text-slate-400 text-[10px]">IFSC: {employee.bankDetails.ifscCode}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-[11px]">Income Tax PAN</span>
                <p className="font-mono font-bold text-slate-900">{employee.bankDetails.panNumber}</p>
                <span className="text-[10px] text-emerald-600 font-medium">Verified by NSDL</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-[11px]">Universal Account Number (UAN)</span>
                <p className="font-mono font-bold text-slate-900">{employee.bankDetails.uanNumber}</p>
                <span className="text-[10px] text-emerald-600 font-medium">Linked to EPFO Member Portal</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
