import { getReportingManager } from '@/utils/reportingManager';
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
import { formatINR } from '@/utils/formatters';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/common/Badge';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  UserPlus,
  Eye,
  Trash2,
  Check,
  ArrowLeft,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
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

import { useCenters, findCenter } from '@/hooks/useCenters';
import { SalarySetup } from './SalarySetup';
import { SalarySetupValue, emptySalarySetup, salaryProblem, salarySetupFromEmployee, summarizeSalary } from '@/utils/salarySetup';
import { businessDate } from '@/utils/operations';
import { accessLabel } from '@/utils/access';
import { getShiftLabel } from '@/utils/shiftUtils';

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


const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

const EMERGENCY_RELATIONSHIPS = [
  'Father',
  'Mother',
  'Spouse',
  'Sibling',
  'Child',
  'Friend',
  'Guardian',
  'Other',
] as const;

/**
 * A half-finished new employee is kept in sessionStorage so leaving the page, refreshing or
 * tapping back by mistake never loses what was typed. sessionStorage (not localStorage) because
 * the draft holds bank and PAN details and should not outlive the browser tab.
 */
const DRAFT_KEY = 'maaya_new_employee_draft_v2';

interface OnboardingDraft {
  values: Record<string, unknown>;
  maxStep: 1 | 2 | 3 | 4;
  salary: SalarySetupValue;
  facePhoto: string | null;
  faceBiometrics: string | null;
  savedAt: string;
}

const readDraft = (): OnboardingDraft | null => {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as OnboardingDraft) : null;
  } catch {
    return null;
  }
};

const writeDraft = (draft: OnboardingDraft) => {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked: try again without the photo, which is by far the largest part
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, facePhoto: null, faceBiometrics: null }));
    } catch {
      /* the guard dialog still protects against accidental exits */
    }
  }
};

const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
};

