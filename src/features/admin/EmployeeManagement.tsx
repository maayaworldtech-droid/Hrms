import { MOCK_USERS, getReportingManager } from '@/services/mockData';
import { EmployeeDetailsPanel } from '@/components/common/EmployeeDetailsPanel';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

import {
  UserPlus,
  Eye,
  Trash2,
  MapPin,
  Clock,
  Check,
  ArrowLeft,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  ScanFace,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  captureFaceSnapshot,
  analyzeVideoFrame,
  extractFaceDescriptorFromCanvas,
  extractDescriptorFromImage,
  generateBiometricSignature,
  drawBiometricHud,
  resetBiometricTracker,
  FaceBiometricDescriptor,
} from '@/utils/faceBiometrics';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

import { useRouteBackGuard } from '@/hooks/useRouteBackGuard';
import { DynamicSalaryItem } from '@/types';

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


export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

export const EMERGENCY_RELATIONSHIPS = [
  'Father',
  'Mother',
  'Spouse',
  'Sibling',
  'Child',
  'Friend',
  'Guardian',
  'Other',
] as const;


export const AVAILABLE_SALARY_COMPONENTS = [
  // Earnings
  { code: 'BASIC', name: 'Basic Pay', type: 'EARNING' as const, defaultPercent: 0.5 },
  { code: 'HRA', name: 'House Rent Allowance (HRA)', type: 'EARNING' as const, defaultPercent: 0.3 },
  { code: 'SPECIAL', name: 'Special Allowance', type: 'EARNING' as const, defaultPercent: 0.1 },
  { code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING' as const, defaultAmount: 1600 },
  { code: 'MEDICAL', name: 'Medical Allowance', type: 'EARNING' as const, defaultAmount: 1250 },
  { code: 'BONUS', name: 'Performance Bonus / Incentive', type: 'EARNING' as const, defaultAmount: 0 },
  { code: 'OTHER_EARNING', name: 'Other Allowance', type: 'EARNING' as const, defaultAmount: 0 },
  // Deductions
  { code: 'PF', name: 'Provident Fund (PF / EPF)', type: 'DEDUCTION' as const, defaultAmount: 0 },
  { code: 'PT', name: 'Professional Tax (PT)', type: 'DEDUCTION' as const, defaultAmount: 200 },
  { code: 'TDS', name: 'Tax Deducted at Source (TDS)', type: 'DEDUCTION' as const, defaultAmount: 0 },
  { code: 'ESI', name: 'Employee State Insurance (ESI)', type: 'DEDUCTION' as const, defaultAmount: 0 },
  { code: 'HEALTH_INS', name: 'Health Insurance', type: 'DEDUCTION' as const, defaultAmount: 500 },
  { code: 'GRATUITY', name: 'Gratuity', type: 'DEDUCTION' as const, defaultAmount: 0 },
  { code: 'OTHER_DEDUCTION', name: 'Other Deduction', type: 'DEDUCTION' as const, defaultAmount: 0 },
] as const;


const onboardingSchema = z.object({
  // Step 1: Basic Information, Blood Group & Emergency Contact
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
  bloodGroup: z
    .string()
    .trim()
    .min(1, 'Please select a blood group'),
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

  // Emergency Contact
  emergencyContactName: z
    .string()
    .trim()
    .min(1, 'Emergency contact full name is required'),
  emergencyContactRelationship: z
    .string()
    .trim()
    .min(1, 'Please select relationship with emergency contact'),
  emergencyContactPhone: z
    .string()
    .trim()
    .min(1, 'Emergency contact phone number is required')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit phone number'),

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
  bloodGroup: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
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

  // Step 4 Face Biometric Enrollment State
  const [enrolledFacePhoto, setEnrolledFacePhoto] = useState<string | null>(null);
  const [enrolledFaceBiometrics, setEnrolledFaceBiometrics] = useState<string | null>(null);
  const [faceSignature, setFaceSignature] = useState<string | null>(null);
  const [enrollmentMode, setEnrollmentMode] = useState<'CAMERA' | 'UPLOAD'>('CAMERA');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzingFace, setIsAnalyzingFace] = useState<boolean>(false);
  const [faceStatusMessage, setFaceStatusMessage] = useState<string>('Align face inside the oval guide');
  const [faceCentered, setFaceCentered] = useState<boolean>(false);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const procCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const prevImageDataRef = useRef<ImageData | null>(null);


  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startAnalysisLoop = useCallback(() => {
    let progress = 0;
    const processFrame = () => {
      const video = videoRef.current;
      const hudCanvas = hudCanvasRef.current;
      const procCanvas = procCanvasRef.current;

      if (!video || !hudCanvas || !procCanvas) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const displayW = video.clientWidth || video.videoWidth || 480;
      const displayH = video.clientHeight || video.videoHeight || 360;

      if (hudCanvas.width !== displayW || hudCanvas.height !== displayH) {
        hudCanvas.width = displayW;
        hudCanvas.height = displayH;
        procCanvas.width = 240;
        procCanvas.height = 180;
      }

      progress = (progress + 1) % 100;

      const analysis = analyzeVideoFrame(video, procCanvas, prevImageDataRef.current);
      if (analysis) {
        prevImageDataRef.current = analysis.currentImageData;
        const res = analysis.result;
        setFaceDetected(Boolean(res.faceDetected));
        if (res.faceDetected && res.isCentered) {
          setFaceCentered(true);
          setFaceStatusMessage('Face placed correctly in frame. Ready for capture.');
        } else if (res.faceDetected && !res.isCentered) {
          setFaceCentered(false);
          setFaceStatusMessage('Center face inside the frame (follow red guide)');
        } else {
          setFaceCentered(false);
          setFaceStatusMessage('Position face inside the red frame to detect');
        }
        drawBiometricHud(hudCanvas, res, 'ENROLLING', progress);
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, []);

  const startCamera = useCallback(async () => {
    resetBiometricTracker();
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        setCameraActive(true);

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          video.play().then(() => startAnalysisLoop()).catch(() => {
            video.onloadedmetadata = () => {
              video.play().catch(() => { });
              startAnalysisLoop();
            };
          });
        }
      } else {
        throw new Error('Webcam API unavailable in this browser');
      }
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(err?.message || 'Camera permission denied or camera not found.');
    }
  }, [startAnalysisLoop]);

  useEffect(() => {
    if (isAddingEmployee && currentStep === 4 && enrollmentMode === 'CAMERA' && !enrolledFacePhoto) {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isAddingEmployee, currentStep, enrollmentMode, enrolledFacePhoto, startCamera, stopCamera]);

  const handleCaptureFromCamera = async () => {
    const video = videoRef.current;
    const procCanvas = procCanvasRef.current;
    if (!video) return;

    const photo = captureFaceSnapshot(video);
    if (!photo) {
      dispatch(addToast({ type: 'error', title: 'Capture Failed', message: 'Could not capture snapshot from camera.' }));
      return;
    }

    let descriptor: FaceBiometricDescriptor | null = null;
    let signature = `BIO-MW-NEW-${Date.now()}`;

    if (procCanvas) {
      const analysis = analyzeVideoFrame(video, procCanvas, null);
      if (analysis?.result?.box && analysis.result.landmarks) {
        descriptor = extractFaceDescriptorFromCanvas(procCanvas, analysis.result.box, analysis.result.landmarks);
        signature = generateBiometricSignature(analysis.result.box, analysis.result.landmarks, 'MW-NEW');
      }
    }

    if (!descriptor) {
      descriptor = await extractDescriptorFromImage(photo);
    }

    stopCamera();
    setEnrolledFacePhoto(photo);
    setEnrolledFaceBiometrics(descriptor ? JSON.stringify(descriptor) : null);
    setFaceSignature(signature);

    dispatch(
      addToast({
        type: 'success',
        title: 'Face Biometrics Registered',
        message: 'Facial profile enrolled successfully for attendance verification.',
      })
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dispatch(addToast({ type: 'error', title: 'Invalid File', message: 'Please upload a valid image file (JPG, PNG, WebP).' }));
      return;
    }

    setIsAnalyzingFace(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setIsAnalyzingFace(false);
        return;
      }

      try {
        const desc = await extractDescriptorFromImage(dataUrl);
        if (!desc) {
          dispatch(
            addToast({
              type: 'error',
              title: 'No Face Detected',
              message: 'No clear human face was detected in this photo. Please upload a clear, front-facing portrait photo.',
            })
          );
          setIsAnalyzingFace(false);
          return;
        }

        const sig = `BIO-MW-IMG-${desc.eyeDistanceRatio}-${desc.eyeToNoseRatio}-${desc.aspectRatio}`;
        setEnrolledFacePhoto(dataUrl);
        setEnrolledFaceBiometrics(JSON.stringify(desc));
        setFaceSignature(sig);

        dispatch(
          addToast({
            type: 'success',
            title: 'Face Photo Verified & Enrolled',
            message: 'Facial descriptor and biometric signature extracted successfully.',
          })
        );
      } catch (err: any) {
        dispatch(addToast({ type: 'error', title: 'Analysis Error', message: 'Could not process face photo.' }));
      } finally {
        setIsAnalyzingFace(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRetakeFace = () => {
    setEnrolledFacePhoto(null);
    setEnrolledFaceBiometrics(null);
    setFaceSignature(null);
    if (enrollmentMode === 'CAMERA') {
      void startCamera();
    }
  };

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
      bloodGroup: '',
      addressLine: '',
      city: '',
      pincode: '',
      state: '',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone: '',
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

  // Dynamic Salary Breakdown state
  const [salaryComponents, setSalaryComponents] = useState<DynamicSalaryItem[]>([]);
  const [selectedComponentToAdd, setSelectedComponentToAdd] = useState<string>('');

  // Route back-button guard to prevent losing progress if back button is clicked in the middle
  useRouteBackGuard({
    isBlocked: isAddingEmployee,
    onBack: () => {
      if (currentStep > 1) {
        setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        if (window.confirm('Discard employee onboarding progress and return to directory?')) {
          setIsAddingEmployee(false);
          setCurrentStep(1);
          resetAdd();
          setEnrolledFacePhoto(null);
          setEnrolledFaceBiometrics(null);
          setFaceSignature(null);
          setSalaryComponents([]);
          stopCamera();
        }
      }
    },
    confirmMessage: 'You are currently onboarding an employee. Do you want to discard your progress and exit?',
  });

  const handleAddComponent = () => {
    if (!selectedComponentToAdd) return;
    const def = AVAILABLE_SALARY_COMPONENTS.find((c) => c.code === selectedComponentToAdd);
    if (!def) return;

    let defaultAmt = 0;
    const currentGross = Number(watchAdd('monthlySalary')) || 35000;
    if ('defaultPercent' in def && def.defaultPercent) {
      defaultAmt = Math.round(currentGross * def.defaultPercent);
    } else if ('defaultAmount' in def && def.defaultAmount) {
      defaultAmt = def.defaultAmount;
    }

    const newItem: DynamicSalaryItem = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: def.code,
      name: def.name,
      type: def.type,
      amount: defaultAmt,
    };

    setSalaryComponents((prev) => [...prev, newItem]);
    setSelectedComponentToAdd('');
  };

  const handleRemoveComponent = (id: string) => {
    setSalaryComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateComponentAmount = (id: string, amount: number) => {
    setSalaryComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, amount: Math.max(0, amount) } : c))
    );
  };

  const handleUpdateComponentName = (id: string, name: string) => {
    setSalaryComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
  };

  const handleGenerateStandardBreakdown = () => {
    const currentGross = Number(watchAdd('monthlySalary')) || 35000;
    const basic = Math.round(currentGross * 0.5);
    const hra = Math.round(currentGross * 0.3);
    const special = Math.round(currentGross * 0.1);
    const epf = Math.round(basic * 0.12);
    const pt = 200;
    const tds = Math.round(currentGross * 0.05);

    setSalaryComponents([
      { id: 'comp-basic', code: 'BASIC', name: 'Basic Pay', type: 'EARNING', amount: basic },
      { id: 'comp-hra', code: 'HRA', name: 'House Rent Allowance (HRA)', type: 'EARNING', amount: hra },
      { id: 'comp-special', code: 'SPECIAL', name: 'Special Allowance', type: 'EARNING', amount: special },
      { id: 'comp-conveyance', code: 'CONVEYANCE', name: 'Conveyance Allowance', type: 'EARNING', amount: 1600 },
      { id: 'comp-medical', code: 'MEDICAL', name: 'Medical Allowance', type: 'EARNING', amount: 1250 },
      { id: 'comp-pf', code: 'PF', name: 'Provident Fund (PF / EPF)', type: 'DEDUCTION', amount: epf },
      { id: 'comp-pt', code: 'PT', name: 'Professional Tax (PT)', type: 'DEDUCTION', amount: pt },
      { id: 'comp-tds', code: 'TDS', name: 'Tax Deducted at Source (TDS)', type: 'DEDUCTION', amount: tds },
    ]);
  };

  const totalGrossFromComponents = useMemo(() => {
    if (salaryComponents.length === 0) return Number(watchAdd('monthlySalary')) || 0;
    return salaryComponents
      .filter((c) => c.type === 'EARNING')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [salaryComponents, watchAdd('monthlySalary')]);

  const totalDeductionsFromComponents = useMemo(() => {
    return salaryComponents
      .filter((c) => c.type === 'DEDUCTION')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [salaryComponents]);

  const netTakeHomeFromComponents = useMemo(() => {
    return Math.max(0, totalGrossFromComponents - totalDeductionsFromComponents);
  }, [totalGrossFromComponents, totalDeductionsFromComponents]);

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
      'bloodGroup',
      'emergencyContactName',
      'emergencyContactRelationship',
      'emergencyContactPhone',
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

  const handleNextStep3 = async () => {
    const isValid = await triggerAdd([
      'bankName',
      'accountNumber',
      'ifscCode',
      'panNumber',
      'uanNumber',
    ]);
    if (isValid) {
      setCurrentStep(4);
    }
  };

  const onAddSubmit = async (values: OnboardingFormValues) => {
    if (!enrolledFacePhoto) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Facial Biometric Registration Required',
          message: 'Face registration is mandatory. Please capture via camera or upload the employee’s face photo to complete onboarding.',
        })
      );
      return;
    }

    try {
      const fullAddress = `${values.addressLine}, ${values.city}, ${values.state} - ${values.pincode}`.trim();
      const finalMonthlySalary = salaryComponents.length > 0 && totalGrossFromComponents > 0
        ? totalGrossFromComponents
        : values.monthlySalary;

      const newEmp = await api.employees.onboard({
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: values.phone,
        bloodGroup: values.bloodGroup,
        address: fullAddress,
        designation: 'Specialist',
        location: values.location,
        shift: values.shift,
        managerId: values.managerId || undefined,
        managerName: employees.find((e) => e.id === values.managerId)?.fullName || (values.managerId === MOCK_USERS.manager.id ? MOCK_USERS.manager.name : undefined),
        monthlySalary: finalMonthlySalary,
        ctcAnnual: finalMonthlySalary * 12,
        joiningDate: values.joiningDate,
        employmentType: 'FULL_TIME',
        enrolledFacePhoto: enrolledFacePhoto,
        enrolledFaceBiometrics: enrolledFaceBiometrics || undefined,
        salaryStructureJson: salaryComponents.length > 0 ? JSON.stringify(salaryComponents) : undefined,
        bankDetails: {
          accountNumber: values.accountNumber,
          ifscCode: values.ifscCode.toUpperCase(),
          bankName: values.bankName,
          panNumber: values.panNumber.toUpperCase(),
          uanNumber: values.uanNumber,
        },
        emergencyContact: {
          name: values.emergencyContactName,
          relationship: values.emergencyContactRelationship,
          phone: values.emergencyContactPhone,
        },
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'Employee Onboarded & Face Registered',
          message: `${newEmp.fullName} (${newEmp.employeeCode}) onboarded to ${newEmp.location}. Facial biometrics registered for attendance.`,
        })
      );
      setIsAddingEmployee(false);
      setCurrentStep(1);
      resetAdd();
      setEnrolledFacePhoto(null);
      setEnrolledFaceBiometrics(null);
      setFaceSignature(null);
      setSalaryComponents([]);
      stopCamera();
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
          {row.enrolledFacePhoto ? (
            <img
              src={row.enrolledFacePhoto}
              alt={row.fullName}
              className="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0"
              title="Registered Face ID"
            />
          ) : (
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
              {row.firstName?.[0] || 'M'}
              {row.lastName?.[0] || 'W'}
            </div>
          )}
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
              Step {currentStep} of 4
            </span>
            <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-[#3182C8] transition-all duration-300"
                style={{ width: currentStep === 1 ? '25%' : currentStep === 2 ? '50%' : currentStep === 3 ? '75%' : '100%' }}
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
              { step: 4, title: 'Facial Biometrics' },
            ].map((item, idx) => {
              const isCurrent = currentStep === item.step;
              const isCompleted = currentStep > item.step;
              return (
                <React.Fragment key={item.step}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.step < currentStep) setCurrentStep(item.step as 1 | 2 | 3 | 4);
                    }}
                    disabled={item.step > currentStep}
                    className={`flex items-center gap-3 text-left transition-colors ${isCurrent
                      ? 'text-sky-700 font-semibold'
                      : isCompleted
                        ? 'text-slate-700 hover:text-slate-900 cursor-pointer'
                        : 'text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${isCompleted
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
                  {idx < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 transition-colors ${currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-200'
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
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
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
                    <div className="sm:col-span-2">
                      <Select
                        label="Blood Group"
                        required
                        options={[
                          { value: '', label: 'Select Blood Group' },
                          ...BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg })),
                        ]}
                        error={errorsAdd.bloodGroup?.message}
                        {...registerAdd('bloodGroup')}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                    Emergency Contact Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Contact Full Name"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      error={errorsAdd.emergencyContactName?.message}
                      {...registerAdd('emergencyContactName')}
                    />
                    <Select
                      label="Relationship"
                      required
                      options={[
                        { value: '', label: 'Select Relationship' },
                        ...EMERGENCY_RELATIONSHIPS.map((rel) => ({ value: rel, label: rel })),
                      ]}
                      error={errorsAdd.emergencyContactRelationship?.message}
                      {...registerAdd('emergencyContactRelationship')}
                    />
                    <Input
                      label="Emergency Phone"
                      required
                      placeholder="10-digit mobile"
                      error={errorsAdd.emergencyContactPhone?.message}
                      {...registerAdd('emergencyContactPhone')}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
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
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
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

                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
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

                <div className="border-t border-slate-100 pt-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Dynamic Salary Breakdown Structure
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Salary fields differ per employee. Select and add applicable statutory or custom components (PF, PT, TDS, HRA) below.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateStandardBreakdown}
                      className="shrink-0"
                    >
                      Auto-Populate Template
                    </Button>
                  </div>

                  {/* Component Adder Dropdown */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={selectedComponentToAdd}
                      onChange={(e) => setSelectedComponentToAdd(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-600 bg-white"
                    >
                      <option value="">Choose salary component to add (e.g. PF, PT, TDS, HRA)...</option>
                      <optgroup label="Earnings & Allowances">
                        {AVAILABLE_SALARY_COMPONENTS.filter((c) => c.type === 'EARNING').map((c) => (
                          <option key={c.code} value={c.code}>
                            + {c.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Deductions">
                        {AVAILABLE_SALARY_COMPONENTS.filter((c) => c.type === 'DEDUCTION').map((c) => (
                          <option key={c.code} value={c.code}>
                            - {c.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddComponent}
                      disabled={!selectedComponentToAdd}
                      leftIcon={<Plus className="w-3.5 h-3.5" />}
                    >
                      Add Component
                    </Button>
                  </div>

                  {/* Configured Components Table / List */}
                  {salaryComponents.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden bg-white">
                      {salaryComponents.map((comp) => {
                        const isEarning = comp.type === 'EARNING';
                        return (
                          <div key={comp.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide shrink-0 ${isEarning
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                              >
                                {isEarning ? 'EARNING' : 'DEDUCTION'}
                              </span>
                              {comp.code?.startsWith('OTHER') ? (
                                <input
                                  type="text"
                                  value={comp.name}
                                  onChange={(e) => handleUpdateComponentName(comp.id, e.target.value)}
                                  placeholder="Component Name"
                                  className="font-medium text-xs text-slate-900 border border-slate-200 rounded px-2 py-1 w-44 focus:outline-none focus:border-indigo-600"
                                />
                              ) : (
                                <span className="font-semibold text-xs text-slate-800 truncate">
                                  {comp.name}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden px-2 py-1 bg-white focus-within:border-indigo-600">
                                <span className="text-slate-400 text-xs font-semibold mr-1">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="100"
                                  value={comp.amount || ''}
                                  onChange={(e) => handleUpdateComponentAmount(comp.id, Number(e.target.value))}
                                  placeholder="0"
                                  className="w-24 text-xs font-semibold text-slate-900 focus:outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveComponent(comp.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Remove Component"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center text-slate-500 bg-slate-50/50">
                      <p className="text-xs">No individual salary breakdown components selected yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Choose components from the dropdown above or click "Auto-Populate Template" to start customizing.
                      </p>
                    </div>
                  )}

                  {/* Live Calculation Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Total Gross</span>
                      <span className="font-bold text-slate-900">{formatINR(totalGrossFromComponents)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Total Deductions</span>
                      <span className="font-semibold text-rose-700">-{formatINR(totalDeductionsFromComponents)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Net Take-Home</span>
                      <span className="font-bold text-emerald-700">{formatINR(netTakeHomeFromComponents)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Annual CTC</span>
                      <span className="font-semibold text-slate-900">{formatINR(totalGrossFromComponents * 12)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Bank Account Details */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
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

            {/* Step 4: Facial Biometric Registration */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Facial Biometric Registration
                    </h3>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Required for Attendance
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Register the employee&apos;s reference facial profile. This biometric snapshot is saved to their profile and strictly verified against the employee&apos;s face during daily attendance punches.
                  </p>
                </div>

                {!enrolledFacePhoto && (
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEnrollmentMode('CAMERA');
                        void startCamera();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${enrollmentMode === 'CAMERA'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Live Camera Capture</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEnrollmentMode('UPLOAD');
                        stopCamera();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${enrollmentMode === 'UPLOAD'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Face Photo</span>
                    </button>
                  </div>
                )}

                {/* Camera Viewfinder */}
                {!enrolledFacePhoto && enrollmentMode === 'CAMERA' && (
                  <div className="space-y-3">
                    <div className={`relative rounded-xl overflow-hidden bg-slate-950 transition-colors duration-200 border-2 aspect-[4/3] max-w-md mx-auto flex items-center justify-center ${cameraActive
                      ? faceCentered
                        ? 'border-emerald-500 shadow-md shadow-emerald-500/15'
                        : 'border-rose-500/80 shadow-md shadow-rose-500/10'
                      : 'border-slate-800'
                      }`}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={procCanvasRef} className="hidden" />
                      <canvas ref={hudCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                      {!cameraActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900">
                          <Camera className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs font-semibold text-slate-200">Camera Offline</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{cameraError || 'Click below to activate webcam'}</p>
                          <Button type="button" size="sm" variant="primary" onClick={() => void startCamera()} className="mt-3">
                            Start Camera
                          </Button>
                        </div>
                      )}

                      {cameraActive && (
                        <div className={`absolute bottom-2.5 inset-x-2.5 backdrop-blur-xs border rounded-lg px-3 py-1.5 flex items-center justify-between text-xs transition-colors duration-200 ${faceCentered
                          ? 'bg-slate-950/85 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-950/85 border-rose-500/40 text-rose-200'
                          }`}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${faceCentered ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                            <span className="truncate text-[11px] font-medium">{faceStatusMessage}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide shrink-0 ${faceCentered
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                            {faceCentered ? 'IN FRAME (GREEN)' : 'ALIGN (RED)'}
                          </span>
                        </div>
                      )}
                    </div>

                    {cameraActive && (
                      <div className="flex justify-center pt-1">
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => void handleCaptureFromCamera()}
                          leftIcon={<Camera className="w-4 h-4" />}
                          disabled={!cameraActive}
                          className={`!h-10 px-6 font-semibold transition-all ${faceCentered
                            ? '!bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-xs'
                            : '!bg-slate-900 hover:!bg-slate-800 !text-white shadow-xs'
                            }`}
                        >
                          {faceCentered
                            ? 'Capture Face Biometrics'
                            : 'Capture Photo & Biometrics'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Photo Option */}
                {!enrolledFacePhoto && enrollmentMode === 'UPLOAD' && (
                  <div className="max-w-md mx-auto border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-600">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mb-1">
                      Upload Employee Face Portrait
                    </div>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Select a clear front-facing portrait photo (JPG, PNG, WebP).
                    </p>
                    <label className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer transition-colors shadow-xs">
                      <span>{isAnalyzingFace ? 'Analyzing Biometrics...' : 'Choose Photo File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isAnalyzingFace}
                        className="sr-only"
                      />
                    </label>
                  </div>
                )}

                {/* Enrolled Face Confirmation Preview */}
                {enrolledFacePhoto && (
                  <div className="max-w-md mx-auto p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Facial Biometrics Registered & Validated</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        ENROLLED
                      </span>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-emerald-100">
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-slate-900 border border-slate-200 shrink-0">
                        <img
                          src={enrolledFacePhoto}
                          alt="Enrolled Face"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {watchAdd('firstName') || 'Employee'} {watchAdd('lastName') || ''}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {faceSignature || 'BIO-MW-ENROLLED'}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>64-D Descriptor Generated & Stored</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      This registered face will be used as the biometric baseline for attendance punches. Any punch attempt by an unrecognized face will be flagged and rejected.
                    </p>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleRetakeFace}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retake / Change Photo</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Footer Action Controls */}
            <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Previous
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
                      setEnrolledFacePhoto(null);
                      setEnrolledFaceBiometrics(null);
                      setFaceSignature(null);
                      stopCamera();
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
                    Next: Work & Role
                  </Button>
                )}

                {currentStep === 2 && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNextStep2}
                  >
                    Next: Banking Details
                  </Button>
                )}

                {currentStep === 3 && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleNextStep3}
                  >
                    Next: Facial Biometrics
                  </Button>
                )}

                {currentStep === 4 && (
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmittingAdd}
                    disabled={!enrolledFacePhoto}
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
          title="Employee Onboarded"
          subtitle={`${onboardSuccessData.employee.fullName} (${onboardSuccessData.employee.employeeCode})`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {onboardSuccessData.employee.enrolledFacePhoto && (
                <div className="p-3 bg-emerald-50/50 flex items-center gap-3">
                  <img
                    src={onboardSuccessData.employee.enrolledFacePhoto}
                    alt="Registered Face"
                    className="w-12 h-12 rounded-lg object-cover border border-emerald-200 bg-white shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Facial Biometrics Registered</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Enrolled as single source of truth for daily attendance verification.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-slate-500 font-medium">Employee ID</span>
                <span className="font-mono font-medium text-slate-900">{onboardSuccessData.employee.employeeCode}</span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-slate-500 font-medium">Full Name</span>
                <span className="font-medium text-slate-900">{onboardSuccessData.employee.fullName}</span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-slate-500 font-medium">Corporate Email</span>
                <span className="font-medium text-slate-900">{onboardSuccessData.email}</span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-slate-500 font-medium">Center Location</span>
                <span className="font-medium text-slate-900">{onboardSuccessData.employee.location}</span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-slate-500 font-medium">Temporary Password</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {onboardSuccessData.tempPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(
                        `Maaya World HRMS Login Credentials\nEmail: ${onboardSuccessData.email}\nEmployee ID: ${onboardSuccessData.employee.employeeCode}\nTemporary Password: ${onboardSuccessData.tempPassword}\nPortal: ${window.location.origin}/login`
                      );
                      setCopiedCredentials(true);
                      setTimeout(() => setCopiedCredentials(false), 2000);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {copiedCredentials ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-slate-500 text-xs leading-relaxed">
              Login instructions have been sent to {onboardSuccessData.email}. The employee will be prompted to reset their password on first login.
            </p>

            <div className="flex justify-end pt-1">
              <Button
                variant="primary"
                onClick={() => setOnboardSuccessData(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
