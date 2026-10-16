import { MOCK_USERS, getReportingManager } from '@/services/mockData';
import { EmployeeDetailsPanel } from '@/components/common/EmployeeDetailsPanel';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';

const DEFAULT_JOINING_DATE = '2026-01-15';
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

import { UserPlus, Eye, Trash2, MapPin, Clock, Copy, CheckCircle2, ShieldAlert, Check } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const employeeSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid corporate email required'),
  phone: z.string().min(10, 'Valid 10-digit phone number required'),
  address: z.string().min(5, 'Residential address is required (min 5 chars)'),
  location: z.enum(['Hyderabad', 'Vizag', 'Bhubaneswar']),
  shift: z.enum(['MORNING', 'EVENING']),
  managerId: z.string(),
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
  const [onboardSuccessData, setOnboardSuccessData] = useState<{
    employee: Employee;
    tempPassword: string;
    email: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

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
      managerId: '',
      joiningDate: DEFAULT_JOINING_DATE,
      monthlySalary: 32000,
      address: 'Plot 42, HITEC City, Madhapur, Hyderabad, Telangana - 500081',
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

  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.employees.getAll();
      setEmployees(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    resetEdit({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      address: emp.address || '',
      location: (emp.location as 'Hyderabad' | 'Vizag' | 'Bhubaneswar') || 'Hyderabad',
      shift: emp.shift || 'MORNING',
      managerId: getReportingManager(emp).id || '',
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
      const newEmp = await api.employees.onboard({
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: values.phone,
        address: values.address,
        designation: 'Specialist',
        location: values.location,
        shift: values.shift,
        managerId: values.managerId || undefined,
        managerName: employees.find((e) => e.id === values.managerId)?.fullName || (values.managerId === MOCK_USERS.manager.id ? MOCK_USERS.manager.name : undefined),
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
          title: 'Employee Onboarded Successfully',
          message: `${newEmp.fullName} (${newEmp.employeeCode}) onboarded to ${newEmp.location}. Welcome email queued via Zoho ZeptoMail.`,
        })
      );
      setIsAddModalOpen(false);
      resetAdd();
      loadEmployees();

      // Show credentials modal for administrative record & copy
      const generatedPwd = (newEmp as any).password || 'Maaya@' + Math.floor(1000 + Math.random() * 9000);
      setOnboardSuccessData({
        employee: newEmp,
        tempPassword: generatedPwd,
        email: newEmp.email,
      });
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Onboarding Failed', message: err?.message || 'Could not onboard employee.' }));
    }
  };

  const onEditSubmit = async (values: EmployeeFormValues) => {
    if (!editingEmployee) return;
    try {
      await api.employees.update(editingEmployee.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: values.phone,
        address: values.address,
        location: values.location,
        shift: values.shift,
        managerId: values.managerId,
        managerName: employees.find((e) => e.id === values.managerId)?.fullName || (values.managerId === MOCK_USERS.manager.id ? MOCK_USERS.manager.name : undefined),
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

  const managers = [...new Map([{ id: MOCK_USERS.manager.id, name: MOCK_USERS.manager.name }, ...employees.filter(employee => employee.role === 'MANAGER').map(employee => ({ id: employee.id, name: employee.fullName }))].map(manager => [manager.id,manager])).values()];
  const unassigned = employees.filter(employee => employee.id !== MOCK_USERS.admin.id && employee.id !== MOCK_USERS.manager.id && employee.role !== 'ADMIN' && !getReportingManager(employee).id).length;

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

      {unassigned > 0 && <p className="ops-muted">{unassigned} employees have no reporting Manager. Open an employee and use Edit → Reports to to assign their leave approver.</p>}
      {/* Main Employee Directory Data Table */}
      <DataTable
        key={[selectedLocationFilter,selectedShiftFilter].join(':')}
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
              <div className="sm:col-span-2">
                <Input
                  label="Residential Address"
                  placeholder="e.g. Flat 301, Sri Sai Enclave, Madhapur, Hyderabad - 500081"
                  error={errorsAdd.address?.message}
                  {...registerAdd('address')}
                />
              </div>
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
              <Select id="add-reporting-manager" label="Reports to" options={[{value: '',label: 'Not assigned'}, ...managers.map(manager => ({value: manager.id,label: manager.name}))]} error={errorsAdd.managerId?.message} helperText="This Manager reviews leave requests." {...registerAdd('managerId')} />
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
                <div className="sm:col-span-2">
                  <Input
                    label="Residential Address"
                    placeholder="e.g. Flat 301, Sri Sai Enclave, Madhapur, Hyderabad - 500081"
                    error={errorsEdit.address?.message}
                    {...registerEdit('address')}
                  />
                </div>
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
                <Select id="edit-reporting-manager" label="Reports to" options={[{value: '',label: 'Not assigned'}, ...managers.filter(manager => manager.id !== editingEmployee.id).map(manager => ({value: manager.id,label: manager.name}))]} error={errorsEdit.managerId?.message} helperText="This Manager reviews leave requests." {...registerEdit('managerId')} />
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

      {selectedEmployee && isViewModalOpen && <EmployeeDetailsPanel key={selectedEmployee.id} employee={selectedEmployee} isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} onEdit={() => handleOpenEdit(selectedEmployee)} />}

      {/* Onboarding Credentials Modal */}
      {onboardSuccessData && (
        <Modal
          isOpen={!!onboardSuccessData}
          onClose={() => setOnboardSuccessData(null)}
          title="Employee Onboarded & Credentials Dispatched"
          subtitle={`Account created for ${onboardSuccessData.employee.fullName}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-emerald-900">
                  Welcome Email Dispatched via Zoho ZeptoMail
                </div>
                <div className="text-emerald-700 mt-0.5">
                  An automated email containing login instructions and initial credentials was sent to{' '}
                  <span className="font-semibold">{onboardSuccessData.email}</span>.
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Generated Login Credentials
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">Employee Code / ID</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    {onboardSuccessData.employee.employeeCode}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Corporate Email</div>
                  <div className="font-medium text-slate-900 truncate mt-0.5" title={onboardSuccessData.email}>
                    {onboardSuccessData.email}
                  </div>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <div className="text-slate-400 text-[11px]">Default Temporary Password</div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono text-sm font-bold bg-white px-3 py-1.5 rounded border border-slate-300 text-slate-900 tracking-wider">
                      {onboardSuccessData.tempPassword}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `Maaya World HRMS Login Credentials:\nEmail: ${onboardSuccessData.email}\nEmployee ID: ${onboardSuccessData.employee.employeeCode}\nTemporary Password: ${onboardSuccessData.tempPassword}\nPortal: ${window.location.origin}/login`
                        );
                        setCopiedCredentials(true);
                        setTimeout(() => setCopiedCredentials(false), 2500);
                      }}
                      leftIcon={copiedCredentials ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copiedCredentials ? 'Copied' : 'Copy Credentials'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Security Policy:</span> The employee is marked with{' '}
                <span className="font-semibold">mandatory password reset</span> and will be prompted to create a new password on their very first login.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                onClick={() => setOnboardSuccessData(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
