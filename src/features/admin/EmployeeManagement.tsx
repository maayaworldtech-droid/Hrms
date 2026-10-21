import { MOCK_USERS, getReportingManager } from '@/services/mockData';
import { EmployeeDetailsPanel } from '@/components/common/EmployeeDetailsPanel';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

import { UserPlus, Eye, Trash2, MapPin, Clock, Copy, CheckCircle2, ShieldAlert, Check, ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;



const onboardingSchema = z.object({
  // Step 1: Basic Information & Split Address
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required'),
  email: z
    .string()
    .trim()
    .min(1, 'Corporate email is required')
    .email('Valid corporate email address required'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  addressLine: z
    .string()
    .trim()
    .min(1, 'Address line is required')
    .min(3, 'Address line must be at least 3 characters'),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .min(2, 'City must be at least 2 characters'),
  pincode: z
    .string()
    .trim()
    .min(1, 'PIN code is required')
    .regex(/^\d{6}$/, 'Enter a valid 6-digit postal PIN code'),
  state: z
    .string()
    .trim()
    .min(1, 'Please select a state or union territory'),

  // Step 2: Work Location & Compensation
  location: z.enum(['Hyderabad', 'Vizag', 'Bhubaneswar'], {
    errorMap: () => ({ message: 'Please select a center location' }),
  }),
  shift: z.enum(['MORNING', 'EVENING'], {
    errorMap: () => ({ message: 'Please select an operational shift' }),
  }),
  managerId: z
    .string()
    .trim()
    .min(1, 'Please select a reporting manager'),
  joiningDate: z
    .string()
    .trim()
    .min(1, 'Joining date is required'),
  monthlySalary: z.coerce
    .number({ invalid_type_error: 'Monthly salary is required' })
    .min(10000, 'Minimum monthly salary is ₹10,000'),

  // Step 3: Bank Account Details
  bankName: z
    .string()
    .trim()
    .min(1, 'Bank name is required')
    .min(2, 'Bank name must be at least 2 characters'),
  accountNumber: z
    .string()
    .trim()
    .min(1, 'Bank account number is required')
    .regex(/^\d{9,18}$/, 'Enter a valid bank account number (9 to 18 digits)'),
  ifscCode: z
    .string()
    .trim()
    .min(1, 'Bank IFSC code is required')
    .regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'Enter a valid 11-character IFSC code'),
  panNumber: z
    .string()
    .trim()
    .min(1, 'Income Tax PAN is required')
    .regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, 'Enter a valid 10-character PAN number'),
  uanNumber: z
    .string()
    .trim()
    .min(1, 'EPFO UAN number is required')
    .regex(/^\d{12}$/, 'Enter a valid 12-digit UAN number'),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

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
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
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
    trigger: triggerAdd,
    setValue: setValueAdd,
    watch: watchAdd,
    formState: { errors: errorsAdd, isSubmitting: isSubmittingAdd },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      addressLine: '',
      city: '',
      pincode: '',
      state: '',
      location: '' as any,
      shift: '' as any,
      managerId: '',
      joiningDate: '',
      monthlySalary: '' as any,
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      panNumber: '',
      uanNumber: '',
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

  const handleNextStep1 = async () => {
    const isValid = await triggerAdd([
      'firstName',
      'lastName',
      'email',
      'phone',
      'addressLine',
      'city',
      'pincode',
      'state',
    ]);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handleNextStep2 = async () => {
    const isValid = await triggerAdd([
      'location',
      'shift',
      'managerId',
      'joiningDate',
      'monthlySalary',
    ]);
    if (isValid) {
      setCurrentStep(3);
    }
  };

  const onAddSubmit = async (values: OnboardingFormValues) => {
    try {
      const fullAddress = `${values.addressLine}, ${values.city}, ${values.state} - ${values.pincode}`.trim();
      const newEmp = await api.employees.onboard({
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: values.phone,
        address: fullAddress,
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
          ifscCode: values.ifscCode.toUpperCase(),
          bankName: values.bankName,
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
      setIsAddingEmployee(false);
      setCurrentStep(1);
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

  const managers = [...new Map([{ id: MOCK_USERS.manager.id, name: MOCK_USERS.manager.name }, ...employees.filter(employee => employee.role === 'MANAGER').map(employee => ({ id: employee.id, name: employee.fullName }))].map(manager => [manager.id, manager])).values()];
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
      key: 'employeeCode',
      header: 'Employee ID',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {row.employeeCode}
        </span>
      ),
    },
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
              {row.email}
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

  if (isAddingEmployee) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Top Header with Back Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to exit onboarding? Unsaved changes will be discarded.')) {
                  setIsAddingEmployee(false);
                  setCurrentStep(1);
                  resetAdd();
                }
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Directory
            </Button>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                Onboard New Employee
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Step {currentStep} of 3
            </span>
            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-[#3182C8] transition-all duration-300"
                style={{ width: currentStep === 1 ? '33.3%' : currentStep === 2 ? '66.6%' : '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Stepper Navigation Indicator */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: 'Basic Information' },
              { step: 2, title: 'Work & Compensation' },
              { step: 3, title: 'Bank Account Details' },
            ].map((item, idx) => {
              const isCurrent = currentStep === item.step;
              const isCompleted = currentStep > item.step;
              return (
                <React.Fragment key={item.step}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.step < currentStep) setCurrentStep(item.step as 1 | 2 | 3);
                    }}
                    disabled={item.step > currentStep}
                    className={`flex items-center gap-3 text-left transition-colors ${
                      isCurrent
                        ? 'text-sky-700 font-semibold'
                        : isCompleted
                        ? 'text-slate-700 hover:text-slate-900 cursor-pointer'
                        : 'text-slate-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-[#3182C8] text-white ring-4 ring-sky-100'
                          : 'bg-slate-100 text-slate-500 border border-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : item.step}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-xs font-semibold leading-tight">{item.title}</div>
                    </div>
                  </button>
                  {idx < 2 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 transition-colors ${
                        currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Main Form Content Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <form onSubmit={handleSubmitAdd(onAddSubmit)} className="space-y-6 text-xs">
            {/* Step 1: Basic Information & Split Address */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Personal & Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      required
                      error={errorsAdd.firstName?.message}
                      {...registerAdd('firstName')}
                    />
                    <Input
                      label="Last Name"
                      required
                      error={errorsAdd.lastName?.message}
                      {...registerAdd('lastName')}
                    />
                    <Input
                      label="Corporate Email"
                      type="email"
                      required
                      error={errorsAdd.email?.message}
                      {...registerAdd('email')}
                    />
                    <Input
                      label="Phone Number"
                      required
                      error={errorsAdd.phone?.message}
                      {...registerAdd('phone')}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Residential Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <Input
                        label="Address Line / Street"
                        required
                        error={errorsAdd.addressLine?.message}
                        {...registerAdd('addressLine')}
                      />
                    </div>
                    <Input
                      label="City"
                      required
                      error={errorsAdd.city?.message}
                      {...registerAdd('city')}
                    />
                    <Select
                      label="State / Union Territory"
                      required
                      options={[
                        { value: '', label: 'Select State / Union Territory' },
                        ...INDIAN_STATES.map((st) => ({ value: st, label: st })),
                      ]}
                      error={errorsAdd.state?.message}
                      {...registerAdd('state')}
                    />
                    <Input
                      label="Pincode"
                      required
                      error={errorsAdd.pincode?.message}
                      {...registerAdd('pincode')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Work Location & Compensation */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Work Location & Operational Shift
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Center Location"
                      required
                      options={[
                        { value: '', label: 'Select Center Location' },
                        { value: 'Hyderabad', label: 'Hyderabad (Prism Mall)' },
                        { value: 'Vizag', label: 'Vizag (Beach Road)' },
                        { value: 'Bhubaneswar', label: 'Bhubaneswar (KIIT Chowk)' },
                      ]}
                      error={errorsAdd.location?.message}
                      {...registerAdd('location')}
                    />
                    <Select
                      label="Shift Timing"
                      required
                      options={[
                        { value: '', label: 'Select Shift Timing' },
                        { value: 'MORNING', label: 'Morning Shift (9:00 AM – 1:00 PM)' },
                        { value: 'EVENING', label: 'Evening Shift (1:00 PM – 9:00 PM)' },
                      ]}
                      error={errorsAdd.shift?.message}
                      {...registerAdd('shift')}
                    />
                    <div className="sm:col-span-2">
                      <Select
                        id="add-reporting-manager"
                        label="Reporting Manager"
                        required
                        options={[
                          { value: '', label: 'Select Reporting Manager' },
                          ...managers.map((m) => ({ value: m.id, label: m.name })),
                        ]}
                        error={errorsAdd.managerId?.message}
                        {...registerAdd('managerId')}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Compensation & Joining Schedule
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Joining Date"
                      type="date"
                      required
                      error={errorsAdd.joiningDate?.message}
                      {...registerAdd('joiningDate')}
                    />
                    <Input
                      label="Monthly Salary (₹)"
                      type="number"
                      required
                      error={errorsAdd.monthlySalary?.message}
                      {...registerAdd('monthlySalary')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Bank Account Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">
                    Banking Credentials & Statutory Registration
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Bank Name"
                        required
                        error={errorsAdd.bankName?.message}
                        {...registerAdd('bankName')}
                      />
                    </div>
                    <Input
                      label="Bank Account Number"
                      required
                      error={errorsAdd.accountNumber?.message}
                      {...registerAdd('accountNumber')}
                    />
                    <Input
                      label="Bank IFSC Code"
                      required
                      error={errorsAdd.ifscCode?.message}
                      {...registerAdd('ifscCode')}
                    />
                    <Input
                      label="Income Tax PAN"
                      required
                      error={errorsAdd.panNumber?.message}
                      {...registerAdd('panNumber')}
                    />
                    <Input
                      label="EPFO UAN Number"
                      required
                      error={errorsAdd.uanNumber?.message}
                      {...registerAdd('uanNumber')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form Footer Action Controls */}
            <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ← Previous Step
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (window.confirm('Discard onboarding progress and return to directory?')) {
                      setIsAddingEmployee(false);
                      setCurrentStep(1);
                      resetAdd();
                    }
                  }}
                >
                  Cancel & Exit
                </Button>
              )}

              <div className="flex items-center gap-2.5">
                {currentStep === 1 && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNextStep1}
                  >
                    Next: Work & Role →
                  </Button>
                )}

                {currentStep === 2 && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNextStep2}
                  >
                    Next: Banking Details →
                  </Button>
                )}

                {currentStep === 3 && (
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmittingAdd}
                  >
                    Confirm & Onboard Employee
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header matching Zoho Inspiration */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Employee Directory
          </h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setCurrentStep(1);
            resetAdd();
            setIsAddingEmployee(true);
          }}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add Employee
        </Button>
      </div>

      {/* Main Employee Directory Data Table */}
      <DataTable
        key={[selectedLocationFilter, selectedShiftFilter].join(':')}
        columns={columns}
        data={filteredEmployees}
        isLoading={isLoading}
        searchPlaceholder="Search by name, employee code, or location..."
        filterComponent={filterToolbar}
        pageSize={15}
        emptyTitle="No staff records found"
        emptyDescription="No active employees matched your search or location filter criteria."
      />

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
                <Select id="edit-reporting-manager" label="Reports to" options={[{ value: '', label: 'Not assigned' }, ...managers.filter(manager => manager.id !== editingEmployee.id).map(manager => ({ value: manager.id, label: manager.name }))]} error={errorsEdit.managerId?.message} helperText="This Manager reviews leave requests." {...registerEdit('managerId')} />
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
