import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { Employee } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { formatINR, formatDate } from '@/utils/formatters';
import { calculateSalaryFromMonthly } from '@/utils/salaryCalculator';
import {
  UserPlus,
  Eye,
  Pencil,
  Trash2,
  CreditCard,
  Phone,
  Mail,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const employeeSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid corporate email required'),
  phone: z.string().min(10, 'Valid 10-digit phone number required'),
  location: z.enum(['Hyderabad', 'Vizag', 'Bhubaneswar']),
  shift: z.enum(['MORNING', 'EVENING']),
  joiningDate: z.string().min(1, 'Joining date required'),
  monthlySalary: z.coerce.number().min(10000, 'Minimum monthly salary is ₹10,000'),
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd, isSubmitting: isSubmittingAdd },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      location: 'Hyderabad',
      shift: 'MORNING',
      joiningDate: new Date().toISOString().split('T')[0],
      monthlySalary: 32000,
      accountNumber: '918273645281',
      ifscCode: 'HDFC0001234',
      panNumber: 'ABCPS1234F',
      uanNumber: '100928374699',
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
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

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    resetEdit({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      location: (emp.location as 'Hyderabad' | 'Vizag' | 'Bhubaneswar') || 'Hyderabad',
      shift: emp.shift || 'MORNING',
      joiningDate: emp.joiningDate,
      monthlySalary: emp.monthlySalary || Math.round((emp.ctcAnnual || 360000) / 12),
      accountNumber: emp.bankDetails?.accountNumber || '',
      ifscCode: emp.bankDetails?.ifscCode || '',
      panNumber: emp.bankDetails?.panNumber || '',
      uanNumber: emp.bankDetails?.uanNumber || '',
    });
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const onAddSubmit = async (values: EmployeeFormValues) => {
    try {
      const newEmp = await api.employees.create({
        employeeCode: `MW-${1000 + employees.length + 1}`,
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`,
        email: values.email,
        phone: values.phone,
        designation: '',
        location: values.location,
        shift: values.shift,
        monthlySalary: values.monthlySalary,
        ctcAnnual: values.monthlySalary * 12,
        joiningDate: values.joiningDate,
        employmentType: 'FULL_TIME',
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
          message: `${newEmp.fullName} (${newEmp.employeeCode}) has been successfully added to ${newEmp.location} (${newEmp.shift === 'EVENING' ? 'Evening Shift' : 'Morning Shift'}).`,
        })
      );
      setIsAddModalOpen(false);
      resetAdd();
      loadEmployees();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Onboarding Failed' }));
    }
  };

  const onEditSubmit = async (values: EmployeeFormValues) => {
    if (!editingEmployee) return;
    try {
      await api.employees.update(editingEmployee.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`,
        email: values.email,
        phone: values.phone,
        location: values.location,
        shift: values.shift,
        monthlySalary: values.monthlySalary,
        ctcAnnual: values.monthlySalary * 12,
        joiningDate: values.joiningDate,
        bankDetails: {
          accountNumber: values.accountNumber,
          ifscCode: values.ifscCode,
          bankName: editingEmployee.bankDetails?.bankName || 'HDFC Bank Ltd.',
          panNumber: values.panNumber.toUpperCase(),
          uanNumber: values.uanNumber,
        },
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'Profile Updated',
          message: `${values.firstName} ${values.lastName}'s employee record has been updated.`,
        })
      );
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      loadEmployees();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Update Failed' }));
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (window.confirm(`Are you sure you want to deactivate and remove ${emp.fullName}?`)) {
      await api.employees.delete(emp.id);
      dispatch(
        addToast({
          type: 'info',
          title: 'Employee Archived',
          message: `${emp.fullName} has been removed from staff records.`,
        })
      );
      loadEmployees();
    }
  };

  // Filtered dataset by Location and Shift
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchLoc = selectedLocationFilter === 'ALL' || emp.location === selectedLocationFilter;
      const matchShift = selectedShiftFilter === 'ALL' || (emp.shift || 'MORNING') === selectedShiftFilter;
      return matchLoc && matchShift;
    });
  }, [employees, selectedLocationFilter, selectedShiftFilter]);

  const columns: Column<Employee>[] = [
    {
      key: 'fullName',
      header: 'Employee Details',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
            {row.firstName?.[0] || 'M'}
            {row.lastName?.[0] || 'W'}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">{row.fullName}</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
              {row.employeeCode} • {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-medium text-xs">{row.location}</span>
        </div>
      ),
    },
    {
      key: 'shift',
      header: 'Shift Timing',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs">
            {row.shift === 'EVENING' ? 'Evening (1 PM – 9 PM)' : 'Morning (9 AM – 1 PM)'}
          </span>
        </div>
      ),
    },
    {
      key: 'joiningDate',
      header: 'Joining Date',
      sortable: true,
      render: (row) => (
        <span className="tabular-nums text-slate-700 font-mono">{formatDate(row.joiningDate)}</span>
      ),
    },
    {
      key: 'monthlySalary',
      header: 'Monthly Salary',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-900 tabular-nums">
          {formatINR(row.monthlySalary || Math.round((row.ctcAnnual || 360000) / 12))}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedEmployee(row);
              setIsViewModalOpen(true);
            }}
            className="!h-7 !w-7 !p-0 text-slate-400 hover:text-indigo-600"
            title="View Employee File"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="!h-7 !w-7 !p-0 text-slate-400 hover:text-rose-600"
            title="Deactivate"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const filterToolbar = (
    <div className="flex items-center gap-2">
      <select
        value={selectedLocationFilter}
        onChange={(e) => setSelectedLocationFilter(e.target.value)}
        aria-label="Location filter"
        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="ALL">All Centers ({employees.length})</option>
        <option value="Hyderabad">Hyderabad ({employees.filter((e) => e.location === 'Hyderabad').length})</option>
        <option value="Vizag">Vizag ({employees.filter((e) => e.location === 'Vizag').length})</option>
        <option value="Bhubaneswar">Bhubaneswar ({employees.filter((e) => e.location === 'Bhubaneswar').length})</option>
      </select>

      <select
        value={selectedShiftFilter}
        onChange={(e) => setSelectedShiftFilter(e.target.value)}
        aria-label="Shift filter"
        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="ALL">All Shifts</option>
        <option value="MORNING">Morning Shift (9 AM – 1 PM)</option>
        <option value="EVENING">Evening Shift (1 PM – 9 PM)</option>
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header matching Zoho Inspiration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Employee Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Managing {employees.length} team members across Hyderabad, Vizag, and Bhubaneswar centers
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add Employee
        </Button>
      </div>

      {/* Main Employee Directory Data Table */}
      <DataTable
        columns={columns}
        data={filteredEmployees}
        isLoading={isLoading}
        searchPlaceholder="Search by name, employee code, or location..."
        filterComponent={filterToolbar}
        pageSize={15}
        emptyTitle="No staff records found"
        emptyDescription="No active employees matched your search or location filter criteria."
      />

      {/* Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Employee"
        subtitle="Onboard a new team member to Maaya World"
        size="lg"
      >
        <form onSubmit={handleSubmitAdd(onAddSubmit)} className="space-y-4 text-xs">
          {/* Basic Info */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              1. Basic Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="First Name"
                placeholder="e.g. Rahul"
                error={errorsAdd.firstName?.message}
                {...registerAdd('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="e.g. Sharma"
                error={errorsAdd.lastName?.message}
                {...registerAdd('lastName')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="r.sharma@maayaworld.com"
                error={errorsAdd.email?.message}
                {...registerAdd('email')}
              />
              <Input
                label="Phone Number"
                placeholder="+91 98765 43210"
                error={errorsAdd.phone?.message}
                {...registerAdd('phone')}
              />
            </div>
          </div>

          {/* Job Details */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              2. Placement & Compensation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <Select
                label="Center Location"
                options={[
                  { value: 'Hyderabad', label: 'Hyderabad (Prism Mall)' },
                  { value: 'Vizag', label: 'Vizag (Beach Road)' },
                  { value: 'Bhubaneswar', label: 'Bhubaneswar (KIIT Chowk)' },
                ]}
                error={errorsAdd.location?.message}
                {...registerAdd('location')}
              />
              <Select
                label="Shift Timing"
                options={[
                  { value: 'MORNING', label: 'Morning (9:00 AM – 1:00 PM)' },
                  { value: 'EVENING', label: 'Evening (1:00 PM – 9:00 PM)' },
                ]}
                error={errorsAdd.shift?.message}
                {...registerAdd('shift')}
              />
              <Input
                label="Joining Date"
                type="date"
                error={errorsAdd.joiningDate?.message}
                {...registerAdd('joiningDate')}
              />
              <Input
                label="Monthly Salary (₹)"
                type="number"
                placeholder="32000"
                error={errorsAdd.monthlySalary?.message}
                helperText="Standard monthly salary in INR"
                {...registerAdd('monthlySalary')}
              />
            </div>
          </div>

          {/* Banking Details */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              3. Banking & Statutory Credentials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Bank Account Number"
                placeholder="501002938475"
                error={errorsAdd.accountNumber?.message}
                {...registerAdd('accountNumber')}
              />
              <Input
                label="Bank IFSC Code"
                placeholder="HDFC0001234"
                error={errorsAdd.ifscCode?.message}
                {...registerAdd('ifscCode')}
              />
              <Input
                label="Income Tax PAN"
                placeholder="ABCDE1234F"
                error={errorsAdd.panNumber?.message}
                {...registerAdd('panNumber')}
              />
              <Input
                label="EPFO UAN Number"
                placeholder="100928374651"
                error={errorsAdd.uanNumber?.message}
                {...registerAdd('uanNumber')}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
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
              isLoading={isSubmittingAdd}
            >
              Confirm & Onboard
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEmployee(null);
          }}
          title={`Edit Employee: ${editingEmployee.fullName}`}
          subtitle={`Update details for ${editingEmployee.employeeCode}`}
          size="lg"
        >
          <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4 text-xs">
            {/* Basic Info */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                1. Basic Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="First Name"
                  error={errorsEdit.firstName?.message}
                  {...registerEdit('firstName')}
                />
                <Input
                  label="Last Name"
                  error={errorsEdit.lastName?.message}
                  {...registerEdit('lastName')}
                />
                <Input
                  label="Email"
                  type="email"
                  error={errorsEdit.email?.message}
                  {...registerEdit('email')}
                />
                <Input
                  label="Phone Number"
                  error={errorsEdit.phone?.message}
                  {...registerEdit('phone')}
                />
              </div>
            </div>

            {/* Placement Details */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                2. Placement & Compensation
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <Select
                  label="Center Location"
                  options={[
                    { value: 'Hyderabad', label: 'Hyderabad (Prism Mall)' },
                    { value: 'Vizag', label: 'Vizag (Beach Road)' },
                    { value: 'Bhubaneswar', label: 'Bhubaneswar (KIIT Chowk)' },
                  ]}
                  error={errorsEdit.location?.message}
                  {...registerEdit('location')}
                />
                <Select
                  label="Shift Timing"
                  options={[
                    { value: 'MORNING', label: 'Morning (9:00 AM – 1:00 PM)' },
                    { value: 'EVENING', label: 'Evening (1:00 PM – 9:00 PM)' },
                  ]}
                  error={errorsEdit.shift?.message}
                  {...registerEdit('shift')}
                />
                <Input
                  label="Joining Date"
                  type="date"
                  error={errorsEdit.joiningDate?.message}
                  {...registerEdit('joiningDate')}
                />
                <Input
                  label="Monthly Salary (₹)"
                  type="number"
                  error={errorsEdit.monthlySalary?.message}
                  helperText="Standard monthly salary in INR"
                  {...registerEdit('monthlySalary')}
                />
              </div>
            </div>

            {/* Banking Details */}
            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                3. Banking & Statutory Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Bank Account Number"
                  error={errorsEdit.accountNumber?.message}
                  {...registerEdit('accountNumber')}
                />
                <Input
                  label="Bank IFSC Code"
                  error={errorsEdit.ifscCode?.message}
                  {...registerEdit('ifscCode')}
                />
                <Input
                  label="Income Tax PAN"
                  error={errorsEdit.panNumber?.message}
                  {...registerEdit('panNumber')}
                />
                <Input
                  label="EPFO UAN Number"
                  error={errorsEdit.uanNumber?.message}
                  {...registerEdit('uanNumber')}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEmployee(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmittingEdit}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Employee Detail Modal */}
      {selectedEmployee && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Employee Record: ${selectedEmployee.fullName}`}
          subtitle={`${selectedEmployee.employeeCode} • ${selectedEmployee.location} Center`}
          size="lg"
        >
          <div className="space-y-4 text-xs text-slate-700">
            {/* Top Profile Summary */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0">
                  {selectedEmployee.firstName?.[0] || 'M'}
                  {selectedEmployee.lastName?.[0] || 'W'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{selectedEmployee.fullName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1 font-medium text-indigo-600">
                      <MapPin className="w-3 h-3 text-indigo-500" />
                      {selectedEmployee.location} Center
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {selectedEmployee.shift === 'EVENING' ? 'Evening Shift (1:00 PM – 9:00 PM)' : 'Morning Shift (9:00 AM – 1:00 PM)'}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{selectedEmployee.employeeCode}</span>
                  </div>
                </div>
              </div>

              {/* Edit button in view modal */}
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => handleOpenEdit(selectedEmployee)}
              >
                Edit
              </Button>
            </div>

            {/* Compensation & Bank Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  Monthly Compensation
                </h4>
                <div className="pt-1 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Monthly Salary:</span>
                    <span className="font-bold font-mono text-base text-slate-900">
                      {formatINR(selectedEmployee.monthlySalary || Math.round((selectedEmployee.ctcAnnual || 360000) / 12))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Basic (50%):</span>
                    <span className="font-mono text-slate-700">
                      {formatINR(calculateSalaryFromMonthly(selectedEmployee.monthlySalary || Math.round((selectedEmployee.ctcAnnual || 360000) / 12)).basic)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Estimated Take-Home:</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {formatINR(calculateSalaryFromMonthly(selectedEmployee.monthlySalary || Math.round((selectedEmployee.ctcAnnual || 360000) / 12)).netMonthly)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  Banking & Statutory Details
                </h4>
                <div className="pt-1 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank Name:</span>
                    <span className="font-medium text-slate-800">{selectedEmployee.bankDetails?.bankName || 'HDFC Bank'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account No:</span>
                    <span className="font-mono text-slate-800">{selectedEmployee.bankDetails?.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">IFSC Code:</span>
                    <span className="font-mono text-slate-800">{selectedEmployee.bankDetails?.ifscCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Income Tax PAN:</span>
                    <span className="font-mono text-slate-800">{selectedEmployee.bankDetails?.panNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">EPFO UAN:</span>
                    <span className="font-mono text-slate-800">{selectedEmployee.bankDetails?.uanNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-3 rounded-lg bg-slate-50/60 border border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {selectedEmployee.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {selectedEmployee.phone}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Joined {formatDate(selectedEmployee.joiningDate)}
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Pencil className="w-3.5 h-3.5" />}
                onClick={() => handleOpenEdit(selectedEmployee)}
              >
                Edit Employee Details
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
