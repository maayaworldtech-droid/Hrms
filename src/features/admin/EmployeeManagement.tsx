import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { Employee, UserRole } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { formatINR, formatDate } from '@/utils/formatters';
import { calculateSalaryFromCTC } from '@/utils/salaryCalculator';
import {
  UserPlus,
  Eye,
  Trash2,
  Building2,
  CreditCard,
  Phone,
  Mail,
  Shield,
  Briefcase,
  AlertCircle,
  Edit,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const employeeSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid corporate email required'),
  phone: z.string().min(10, 'Valid 10-digit phone number required'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  departmentName: z.string().min(1, 'Please select department'),
  designation: z.string().min(2, 'Designation is required'),
  joiningDate: z.string().min(1, 'Joining date required'),
  location: z.string().min(2, 'Location is required'),
  ctcAnnual: z.coerce.number().min(300000, 'Minimum CTC is ₹3,00,000'),
  accountNumber: z.string().min(8, 'Bank account number required'),
  ifscCode: z.string().min(6, 'IFSC code required'),
  panNumber: z.string().min(10, 'Valid 10-character PAN required'),
  uanNumber: z.string().min(10, 'Valid UAN required'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const EmployeeManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      role: 'EMPLOYEE',
      departmentName: 'Engineering',
      location: 'Bangalore HQ',
      joiningDate: new Date().toISOString().split('T')[0],
      ctcAnnual: 1800000,
      accountNumber: '918273645281',
      ifscCode: 'HDFC0001234',
      panNumber: 'ABCPS1234F',
      uanNumber: '100928374699',
    },
  });

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await api.employees.getAll();
      setEmployees(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const onAddSubmit = async (values: EmployeeFormValues) => {
    try {
      const newEmp = await api.employees.create({
        employeeCode: `EMP-${1000 + employees.length + 1}`,
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`,
        email: values.email,
        phone: values.phone,
        role: values.role,
        designation: values.designation,
        departmentId: 'dept-01',
        departmentName: values.departmentName,
        joiningDate: values.joiningDate,
        status: 'ACTIVE',
        employmentType: 'FULL_TIME',
        location: values.location,
        ctcAnnual: values.ctcAnnual,
        bankDetails: {
          accountNumber: values.accountNumber,
          ifscCode: values.ifscCode,
          bankName: 'HDFC Bank Ltd.',
          panNumber: values.panNumber.toUpperCase(),
          uanNumber: values.uanNumber,
        },
        emergencyContact: {
          name: 'Primary Contact',
          relationship: 'Family',
          phone: values.phone,
        },
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'Employee Onboarded',
          message: `${newEmp.fullName} (${newEmp.employeeCode}) has been successfully added.`,
        })
      );
      setIsAddModalOpen(false);
      reset();
      loadEmployees();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Onboarding Failed' }));
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (window.confirm(`Are you sure you want to deactivate and archive ${emp.fullName}?`)) {
      await api.employees.delete(emp.id);
      dispatch(
        addToast({
          type: 'info',
          title: 'Employee Archived',
          message: `${emp.fullName} has been removed from active staff records.`,
        })
      );
      loadEmployees();
    }
  };

  const columns: Column<Employee>[] = [
    {
      key: 'fullName',
      header: 'Employee Details',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-indigo-50">
            {row.firstName[0]}
            {row.lastName[0]}
          </div>
          <div>
            <div className="font-semibold text-slate-900 leading-tight">{row.fullName}</div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{row.employeeCode} • {row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'departmentName',
      header: 'Department & Role',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.designation}</div>
          <div className="text-[11px] text-slate-500">{row.departmentName}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Access Level',
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.role === 'ADMIN' ? 'purple' : row.role === 'MANAGER' ? 'warning' : 'neutral'
          }
          size="sm"
        >
          {row.role}
        </Badge>
      ),
    },
    {
      key: 'joiningDate',
      header: 'Joined On',
      sortable: true,
      render: (row) => formatDate(row.joiningDate),
    },
    {
      key: 'ctcAnnual',
      header: 'Annual CTC',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-900">{formatINR(row.ctcAnnual)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === 'ACTIVE'
              ? 'success'
              : row.status === 'PROBATION'
              ? 'warning'
              : 'error'
          }
          size="sm"
          dot
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedEmployee(row);
              setIsViewModalOpen(true);
            }}
            className="!p-1.5 text-slate-500 hover:text-indigo-600"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="!p-1.5 text-slate-500 hover:text-rose-600"
            title="Deactivate"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain staff records, role designations, compensation benchmarks & profiles
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New Employee
        </Button>
      </div>

      {/* Main Table */}
      <DataTable
        data={employees}
        columns={columns}
        searchPlaceholder="Search by name, code, email, designation..."
        exportFileName="pulse_employees_directory"
        isLoading={isLoading}
      />

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Onboard New Employee"
        subtitle="Fill in employment, contact, statutory, and initial compensation details"
        size="xl"
      >
        <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-5">
          {/* Personal Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="e.g. Rahul"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="e.g. Sharma"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
              <Input
                label="Corporate Email"
                type="email"
                placeholder="r.sharma@pulsehrms.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Mobile Number"
                placeholder="+91 98765 43210"
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>
          </div>

          {/* Job Details */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              2. Designation & Placement
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Department"
                options={[
                  { value: 'Engineering', label: 'Engineering' },
                  { value: 'Product & Design', label: 'Product & Design' },
                  { value: 'People Operations', label: 'People Operations' },
                  { value: 'Sales & Growth', label: 'Sales & Growth' },
                  { value: 'Finance & Compliance', label: 'Finance & Compliance' },
                ]}
                error={errors.departmentName?.message}
                {...register('departmentName')}
              />
              <Input
                label="Designation Title"
                placeholder="e.g. Lead Engineer"
                error={errors.designation?.message}
                {...register('designation')}
              />
              <Select
                label="System Role"
                options={[
                  { value: 'EMPLOYEE', label: 'Individual Employee' },
                  { value: 'MANAGER', label: 'Team Manager' },
                  { value: 'ADMIN', label: 'HR Administrator' },
                ]}
                error={errors.role?.message}
                {...register('role')}
              />
              <Input
                label="Joining Date"
                type="date"
                error={errors.joiningDate?.message}
                {...register('joiningDate')}
              />
              <Input
                label="Base Location"
                placeholder="e.g. Bangalore HQ"
                error={errors.location?.message}
                {...register('location')}
              />
              <Input
                label="Annual CTC (INR)"
                type="number"
                placeholder="1800000"
                error={errors.ctcAnnual?.message}
                helperText="Computed into standard monthly salary structure"
                {...register('ctcAnnual')}
              />
            </div>
          </div>

          {/* Statutory & Banking */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              3. Banking & Statutory Credentials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Account Number"
                placeholder="501002938475"
                error={errors.accountNumber?.message}
                {...register('accountNumber')}
              />
              <Input
                label="Bank IFSC Code"
                placeholder="HDFC0001234"
                error={errors.ifscCode?.message}
                {...register('ifscCode')}
              />
              <Input
                label="Income Tax PAN"
                placeholder="ABCDE1234F"
                error={errors.panNumber?.message}
                {...register('panNumber')}
              />
              <Input
                label="EPFO UAN Number"
                placeholder="100928374651"
                error={errors.uanNumber?.message}
                {...register('uanNumber')}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Confirm & Onboard
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Employee Detail Modal */}
      {selectedEmployee && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Employee File: ${selectedEmployee.fullName}`}
          subtitle={`${selectedEmployee.employeeCode} • ${selectedEmployee.designation}`}
          size="lg"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Top Profile Summary */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg ring-4 ring-indigo-50">
                {selectedEmployee.firstName[0]}
                {selectedEmployee.lastName[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedEmployee.fullName}</h3>
                  <Badge variant="purple" size="sm">{selectedEmployee.role}</Badge>
                  <Badge variant="success" size="sm" dot>{selectedEmployee.status}</Badge>
                </div>
                <p className="text-slate-500 mt-0.5">{selectedEmployee.designation} • {selectedEmployee.departmentName}</p>
                <div className="flex items-center gap-4 mt-2 text-slate-600">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{selectedEmployee.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{selectedEmployee.phone}</span>
                </div>
              </div>
            </div>

            {/* Compensation & Bank Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Compensation Benchmark
                </h4>
                <div className="pt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Annual CTC:</span>
                    <span className="font-bold text-slate-900">{formatINR(selectedEmployee.ctcAnnual)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monthly Gross:</span>
                    <span className="font-semibold text-slate-800">
                      {formatINR(calculateSalaryFromCTC(selectedEmployee.ctcAnnual).grossMonthly)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Estimated Net In-Hand:</span>
                    <span className="font-bold text-emerald-600">
                      {formatINR(calculateSalaryFromCTC(selectedEmployee.ctcAnnual).netMonthly)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Statutory & Bank Records
                </h4>
                <div className="pt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank Name:</span>
                    <span className="font-medium text-slate-800">{selectedEmployee.bankDetails.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account No:</span>
                    <span className="font-mono text-slate-800">{selectedEmployee.bankDetails.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IFSC Code:</span>
                    <span className="font-mono text-slate-800">{selectedEmployee.bankDetails.ifscCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PAN Card:</span>
                    <span className="font-mono text-slate-800">{selectedEmployee.bankDetails.panNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">EPFO UAN:</span>
                    <span className="font-mono text-slate-800">{selectedEmployee.bankDetails.uanNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsViewModalOpen(false)}>
                Close Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