/** Statutory PF: 12% of basic pay, with basic counted up to ₹15,000 a month (so at most ₹1,800). */
const onboardingSchema = z
  .object({
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
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
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
    designation: z.string().trim().max(60, 'Keep the job title under 60 characters').optional().or(z.literal('')),
    location: z.string().trim().min(1, 'Please select a center'),
    shift: z.enum(['MORNING', 'EVENING'], {
      errorMap: () => ({ message: 'Please choose a shift' }),
    }),
    managerId: z
      .string()
      .trim()
      .min(1, 'Please select a reporting manager'),
    joiningDate: z
      .string()
      .trim()
      .min(1, 'Joining date is required'),
    hasPf: z.boolean().optional(),
    uanNumber: z.string().trim().optional().or(z.literal('')),

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
    confirmAccountNumber: z
      .string()
      .trim()
      .min(1, 'Please confirm the bank account number'),
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
  })
  .superRefine((data, ctx) => {
    if (data.hasPf) {
      const cleanUan = (data.uanNumber || '').trim();
      if (!cleanUan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter the 12-digit UAN because PF is being deducted',
          path: ['uanNumber'],
        });
      } else if (!/^\d{12}$/.test(cleanUan)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid 12-digit UAN number',
          path: ['uanNumber'],
        });
      }
    }
    if (data.accountNumber && data.confirmAccountNumber !== data.accountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bank account numbers do not match',
        path: ['confirmAccountNumber'],
      });
    }
  });

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const employeeSchema = z
  .object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Enter a valid email address'),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    bloodGroup: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    address: z.string().trim().min(5, 'Residential address is required'),
    designation: z.string().trim().max(60, 'Keep the job title under 60 characters').optional().or(z.literal('')),
    location: z.string().trim().min(1, 'Please select a center'),
    shift: z.enum(['MORNING', 'EVENING']),
    managerId: z.string(),
    joiningDate: z.string().min(1, 'Joining date is required'),
    accountNumber: z.string().trim().regex(/^\d{8,18}$/, 'Enter a valid bank account number (8 to 18 digits)'),
    confirmAccountNumber: z.string().trim().min(1, 'Please confirm the bank account number'),
    bankName: z.string().trim().min(2, 'Bank name is required'),
    ifscCode: z.string().trim().regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'Enter a valid 11-character IFSC code'),
    panNumber: z.string().trim().regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, 'Enter a valid 10-character PAN number'),
    uanNumber: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || /^\d{12}$/.test(v), 'Enter a valid 12-digit UAN number'),
  })
  .superRefine((data, ctx) => {
    if (data.accountNumber !== data.confirmAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bank account numbers do not match',
        path: ['confirmAccountNumber'],
      });
    }
  });

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const EmployeeManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { centers } = useCenters();
  const centerSelectOptions = centers.map((c) => ({
    value: c.name,
    label: c.address ? `${c.name} (${c.address.split(',')[0]})` : c.name,
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { mode } = useParams();
  const isAddingEmployee = mode === 'new';
  const [maxStep, setMaxStep] = useState<1 | 2 | 3 | 4>(1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editSalary, setEditSalary] = useState<SalarySetupValue>(emptySalarySetup);
  const [editSalaryError, setEditSalaryError] = useState<string | null>(null);
  // Face used for check-in: only the admin can replace it (staff cannot change their own)
  const [editFacePhoto, setEditFacePhoto] = useState<string | null>(null);
  const [editFaceBusy, setEditFaceBusy] = useState(false);
  // Whose edit form is open, so a slow photo for someone else is never shown here
  const editFaceForRef = useRef<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [onboardSuccessData, setOnboardSuccessData] = useState<{
    employee: Employee;
    tempPassword: string;
    email: string;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('q') || '';
  // The step lives in the URL so the browser back button moves one step back, not out of the form.
  // A step that was never reached (for example a typed URL) falls back to the furthest one reached.
  const requestedStep = Math.min(4, Math.max(1, Number(searchParams.get('step')) || 1)) as 1 | 2 | 3 | 4;
  const currentStep = (Math.min(requestedStep, maxStep) as 1 | 2 | 3 | 4);
  const allowLeaveRef = useRef(false);
  const restoredRef = useRef(false);
  const [draftSummary, setDraftSummary] = useState<{ name: string; savedAt: string; maxStep: number } | null>(null);

  // Step 4 Face Biometric Enrollment State
  const [enrolledFacePhoto, setEnrolledFacePhoto] = useState<string | null>(null);
  const [enrolledFaceBiometrics, setEnrolledFaceBiometrics] = useState<string | null>(null);
  const [, setFaceSignature] = useState<string | null>(null);
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
          setFaceStatusMessage('Face is in place. Tap Capture face.');
        } else if (res.faceDetected && !res.isCentered) {
          setFaceCentered(false);
          setFaceStatusMessage('Move the face to the middle of the oval');
        } else {
          setFaceCentered(false);
          setFaceStatusMessage('Bring the face inside the oval');
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
    if (!faceDetected) {
      dispatch(addToast({ type: 'error', title: 'No face found', message: 'Bring the face inside the oval, then capture.' }));
      return;
    }

    const photo = captureFaceSnapshot(video);
    if (!photo) {
      dispatch(addToast({ type: 'error', title: 'Could not take the photo', message: 'Try again, or upload a photo instead.' }));
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
        title: 'Face saved',
        message: 'This photo will be used when they check in.',
      })
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dispatch(addToast({ type: 'error', title: 'Not a photo', message: 'Choose a JPG, PNG or WebP photo.' }));
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
              title: 'No face found in this photo',
              message: 'Use a clear photo looking straight at the camera.',
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
            title: 'Face saved',
            message: 'This photo will be used when they check in.',
          })
        );
      } catch {
        dispatch(addToast({ type: 'error', title: 'Could not read the photo', message: 'Try a different photo.' }));
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
    clearErrors: clearErrorsAdd,
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
      designation: '',
      location: '' as any,
      shift: '' as any,
      managerId: '',
      joiningDate: businessDate(),
      hasPf: false,
      uanNumber: '',
      bankName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      panNumber: '',
    },
  });


  // Pay: yearly salary or a breakdown, plus the deductions that apply (see SalarySetup)
  const [salary, setSalary] = useState<SalarySetupValue>(emptySalarySetup);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const salarySummary = summarizeSalary(salary);
  const hasPfComponent = salarySummary.hasPf;

  /** Empties every field of the new-employee form (does not navigate). */
  const clearWizard = useCallback(
    () => {
      setMaxStep(1);
      resetAdd();
      setEnrolledFacePhoto(null);
      setEnrolledFaceBiometrics(null);
      setFaceSignature(null);
      setSalary(emptySalarySetup());
      setSalaryError(null);
      stopCamera();
    },
    [resetAdd, stopCamera]
  );

  /** Starts a brand-new employee, throwing away any saved draft. */
  const startNewEmployee = () => {
    clearDraft();
    clearWizard();
    restoredRef.current = true;
    setDraftSummary(null);
    navigate('/admin/employees/new?step=1');
  };

  /** Re-opens the saved draft at the furthest step reached. */
  const continueDraft = () => {
    restoredRef.current = false;
    navigate(`/admin/employees/new?step=${draftSummary?.maxStep || 1}`);
  };

  const discardDraft = () => {
    clearDraft();
    clearWizard();
    setDraftSummary(null);
  };

  /** Leaves the form on purpose (after saving, or after the admin chose Discard). */
  const leaveWizard = (keepDraft = false) => {
    if (!keepDraft) {
      clearDraft();
      clearWizard();
    }
    allowLeaveRef.current = true;
    navigate('/admin/employees');
  };


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
    setLoadError(null);
    try {
      // The admin is the owner, not staff: keep them off the list so they cannot be edited or deactivated here
      const data = await api.employees.getAll();
      setEmployees(data.filter((employee) => employee.role !== 'ADMIN'));
    } catch (err: any) {
      const message = err?.message || 'Unable to connect to the HRMS backend server.';
      setLoadError(message);
      dispatch(addToast({ type: 'error', title: 'Could not load employees', message }));
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditSalary(salarySetupFromEmployee(emp));
    setEditSalaryError(null);
    setEditFacePhoto(emp.enrolledFacePhoto || null);
    editFaceForRef.current = emp.id;
    if (!emp.enrolledFacePhoto && emp.hasFacePhoto) {
      api.employees
        .getById(emp.id)
        .then((full) => {
          if (editFaceForRef.current === emp.id && full?.enrolledFacePhoto) setEditFacePhoto(full.enrolledFacePhoto);
        })
        .catch(() => undefined);
    }
    resetEdit({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      // Stored numbers may carry +91 or spaces; the form works with the 10-digit mobile number
      phone: (emp.phone || '').replace(/\D/g, '').slice(-10),
      address: emp.address || '',
      designation: emp.designation || '',
      location: findCenter(centers, emp.location)?.name || '',
      shift: emp.shift || 'MORNING',
      managerId: getReportingManager(emp).id || '',
      joiningDate: emp.joiningDate,
      accountNumber: emp.bankDetails?.accountNumber || '',
      confirmAccountNumber: emp.bankDetails?.accountNumber || '',
      bankName: emp.bankDetails?.bankName || '',
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
    if (isValid) goToStep(2);
  };

  const handleNextStep2 = async () => {
    // The UAN is only asked for (and checked) when PF is one of the deductions
    setValueAdd('hasPf', hasPfComponent);
    if (!hasPfComponent) {
      setValueAdd('uanNumber', '');
      clearErrorsAdd('uanNumber');
    }
    const fieldsToValidate: (keyof OnboardingFormValues)[] = ['location', 'shift', 'managerId', 'joiningDate'];
    if (hasPfComponent) fieldsToValidate.push('uanNumber');
    const isValid = await triggerAdd(fieldsToValidate);
    const problem = salaryProblem(salary);
    setSalaryError(problem);
    if (isValid && !problem) goToStep(3);
  };

  const handleNextStep3 = async () => {
    const isValid = await triggerAdd([
      'bankName',
      'accountNumber',
      'confirmAccountNumber',
      'ifscCode',
      'panNumber',
    ]);
    if (isValid) goToStep(4);
  };

  const onAddSubmit = async (values: OnboardingFormValues) => {
    if (!enrolledFacePhoto) {
      dispatch(
        addToast({
          type: 'error',
          title: 'Add a face photo first',
          message: 'Staff check in with their face, so a photo is needed before you can add them.',
        })
      );
      return;
    }

    try {
      const fullAddress = `${values.addressLine}, ${values.city}, ${values.state} - ${values.pincode}`.trim();
      const problem = salaryProblem(salary);
      if (problem) {
        setSalaryError(problem);
        goToStep(2);
        return;
      }

      const newEmp = await api.employees.onboard({
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: values.phone,
        bloodGroup: values.bloodGroup,
        address: fullAddress,
        designation: '',
        location: values.location,
        shift: values.shift,
        managerId: values.managerId || undefined,
        managerName: employees.find((e) => e.id === values.managerId)?.fullName,
        monthlySalary: salarySummary.monthly,
        ctcAnnual: salarySummary.yearly,
        joiningDate: values.joiningDate,
        employmentType: 'FULL_TIME',
        enrolledFacePhoto: enrolledFacePhoto,
        enrolledFaceBiometrics: enrolledFaceBiometrics || undefined,
        salaryStructureJson: salarySummary.json,
        bankDetails: {
          accountNumber: values.accountNumber,
          ifscCode: values.ifscCode.toUpperCase(),
          bankName: values.bankName,
          panNumber: values.panNumber.toUpperCase(),
          uanNumber: hasPfComponent ? (values.uanNumber || '').trim() : '',
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
          title: 'Employee added',
          message: `${newEmp.fullName} (${newEmp.employeeCode}) can now sign in and check in at ${newEmp.location}.`,
        })
      );
      leaveWizard();
      loadEmployees();

      // Show credentials modal for administrative record & copy
      const generatedPwd = (newEmp as any).temporaryPassword || 'Dispatched via email';
      setOnboardSuccessData({
        employee: newEmp,
        tempPassword: generatedPwd,
        email: newEmp.email,
      });
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not add employee', message: err?.message || 'Please check the details and try again.' }));
    }
  };

  /** Replaces the face used for check-in with an uploaded photo (saved straight away). */
  const replaceFace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingEmployee) return;
    if (!file.type.startsWith('image/')) {
      dispatch(addToast({ type: 'error', title: 'Not a photo', message: 'Choose a JPG, PNG or WebP photo.' }));
      return;
    }
    setEditFaceBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const descriptor = await extractDescriptorFromImage(dataUrl);
      if (!descriptor) {
        dispatch(addToast({ type: 'error', title: 'No face found in this photo', message: 'Use a clear photo looking straight at the camera.' }));
        return;
      }
      await api.employees.enrollFace(editingEmployee.id, dataUrl, JSON.stringify(descriptor));
      if (editFaceForRef.current === editingEmployee.id) setEditFacePhoto(dataUrl);
      dispatch(addToast({ type: 'success', title: 'Face updated', message: `${editingEmployee.fullName} will check in with the new photo.` }));
      loadEmployees();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not update the face', message: err?.message || 'Please try again.' }));
    } finally {
      setEditFaceBusy(false);
    }
  };

  const onEditSubmit = async (values: EmployeeFormValues) => {
    if (!editingEmployee) return;
    const problem = salaryProblem(editSalary);
    setEditSalaryError(problem);
    if (problem) return;
    const pay = summarizeSalary(editSalary);
    const uan = (values.uanNumber || '').trim();
    if (pay.hasPf && !/^\d{12}$/.test(uan)) {
      setEditSalaryError('Enter the 12-digit PF number (UAN) because PF is deducted.');
      return;
    }
    try {
      await api.employees.update(editingEmployee.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        fullName: `${values.firstName} ${values.lastName}`.trim(),
        email: values.email,
        phone: values.phone,
        address: values.address,
        designation: editingEmployee.designation || '',
        location: values.location,
        shift: values.shift,
        managerId: values.managerId,
        managerName: employees.find((e) => e.id === values.managerId)?.fullName,
        monthlySalary: pay.monthly,
        ctcAnnual: pay.yearly,
        salaryStructureJson: pay.json,
        joiningDate: values.joiningDate,
        bankDetails: {
          accountNumber: values.accountNumber,
          ifscCode: values.ifscCode.toUpperCase(),
          bankName: values.bankName,
          panNumber: values.panNumber.toUpperCase(),
          uanNumber: (values.uanNumber || '').trim(),
        },
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'Changes saved',
          message: `${values.firstName} ${values.lastName}'s details were updated.`,
        })
      );
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      loadEmployees();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Could not save changes', message: 'Please try again.' }));
    }
  };

  const confirmDelete = async () => {
    if (!deletingEmployee) return;
    setIsDeleting(true);
    try {
      await api.employees.delete(deletingEmployee.id);
      dispatch(addToast({ type: 'success', title: 'Employee deactivated', message: `${deletingEmployee.fullName} can no longer sign in.` }));
      setDeletingEmployee(null);
      void loadEmployees();
    } catch (err: any) {
      dispatch(addToast({ type: 'error', title: 'Could not deactivate', message: err?.message || 'Please try again.' }));
    } finally {
      setIsDeleting(false);
    }
  };

  const managers = employees.filter(employee => employee.role === 'MANAGER' && employee.status !== 'TERMINATED').map(employee => ({ id: employee.id, name: employee.fullName, location: employee.location }));
  const managersAt = (center?: string) => (center ? managers.filter((m) => m.location === center) : []);
  const unassigned = employees.filter(employee => employee.role !== 'ADMIN' && employee.role !== 'MANAGER' && !getReportingManager(employee).id).length;

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
      header: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700" aria-hidden="true">
            {(row.firstName?.[0] || '') + (row.lastName?.[0] || '')}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{row.fullName}</div>
            <div className="truncate text-xs text-slate-600">
              <span className="tabular-nums">{row.employeeCode}</span> · {accessLabel(row.role)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Center',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-slate-900">{row.location || 'No center'}</div>
          <div className="text-xs text-slate-600">{getShiftLabel(row.shift)}</div>
        </div>
      ),
    },
    {
      key: 'managerName',
      header: 'Reports to',
      render: (row) => {
        const manager = getReportingManager(row);
        return manager.id ? manager.name : row.role === 'ADMIN' || row.role === 'MANAGER' ? <span className="text-slate-600">Not applicable</span> : <span className="text-amber-800">Not assigned</span>;
      },
    },
    {
      key: 'hasFacePhoto',
      header: 'Face ID',
      render: (row) =>
        row.hasFacePhoto ? (
          <Badge variant="success" size="sm" dot>
            Registered
          </Badge>
        ) : (
          <Badge variant="warning" size="sm" dot>
            Missing
          </Badge>
        ),
    },
    {
      key: 'monthlySalary',
      header: 'Monthly salary',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-medium text-slate-900">
          {row.monthlySalary || row.ctcAnnual ? formatINR(row.monthlySalary || Math.round(row.ctcAnnual / 12)) : 'Not set'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEmployee(row);
              setIsViewModalOpen(true);
            }}
            aria-label={`View ${row.fullName}`}
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingEmployee(row);
            }}
            className="hover:bg-rose-50 hover:text-rose-700"
            aria-label={`Deactivate ${row.fullName}`}
            title="Deactivate"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const FILTER_SELECT =
    'h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30';

  const filterToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <select value={selectedLocationFilter} onChange={(e) => setSelectedLocationFilter(e.target.value)} aria-label="Filter by center" className={FILTER_SELECT}>
        <option value="ALL">All centers ({employees.length})</option>
        {centers.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name} ({employees.filter((e) => e.location === c.name).length})
          </option>
        ))}
      </select>
      <select value={selectedShiftFilter} onChange={(e) => setSelectedShiftFilter(e.target.value)} aria-label="Filter by shift" className={FILTER_SELECT}>
        <option value="ALL">All shifts</option>
        <option value="MORNING">{getShiftLabel('MORNING')}</option>
        <option value="EVENING">{getShiftLabel('EVENING')}</option>
      </select>
    </div>
  );

  // Anything typed counts as progress worth protecting
  const formValues = watchAdd();
  const hasProgress =
    isAddingEmployee &&
    (maxStep > 1 ||
      salary.items.length > 0 ||
      salary.yearly.trim() !== '' ||
      Boolean(enrolledFacePhoto) ||
      Object.entries(formValues).some(([key, value]) => key !== 'joiningDate' && key !== 'hasPf' && value !== '' && value !== undefined && value !== null && value !== false));

  // Blocks every way out of the form: browser or phone back, sidebar, search and links.
  // Moving between steps stays on the same path, so it is never blocked.
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        !allowLeaveRef.current && hasProgress && currentLocation.pathname !== nextLocation.pathname,
      [hasProgress]
    )
  );

  const stayInWizard = () => {
    setConfirmExitOpen(false);
    if (blocker.state === 'blocked') blocker.reset();
  };

  const exitWizard = (keepDraft: boolean) => {
    setConfirmExitOpen(false);
    if (!keepDraft) {
      clearDraft();
      clearWizard();
    }
    if (blocker.state === 'blocked') {
      allowLeaveRef.current = true;
      blocker.proceed();
    } else {
      leaveWizard(keepDraft);
    }
  };

  // Re-arm the guard each time the form is opened again
  useEffect(() => {
    if (isAddingEmployee) allowLeaveRef.current = false;
  }, [isAddingEmployee]);

  // Save the draft as the admin types
  const draftJson = JSON.stringify({ formValues, maxStep, salary });
  useEffect(() => {
    if (!isAddingEmployee || !restoredRef.current || !hasProgress) return;
    writeDraft({
      values: formValues as Record<string, unknown>,
      maxStep,
      salary,
      facePhoto: enrolledFacePhoto,
      faceBiometrics: enrolledFaceBiometrics,
      savedAt: new Date().toISOString(),
    });
    // draftJson captures every saved field; the photo is compared by reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddingEmployee, draftJson, enrolledFacePhoto, enrolledFaceBiometrics, hasProgress]);

  // Bring the draft back when the form opens (after a refresh, or from "Continue")
  useEffect(() => {
    if (!isAddingEmployee || restoredRef.current) return;
    restoredRef.current = true;
    const draft = readDraft();
    if (!draft) return;
    resetAdd(draft.values as Partial<OnboardingFormValues>);
    setMaxStep(draft.maxStep || 1);
    setSalary(draft.salary && Array.isArray(draft.salary.items) ? draft.salary : emptySalarySetup());
    setEnrolledFacePhoto(draft.facePhoto || null);
    setEnrolledFaceBiometrics(draft.faceBiometrics || null);
  }, [isAddingEmployee, resetAdd]);

  // On the list, offer to continue a saved draft
  useEffect(() => {
    if (isAddingEmployee) return;
    restoredRef.current = false;
    const draft = readDraft();
    if (!draft) {
      setDraftSummary(null);
      return;
    }
    const v = draft.values as { firstName?: string; lastName?: string };
    setDraftSummary({ name: `${v.firstName || ''} ${v.lastName || ''}`.trim(), savedAt: draft.savedAt, maxStep: draft.maxStep || 1 });
  }, [isAddingEmployee]);

  // Closing or refreshing the tab with unsaved typing asks first
  useEffect(() => {
    if (!hasProgress) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasProgress]);

  const STEPS = [
    { step: 1, title: 'Personal details' },
    { step: 2, title: 'Work and pay' },
    { step: 3, title: 'Bank and tax' },
    { step: 4, title: 'Face ID' },
  ] as const;

  /** Forward steps add a history entry (so Back returns here); going back replaces it. */
  const goToStep = (next: 1 | 2 | 3 | 4) => {
    if (next > maxStep) setMaxStep(next);
    setSearchParams({ step: String(next) }, { replace: next < currentStep });
    document.getElementById('workspace-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isAddingEmployee) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        <PageHeader
          title="Add employee"
          description={`Step ${currentStep} of 4 · ${STEPS[currentStep - 1].title}`}
          actions={
            <Button type="button" variant="outline" onClick={() => navigate('/admin/employees')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to employees
            </Button>
          }
        />

        <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
          {STEPS.map((item) => {
            const isCurrent = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <li key={item.step}>
                <button
                  type="button"
                  onClick={() => item.step <= maxStep && item.step !== currentStep && goToStep(item.step)}
                  disabled={item.step > maxStep || isCurrent}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex w-full flex-col gap-1.5 border-t-2 pt-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:cursor-default ${
                    isCurrent ? 'border-brand-600 font-semibold text-brand-700' : isCompleted || item.step <= maxStep ? 'border-emerald-600 text-slate-900 hover:text-brand-700' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isCompleted ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <span className="tabular-nums">{item.step}.</span>}
                    <span className="hidden sm:inline">{item.title}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-8">
          <form
            onSubmit={(event) => {
              if (currentStep === 1) {
                event.preventDefault();
                void handleNextStep1();
              } else if (currentStep === 2) {
                event.preventDefault();
                void handleNextStep2();
              } else if (currentStep === 3) {
                event.preventDefault();
                void handleNextStep3();
              } else {
                void handleSubmitAdd(onAddSubmit)(event);
              }
            }}
            className="space-y-6"
            noValidate
          >
            {/* Step 1: Basic Information & Split Address */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-3 text-base font-semibold text-slate-900">
                    Personal & contact details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="First name"
                      required
                      error={errorsAdd.firstName?.message}
                      {...registerAdd('firstName')}
                    />
                    <Input
                      label="Last name"
                      required
                      error={errorsAdd.lastName?.message}
                      {...registerAdd('lastName')}
                    />
                    <Input
                      label="Email (used to sign in)"
                      type="email"
                      required
                      error={errorsAdd.email?.message}
                      {...registerAdd('email')}
                    />
                    <Input
                      label="Mobile number"
                      required
                      error={errorsAdd.phone?.message}
                      {...registerAdd('phone')}
                    />
                    <div className="sm:col-span-2">
                      <Select
                        label="Blood group"
                        required
                        options={[
                          { value: '', label: 'Choose blood group' },
                          ...BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg })),
                        ]}
                        error={errorsAdd.bloodGroup?.message}
                        {...registerAdd('bloodGroup')}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">
                    Emergency contact details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="Contact name"
                      required
                      placeholder="For example Ramesh Kumar"
                      error={errorsAdd.emergencyContactName?.message}
                      {...registerAdd('emergencyContactName')}
                    />
                    <Select
                      label="Relationship"
                      required
                      options={[
                        { value: '', label: 'Choose relationship' },
                        ...EMERGENCY_RELATIONSHIPS.map((rel) => ({ value: rel, label: rel })),
                      ]}
                      error={errorsAdd.emergencyContactRelationship?.message}
                      {...registerAdd('emergencyContactRelationship')}
                    />
                    <Input
                      label="Contact mobile number"
                      required
                      placeholder="10-digit mobile"
                      error={errorsAdd.emergencyContactPhone?.message}
                      {...registerAdd('emergencyContactPhone')}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">
                    Residential address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-3">
                      <Input
                        label="House, street and area"
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
                      label="State"
                      required
                      options={[
                        { value: '', label: 'Choose state' },
                        ...INDIAN_STATES.map((st) => ({ value: st, label: st })),
                      ]}
                      error={errorsAdd.state?.message}
                      {...registerAdd('state')}
                    />
                    <Input
                      label="PIN code"
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
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Center and shift</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Center"
                      required
                      options={[{ value: '', label: 'Choose a center' }, ...centerSelectOptions]}
                      error={errorsAdd.location?.message}
                      {...registerAdd('location', {
                        onChange: (event) => {
                          // Each center has its own manager: pick them automatically when there is exactly one
                          const here = managersAt(event.target.value);
                          setValueAdd('managerId', here.length === 1 ? here[0].id : '');
                        },
                      })}
                    />
                    <Select
                      label="Shift"
                      required
                      options={[
                        { value: '', label: 'Choose a shift' },
                        { value: 'MORNING', label: getShiftLabel('MORNING') },
                        { value: 'EVENING', label: getShiftLabel('EVENING') },
                      ]}
                      error={errorsAdd.shift?.message}
                      {...registerAdd('shift')}
                    />
                    <div className="sm:col-span-2">
                      <Select
                        id="add-reporting-manager"
                        label="Center manager"
                        required
                        helperText={
                          !watchAdd('location')
                            ? 'Choose the center first.'
                            : managersAt(watchAdd('location')).length === 0
                            ? 'This center has no manager yet. Add one in Settings, or choose a manager from another center.'
                            : 'Approves their leave and On Duty requests.'
                        }
                        options={[
                          { value: '', label: 'Choose a manager' },
                          ...(managersAt(watchAdd('location')).length > 0 ? managersAt(watchAdd('location')) : managers).map((m) => ({ value: m.id, label: m.name })),
                        ]}
                        error={errorsAdd.managerId?.message}
                        {...registerAdd('managerId')}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Joining date</h3>
                  <div className="max-w-sm">
                    <Input
                      label="Joining date"
                      type="date"
                      required
                      error={errorsAdd.joiningDate?.message}
                      {...registerAdd('joiningDate')}
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <h3 className="mb-3 text-base font-semibold text-slate-900">Pay</h3>
                  <SalarySetup
                    idPrefix="add"
                    value={salary}
                    onChange={(next) => {
                      setSalary(next);
                      if (salaryError) setSalaryError(salaryProblem(next));
                    }}
                    error={salaryError}
                  />
                  {hasPfComponent && (
                    <div className="mt-4 max-w-sm">
                      <Input
                        label="PF number (UAN)"
                        required
                        inputMode="numeric"
                        placeholder="12-digit number"
                        helperText="Needed because PF is deducted."
                        error={errorsAdd.uanNumber?.message}
                        {...registerAdd('uanNumber')}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Bank Account Details */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="mb-3 text-base font-semibold text-slate-900">
                    Bank, PAN and PF details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Input
                        label="Bank name"
                        required
                        error={errorsAdd.bankName?.message}
                        {...registerAdd('bankName')}
                      />
                    </div>
                    <Input
                      label="Account number"
                      required
                      error={errorsAdd.accountNumber?.message}
                      {...registerAdd('accountNumber')}
                    />
                    <Input
                      label="Re-enter account number"
                      required
                      placeholder="Re-enter bank account number"
                      error={errorsAdd.confirmAccountNumber?.message}
                      {...registerAdd('confirmAccountNumber')}
                    />
                    <Input
                      label="IFSC code"
                      required
                      error={errorsAdd.ifscCode?.message}
                      {...registerAdd('ifscCode')}
                    />
                    <Input
                      label="PAN"
                      required
                      error={errorsAdd.panNumber?.message}
                      {...registerAdd('panNumber')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Face ID */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Face ID</h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Required. This photo is the reference the employee&apos;s face is matched against at every check-in.
                  </p>
                </div>

                {!enrolledFacePhoto && (
                  <div className="inline-flex rounded-lg border border-slate-300 p-0.5" role="tablist" aria-label="How to capture the face">
                    {(
                      [
                        ['CAMERA', 'Use camera', Camera],
                        ['UPLOAD', 'Upload a photo', Upload],
                      ] as const
                    ).map(([mode, label, Icon]) => (
                      <button
                        key={mode}
                        type="button"
                        role="tab"
                        aria-selected={enrollmentMode === mode}
                        onClick={() => {
                          setEnrollmentMode(mode);
                          if (mode === 'CAMERA') void startCamera();
                          else stopCamera();
                        }}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                          enrollmentMode === mode ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}

                {!enrolledFacePhoto && enrollmentMode === 'CAMERA' && (
                  <div className="space-y-3">
                    <div
                      className={`relative mx-auto flex aspect-[4/3] max-w-md items-center justify-center overflow-hidden rounded-lg border-2 bg-slate-950 transition-colors duration-200 ${
                        cameraActive ? (faceCentered ? 'border-emerald-500' : 'border-amber-400') : 'border-slate-800'
                      }`}
                    >
                      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                      <canvas ref={procCanvasRef} className="hidden" />
                      <canvas ref={hudCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />

                      {!cameraActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
                          <Camera className="mb-2 h-8 w-8 text-slate-400" aria-hidden="true" />
                          <p className="text-sm font-medium text-white">Camera is off</p>
                          <p className="mt-0.5 text-sm text-slate-300">{cameraError || 'Allow camera access to continue.'}</p>
                          <Button type="button" size="sm" onClick={() => void startCamera()} className="mt-3">
                            Start camera
                          </Button>
                        </div>
                      )}

                      {cameraActive && (
                        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2 rounded-lg bg-slate-950/85 px-3 py-2 text-sm" role="status">
                          <span className="flex min-w-0 items-center gap-2 text-white">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${faceCentered ? 'bg-emerald-400' : 'bg-amber-400'}`} aria-hidden="true" />
                            <span className="truncate">{faceStatusMessage}</span>
                          </span>
                          <span className={`shrink-0 font-medium ${faceCentered ? 'text-emerald-300' : 'text-amber-300'}`}>{faceCentered ? 'Ready' : 'Aligning'}</span>
                        </div>
                      )}
                    </div>

                    {cameraActive && (
                      <div className="flex justify-center">
                        <Button type="button" onClick={() => void handleCaptureFromCamera()} leftIcon={<Camera className="h-4 w-4" />} disabled={!faceDetected}>
                          Capture face
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {!enrolledFacePhoto && enrollmentMode === 'UPLOAD' && (
                  <div className="mx-auto max-w-md rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
                    <Upload className="mx-auto mb-3 h-8 w-8 text-slate-500" aria-hidden="true" />
                    <p className="text-sm font-medium text-slate-900">Upload a front-facing photo</p>
                    <p className="mb-4 mt-0.5 text-sm text-slate-600">JPG, PNG or WebP, with the face clearly visible.</p>
                    <label
                      className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-within:ring-2 focus-within:ring-brand-400/60 ${
                        isAnalyzingFace ? 'pointer-events-none opacity-60' : ''
                      }`}
                    >
                      {isAnalyzingFace ? 'Checking photo...' : 'Choose photo'}
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={isAnalyzingFace} className="sr-only" />
                    </label>
                  </div>
                )}

                {enrolledFacePhoto && (
                  <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <img src={enrolledFacePhoto} alt="Registered face" className="h-16 w-16 shrink-0 rounded-lg border border-emerald-200 object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {watchAdd('firstName') || 'Employee'} {watchAdd('lastName') || ''}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-emerald-800">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Face registered
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleRetakeFace} leftIcon={<RotateCcw className="h-4 w-4" />}>
                      Retake
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" onClick={() => goToStep((currentStep - 1) as 1 | 2 | 3 | 4)}>
                  Previous
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => navigate('/admin/employees')}>
                  Cancel
                </Button>
              )}

              {currentStep < 4 ? (
                <Button type="submit">Next: {STEPS[Math.min(currentStep, 3)].title.toLowerCase()}</Button>
              ) : (
                <Button type="submit" isLoading={isSubmittingAdd} disabled={!enrolledFacePhoto}>
                  Add employee
                </Button>
              )}
            </div>
          </form>
        </div>

        <Modal
          isOpen={confirmExitOpen || blocker.state === 'blocked'}
          onClose={stayInWizard}
          title="Leave this new employee?"
          size="sm"
          footer={
            <>
              <Button variant="ghost" className="mr-auto hover:bg-rose-50 hover:text-rose-700" onClick={() => exitWizard(false)}>
                Discard
              </Button>
              <Button variant="outline" onClick={() => exitWizard(true)}>
                Save draft and leave
              </Button>
              <Button onClick={stayInWizard}>Keep editing</Button>
            </>
          }
        >
          <p>
            You can save what you have typed and finish later from the Employees page, or discard it. The draft stays until you close this browser tab.
          </p>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        description={
          unassigned > 0 ? (
            <>
              Everyone working across Maaya World centers. <span className="text-amber-800">{unassigned} without a reporting manager.</span>
            </>
          ) : (
            'Everyone working across Maaya World centers.'
          )
        }
        actions={
          <Button onClick={() => (draftSummary ? continueDraft() : startNewEmployee())} leftIcon={<UserPlus className="h-4 w-4" />}>
            Add employee
          </Button>
        }
      />

      {draftSummary && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            You have an unfinished new employee{draftSummary.name ? `: ${draftSummary.name}` : ''}, saved at step {draftSummary.maxStep} of 4.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={discardDraft} className="hover:bg-amber-100">
              Discard
            </Button>
            <Button size="sm" onClick={continueDraft}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {loadError ? (
        <EmptyState
          tone="danger"
          icon={AlertCircle}
          title="Unable to load employees"
          description={loadError}
          actionLabel="Try again"
          onAction={() => void loadEmployees()}
        />
      ) : (
        <DataTable
          key={[selectedLocationFilter, selectedShiftFilter, initialSearch].join(':')}
          columns={columns}
          data={filteredEmployees}
          isLoading={isLoading}
          initialSearch={initialSearch}
          searchPlaceholder="Search by name, employee ID or center"
          filterComponent={filterToolbar}
          pageSize={15}
          onRowClick={(row) => {
            setSelectedEmployee(row);
            setIsViewModalOpen(true);
          }}
          emptyTitle={employees.length === 0 ? 'No employees yet' : 'No employees match'}
          emptyDescription={employees.length === 0 ? 'Add the first employee to get started.' : 'Try a different search, center or shift.'}
        />
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingEmployee(null);
          }}
          title={`Edit ${editingEmployee.fullName}`}
          subtitle={editingEmployee.employeeCode}
          size="lg"
        >
          <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-5" noValidate>
            {/* Basic Info */}
            <div>
              <h3 className="mb-3 text-base font-semibold text-slate-900">Personal details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First name"
                  error={errorsEdit.firstName?.message}
                  {...registerEdit('firstName')}
                />
                <Input
                  label="Last name"
                  error={errorsEdit.lastName?.message}
                  {...registerEdit('lastName')}
                />
                <Input
                  label="Email (used to sign in)"
                  type="email"
                  error={errorsEdit.email?.message}
                  {...registerEdit('email')}
                />
                <Input
                  label="Mobile number"
                  error={errorsEdit.phone?.message}
                  {...registerEdit('phone')}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Address"
                    placeholder="e.g. Flat 301, Sri Sai Enclave, Madhapur, Hyderabad - 500081"
                    error={errorsEdit.address?.message}
                    {...registerEdit('address')}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Face for check-in</h3>
              <div className="flex flex-wrap items-center gap-4">
                {editFacePhoto ? (
                  <img src={editFacePhoto} alt={`Saved face of ${editingEmployee.fullName}`} className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-600">No photo</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">
                    {editFacePhoto || editingEmployee.hasFacePhoto ? 'Replace it if check-in keeps failing or their look has changed.' : 'No face is saved, so they cannot check in yet.'}
                  </p>
                  <label className={`mt-2 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-400/60 ${editFaceBusy ? 'pointer-events-none opacity-60' : ''}`}>
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {editFaceBusy ? 'Checking the photo…' : editFacePhoto || editingEmployee.hasFacePhoto ? 'Upload a new photo' : 'Upload a photo'}
                    <input type="file" accept="image/*" className="sr-only" onChange={replaceFace} disabled={editFaceBusy} />
                  </label>
                </div>
              </div>
            </div>

            {/* Placement Details */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Work and pay</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Select
                  label="Center"
                  options={[{ value: '', label: 'Select center' }, ...centerSelectOptions]}
                  error={errorsEdit.location?.message}
                  {...registerEdit('location')}
                />
                <Select
                  label="Shift"
                  options={[
                    { value: 'MORNING', label: getShiftLabel('MORNING') },
                    { value: 'EVENING', label: getShiftLabel('EVENING') },
                  ]}
                  error={errorsEdit.shift?.message}
                  {...registerEdit('shift')}
                />
                <Select id="edit-reporting-manager" label="Reports to" options={[{ value: '', label: 'Not assigned' }, ...managers.filter(manager => manager.id !== editingEmployee.id).map(manager => ({ value: manager.id, label: manager.name }))]} error={errorsEdit.managerId?.message} helperText="This Manager reviews leave requests." {...registerEdit('managerId')} />
                <Input
                  label="Joining date"
                  type="date"
                  error={errorsEdit.joiningDate?.message}
                  {...registerEdit('joiningDate')}
                />
                <Input
                  label="PF number (UAN)"
                  placeholder="12-digit number"
                  helperText={summarizeSalary(editSalary).hasPf ? 'Needed because PF is deducted.' : 'Only needed when PF is deducted.'}
                  error={errorsEdit.uanNumber?.message}
                  {...registerEdit('uanNumber')}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Pay</h3>
              <SalarySetup
                idPrefix="edit"
                value={editSalary}
                onChange={(next) => {
                  setEditSalary(next);
                  if (editSalaryError) setEditSalaryError(salaryProblem(next));
                }}
                error={editSalaryError}
              />
            </div>

            {/* Banking Details */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Bank and tax</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Bank name"
                    error={errorsEdit.bankName?.message}
                    {...registerEdit('bankName')}
                  />
                </div>
                <Input
                  label="Account number"
                  error={errorsEdit.accountNumber?.message}
                  {...registerEdit('accountNumber')}
                />
                <Input
                  label="Re-enter account number"
                  error={errorsEdit.confirmAccountNumber?.message}
                  {...registerEdit('confirmAccountNumber')}
                />
                <Input
                  label="IFSC code"
                  error={errorsEdit.ifscCode?.message}
                  {...registerEdit('ifscCode')}
                />
                <Input
                  label="PAN"
                  error={errorsEdit.panNumber?.message}
                  {...registerEdit('panNumber')}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-slate-200 pt-5 flex items-center justify-end gap-2.5">
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
                Save changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {selectedEmployee && isViewModalOpen && <EmployeeDetailsPanel key={selectedEmployee.id} employee={selectedEmployee} isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} onEdit={() => handleOpenEdit(selectedEmployee)} />}

      <Modal
        isOpen={Boolean(onboardSuccessData)}
        onClose={() => setOnboardSuccessData(null)}
        title="Employee added"
        subtitle={onboardSuccessData ? `${onboardSuccessData.employee.fullName} · ${onboardSuccessData.employee.employeeCode}` : undefined}
        size="md"
        footer={<Button onClick={() => setOnboardSuccessData(null)}>Done</Button>}
      >
        {onboardSuccessData && (
          <div className="space-y-4">
            {onboardSuccessData.employee.enrolledFacePhoto && (
              <div className="flex items-center gap-3">
                <img src={onboardSuccessData.employee.enrolledFacePhoto} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover" />
                <p className="text-sm text-emerald-800">Face ID registered for attendance.</p>
              </div>
            )}
            <dl className="ops-definition">
              <dt>Employee ID</dt>
              <dd className="tabular-nums">{onboardSuccessData.employee.employeeCode}</dd>
              <dt>Sign-in email</dt>
              <dd>{onboardSuccessData.email}</dd>
              <dt>Center</dt>
              <dd>{onboardSuccessData.employee.location}</dd>
              <dt>Temporary password</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <code className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-sm">{onboardSuccessData.tempPassword}</code>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(
                        `Maaya World HRMS sign-in\nEmail: ${onboardSuccessData.email}\nEmployee ID: ${onboardSuccessData.employee.employeeCode}\nTemporary password: ${onboardSuccessData.tempPassword}\nSign in at: ${window.location.origin}/login`
                      )
                      .then(() => {
                        setCopiedCredentials(true);
                        setTimeout(() => setCopiedCredentials(false), 2000);
                      })
                      .catch(() => dispatch(addToast({ type: 'error', title: 'Could not copy', message: 'Select the password and copy it manually.' })));
                  }}
                >
                  {copiedCredentials ? 'Copied' : 'Copy sign-in details'}
                </Button>
              </dd>
            </dl>
            <p className="ops-muted">The sign-in details were also emailed. The employee must choose a new password the first time they sign in.</p>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(deletingEmployee)}
        onClose={() => setDeletingEmployee(null)}
        title={deletingEmployee ? `Deactivate ${deletingEmployee.fullName}?` : 'Deactivate employee'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingEmployee(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting}>
              Deactivate
            </Button>
          </>
        }
      >
        <p>They will no longer be able to sign in or check in. Attendance, leave and payslip history is kept.</p>
      </Modal>
    </div>
  );
};
