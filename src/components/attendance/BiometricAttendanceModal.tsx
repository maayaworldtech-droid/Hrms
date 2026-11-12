import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '@/services/api';
import { useAppDispatch } from '@/store';
import { updateUser } from '@/store/slices/authSlice';
import { addToast } from '@/store/slices/uiSlice';
import { AttendanceRecord, ShiftType } from '@/types';
import { businessDate } from '@/utils/operations';
import { checkVenueGeofence, centerToVenue, GeofenceCheckResult } from '@/utils/geolocation';
import { useCenters, findCenter, refreshCenters } from '@/hooks/useCenters';
import {
  analyzeVideoFrame,
  drawBiometricHud,
  resetBiometricTracker,
  captureFaceSnapshot,
  generateBiometricSignature,
  extractFaceDescriptorFromCanvas,
  extractDescriptorFromImage,
  compareFaceBiometrics,
  BiometricScanStage,
  BiometricAnalysisResult,
  RealFaceBiometricData,
  FaceBiometricDescriptor,
  VerificationComparisonResult,
} from '@/utils/faceBiometrics';
import {
  Camera,
  MapPin,
  CheckCircle2,
  RefreshCw,
  X,
  ShieldAlert,
  Check,
  RotateCcw,
} from 'lucide-react';

interface BiometricAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'LOGIN' | 'LOGOUT';
  employee: {
    id: string;
    fullName: string;
    employeeCode: string;
    location?: string;
    shift?: ShiftType;
    enrolledFacePhoto?: string;
    enrolledFaceBiometrics?: string;
  };
  onSuccess: (record: AttendanceRecord) => void;
}

export const BiometricAttendanceModal: React.FC<BiometricAttendanceModalProps> = ({
  isOpen,
  onClose,
  mode,
  employee,
  onSuccess,
}) => {
  const dispatch = useAppDispatch();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const prevImageDataRef = useRef<ImageData | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStage, setScanStage] = useState<BiometricScanStage>('INITIALIZING');
  const [scanMessage, setScanMessage] = useState('Starting camera');
  const [matchScore, setMatchScore] = useState<number>(0);
  const [isFaceCentered, setIsFaceCentered] = useState(false);

  const [enrolledPhoto, setEnrolledPhoto] = useState<string | null>(
    employee.enrolledFacePhoto || localStorage.getItem(`maaya_face_photo_${employee.id}`) || null
  );
  const [enrolledDescriptor, setEnrolledDescriptor] = useState<FaceBiometricDescriptor | null>(null);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(
    !!(employee.enrolledFacePhoto || localStorage.getItem(`maaya_face_photo_${employee.id}`))
  );
  const [isEnrollingMode, setIsEnrollingMode] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<VerificationComparisonResult | null>(null);

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedBiometrics, setCapturedBiometrics] = useState<RealFaceBiometricData | null>(null);

  const enrolledPhotoRef = useRef<string | null>(enrolledPhoto);
  const enrolledDescriptorRef = useRef<FaceBiometricDescriptor | null>(enrolledDescriptor);
  const isEnrollingModeRef = useRef<boolean>(isEnrollingMode);
  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    enrolledPhotoRef.current = enrolledPhoto;
    enrolledDescriptorRef.current = enrolledDescriptor;
    isEnrollingModeRef.current = isEnrollingMode;
  }, [enrolledPhoto, enrolledDescriptor, isEnrollingMode]);

  // The geofence comes from the employee's own center. There is deliberately no fallback to another
  // center: checking Vizag staff against Hyderabad's coordinates would block every check-in.
  const { centers, isLoading: centersLoading, error: centersError } = useCenters();
  // The stored session can hold an outdated center after a transfer or a rename, so read the
  // employee's current center from the server each time the dialog opens.
  const [liveLocation, setLiveLocation] = useState<string | undefined>(employee.location);
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.employees
      .getById(employee.id)
      .then((fresh) => {
        if (cancelled || !fresh?.location) return;
        setLiveLocation(fresh.location);
        if (fresh.location !== employee.location) {
          dispatch(updateUser({ location: fresh.location }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isOpen, employee.id, employee.location, dispatch]);
  const center = useMemo(() => findCenter(centers, liveLocation), [centers, liveLocation]);
  const venue = useMemo(() => centerToVenue(center), [center]);
  const centerLabel = center?.name || liveLocation || 'No center assigned';

  const [geofencingEnabled, setGeofencingEnabled] = useState<boolean>(true);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geofenceResult, setGeofenceResult] = useState<GeofenceCheckResult | null>(null);
  const [gpsStatusText, setGpsStatusText] = useState<string>('Checking device GPS...');
  const [gpsChecked, setGpsChecked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Parse saved biometric descriptor JSON (synchronous, avoids mirrored-photo extraction bugs)
    const tryParseDescriptor = (json: string | null | undefined): FaceBiometricDescriptor | null => {
      if (!json) return null;
      try {
        const desc = JSON.parse(json) as FaceBiometricDescriptor;
        if (desc && typeof desc.eyeDistanceRatio === 'number' && Array.isArray(desc.spatialIntensityVector)) {
          return desc;
        }
      } catch { /* invalid JSON */ }
      return null;
    };

    const photo = employee.enrolledFacePhoto || localStorage.getItem(`maaya_face_photo_${employee.id}`);
    const bioJson = employee.enrolledFaceBiometrics || localStorage.getItem(`maaya_face_bio_${employee.id}`);

    if (photo) {
      setEnrolledPhoto(photo);
      setIsEnrolled(true);
      // Prefer saved descriptor JSON — it was computed from un-mirrored video
      // during enrollment, so it matches the live un-mirrored processing canvas
      const savedDesc = tryParseDescriptor(bioJson);
      if (savedDesc) {
        setEnrolledDescriptor(savedDesc);
      } else {
        // Fallback: re-extract from photo (may be mirrored, less accurate)
        void extractDescriptorFromImage(photo).then((desc) => {
          if (desc) setEnrolledDescriptor(desc);
        });
      }
    } else {
      api.employees.getById(employee.id).then((emp) => {
        if (emp?.enrolledFacePhoto) {
          setEnrolledPhoto(emp.enrolledFacePhoto);
          setIsEnrolled(true);
          const empBioJson = (emp as any).enrolledFaceBiometrics || localStorage.getItem(`maaya_face_bio_${emp.id || employee.id}`);
          const savedDesc = tryParseDescriptor(empBioJson);
          if (savedDesc) {
            setEnrolledDescriptor(savedDesc);
          } else {
            void extractDescriptorFromImage(emp.enrolledFacePhoto).then((desc) => {
              if (desc) setEnrolledDescriptor(desc);
            });
          }
        }
      });
    }
  }, [employee.id, employee.enrolledFacePhoto, employee.enrolledFaceBiometrics]);

  const handleCheckDeviceGps = useCallback(() => {
    if (centersLoading) {
      setGpsStatusText('Loading center details...');
      return;
    }
    if (centersError) {
      setGpsChecked(false);
      setGpsStatusText("Couldn't load your center details. Tap Refresh GPS to try again.");
      return;
    }
    if (!venue) {
      setCurrentCoords(null);
      setGeofenceResult(null);
      setGpsChecked(false);
      setGpsStatusText(
        center
          ? 'Check-in location for your center is not set up yet. Please contact your admin.'
          : 'You are not assigned to a center. Please contact your admin.'
      );
      return;
    }
    setGpsStatusText('Checking device GPS...');
    if (!navigator.geolocation) {
      setCurrentCoords(null);
      setGpsChecked(false);
      setGpsStatusText('Geolocation unsupported in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentCoords(coords);
        const check = checkVenueGeofence(coords.lat, coords.lng, venue);
        setGeofenceResult(check);
        setGpsChecked(true);
        setGpsStatusText(
          check.isWithinRadius
            ? `Location verified (${check.distanceMeters}m from center)`
            : `${check.distanceMeters}m away (allowed: ${check.allowedRadiusMeters}m)`
        );
      },
      (err) => {
        setCurrentCoords(null);
        setGpsChecked(false);
        setGpsStatusText(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Allow GPS to check in.'
            : 'Unable to acquire GPS signal. Tap Refresh GPS.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [venue, center, centersLoading, centersError]);

  useEffect(() => {
    if (!isOpen) return;
    api.settings
      .get()
      .then((s) => {
        setGeofencingEnabled(s?.enableGeoFencingAttendance ?? true);
      })
      .catch(() => {
        setGeofencingEnabled(true);
      });
    if (mode === 'LOGIN') {
      handleCheckDeviceGps();
    }
  }, [isOpen, mode, handleCheckDeviceGps]);

  const stopCamera = useCallback(() => {
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startAnalysisLoop = useCallback(() => {
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    let progress = 0;
    let stage: BiometricScanStage = isEnrollingModeRef.current ? 'ENROLLING' : 'DETECTING_FACE';
    let consecutiveCenteredFrames = 0;

    setScanStage(stage);
    setScanMessage(isEnrollingModeRef.current ? 'Position face to register' : 'Position face inside frame');

    const processFrame = () => {
      const video = videoRef.current;
      const hudCanvas = hudCanvasRef.current;
      const procCanvas = processingCanvasRef.current;

      if (!video || !hudCanvas || !procCanvas) {
        animationFrameId.current = requestAnimationFrame(processFrame);
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
      let currentResult: BiometricAnalysisResult | null = null;

      if (analysis) {
        currentResult = analysis.result;
        prevImageDataRef.current = analysis.currentImageData;

        if (stage === 'DETECTING_FACE' || stage === 'ENROLLING') {
          if (currentResult.faceDetected && currentResult.isCentered) {
            setIsFaceCentered(true);
            consecutiveCenteredFrames++;
            if (consecutiveCenteredFrames >= 3) {
              stage = 'LIVENESS_CHALLENGE';
              setScanStage('LIVENESS_CHALLENGE');
              setScanMessage('Blink or nod slightly to verify');
            } else {
              setScanMessage('Hold steady');
            }
          } else if (currentResult.faceDetected && !currentResult.isCentered) {
            setIsFaceCentered(false);
            consecutiveCenteredFrames = 0;
            setScanMessage('Center face inside oval');
          } else {
            setIsFaceCentered(false);
            consecutiveCenteredFrames = 0;
            setScanMessage('Position face inside frame');
          }
        } else if (stage === 'LIVENESS_CHALLENGE') {
          setIsFaceCentered(true);
          if (currentResult.blinkDetected || currentResult.headMotionDetected || (progress > 80 && currentResult.faceDetected)) {
            stage = 'AUTHENTICATING';
            setScanStage('AUTHENTICATING');
            setScanMessage('Verifying identity');

            const snapshot = captureFaceSnapshot(video);
            setCapturedPhoto(snapshot);

            const liveDesc =
              currentResult.descriptor ||
              (currentResult.box && currentResult.landmarks
                ? extractFaceDescriptorFromCanvas(procCanvas, currentResult.box, currentResult.landmarks)
                : null);

            let sig = `BIO-${employee.employeeCode}-REAL`;
            if (currentResult.box && currentResult.landmarks) {
              sig = generateBiometricSignature(
                currentResult.box,
                currentResult.landmarks,
                employee.employeeCode
              );
            }

            if (isEnrollingModeRef.current) {
              if (snapshot && liveDesc) {
                const descJson = JSON.stringify(liveDesc);
                void api.employees.enrollFace(employee.id, snapshot, descJson);
                enrolledPhotoRef.current = snapshot;
                enrolledDescriptorRef.current = liveDesc;
                isEnrollingModeRef.current = false;
                setEnrolledPhoto(snapshot);
                setEnrolledDescriptor(liveDesc);
                setIsEnrolled(true);
                setIsEnrollingMode(false);
                dispatch(updateUser({ enrolledFacePhoto: snapshot, enrolledFaceBiometrics: descJson }));
              }

              const enrollComp: VerificationComparisonResult = {
                isMatch: true,
                similarity: 99.4,
                geometricSimilarity: 99.5,
                appearanceSimilarity: 99.2,
                threshold: 72,
                status: 'VERIFIED',
                reason: 'Face profile registered',
              };

              setVerificationResult(enrollComp);
              setMatchScore(99.4);
              setCapturedBiometrics({
                timestamp: new Date().toISOString(),
                faceBox: currentResult.box || { x: 40, y: 20, width: 160, height: 140 },
                landmarks: currentResult.landmarks || ({} as any),
                eyeDistance: currentResult.eyeDistance || 64,
                aspectRatio: currentResult.faceAspectRatio || 1.35,
                symmetryScore: currentResult.symmetryScore || 95,
                confidenceScore: 99.4,
                livenessPassed: true,
                biometricSignature: sig,
                photoDataUrl: snapshot || '',
                descriptor: liveDesc || undefined,
                verification: enrollComp,
              });

              transitionTimeoutRef.current = window.setTimeout(() => {
                stage = 'SUCCESS';
                setScanStage('SUCCESS');
                setScanMessage('Face registered and verified');
              }, 350);
            } else if (!enrolledPhotoRef.current) {
              const unregComp: VerificationComparisonResult = {
                isMatch: false,
                similarity: 0,
                geometricSimilarity: 0,
                appearanceSimilarity: 0,
                threshold: 72,
                status: 'MISMATCH',
                reason: 'No registered face profile found. Tap Register Face first.',
              };
              setVerificationResult(unregComp);
              setMatchScore(0);
              transitionTimeoutRef.current = window.setTimeout(() => {
                stage = 'FAILED_VERIFICATION';
                setScanStage('FAILED_VERIFICATION');
                setScanMessage('No face registered');
              }, 350);
            } else {
              let comp: VerificationComparisonResult;
              if (liveDesc && enrolledDescriptorRef.current) {
                comp = compareFaceBiometrics(liveDesc, enrolledDescriptorRef.current, 72);
              } else {
                comp = {
                  isMatch: false,
                  similarity: 0,
                  geometricSimilarity: 0,
                  appearanceSimilarity: 0,
                  threshold: 72,
                  status: 'MISMATCH',
                  reason: 'Could not read reference face geometry.',
                };
              }

              setVerificationResult(comp);
              setMatchScore(comp.similarity);
              setCapturedBiometrics({
                timestamp: new Date().toISOString(),
                faceBox: currentResult.box || { x: 40, y: 20, width: 160, height: 140 },
                landmarks: currentResult.landmarks || ({} as any),
                eyeDistance: currentResult.eyeDistance || 64,
                aspectRatio: currentResult.faceAspectRatio || 1.35,
                symmetryScore: currentResult.symmetryScore || 92,
                confidenceScore: comp.similarity,
                livenessPassed: true,
                biometricSignature: sig,
                photoDataUrl: snapshot || '',
                descriptor: liveDesc || undefined,
                verification: comp,
              });

              transitionTimeoutRef.current = window.setTimeout(() => {
                if (comp.isMatch) {
                  stage = 'SUCCESS';
                  setScanStage('SUCCESS');
                  setScanMessage(`Verified (${comp.similarity.toFixed(1)}%)`);
                } else {
                  stage = 'FAILED_VERIFICATION';
                  setScanStage('FAILED_VERIFICATION');
                  setScanMessage(`Face mismatch (${comp.similarity.toFixed(1)}%)`);
                }
              }, 350);
            }
          }
        }
      }

      drawBiometricHud(hudCanvas, currentResult, stage, progress);

      if (stage !== 'SUCCESS' && stage !== 'FAILED_VERIFICATION') {
        animationFrameId.current = requestAnimationFrame(processFrame);
      }
    };

    animationFrameId.current = requestAnimationFrame(processFrame);
  }, [employee.employeeCode, employee.id, dispatch]);

  const startCamera = useCallback(async () => {
    resetBiometricTracker();
    setCameraError(null);
    setCapturedPhoto(null);
    setCapturedBiometrics(null);
    setVerificationResult(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        streamRef.current = stream;
        setCameraActive(true);

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;

          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                startAnalysisLoop();
              })
              .catch(() => {
                video.onloadedmetadata = () => {
                  video.play().catch(() => {});
                  startAnalysisLoop();
                };
              });
          } else {
            startAnalysisLoop();
          }
        }
      } else {
        throw new Error('Camera access unavailable');
      }
    } catch (err: any) {
      setCameraActive(false);
      setCameraError(err?.message || 'Camera permission denied.');
    }
  }, [startAnalysisLoop]);

  const handleQuickVerify = () => {
    const video = videoRef.current;
    const procCanvas = processingCanvasRef.current;
    const photo = video ? captureFaceSnapshot(video) : null;
    setCapturedPhoto(photo);

    // Stop the analysis loop so it doesn't override results
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    if (!enrolledPhotoRef.current && !isEnrollingModeRef.current) {
      setVerificationResult({
        isMatch: false,
        similarity: 0,
        geometricSimilarity: 0,
        appearanceSimilarity: 0,
        threshold: 72,
        status: 'MISMATCH',
        reason: 'Please register your face profile first.',
      });
      setMatchScore(0);
      setScanStage('FAILED_VERIFICATION');
      setScanMessage('No face registered');
      return;
    }

    // Extract live descriptor from the current processing canvas
    let liveDesc: FaceBiometricDescriptor | null = null;
    if (video && procCanvas) {
      const analysis = analyzeVideoFrame(video, procCanvas, null);
      if (analysis?.result?.descriptor) {
        liveDesc = analysis.result.descriptor;
      } else if (analysis?.result?.box && analysis.result.landmarks) {
        liveDesc = extractFaceDescriptorFromCanvas(procCanvas, analysis.result.box, analysis.result.landmarks);
      }
    }

    if (isEnrollingModeRef.current && photo) {
      if (liveDesc) {
        const descJson = JSON.stringify(liveDesc);
        void api.employees.enrollFace(employee.id, photo, descJson);
        enrolledDescriptorRef.current = liveDesc;
        setEnrolledDescriptor(liveDesc);
        dispatch(updateUser({ enrolledFacePhoto: photo, enrolledFaceBiometrics: descJson }));
      }
      enrolledPhotoRef.current = photo;
      isEnrollingModeRef.current = false;
      setEnrolledPhoto(photo);
      setIsEnrolled(true);
      setIsEnrollingMode(false);

      setVerificationResult({
        isMatch: true,
        similarity: 99.4,
        geometricSimilarity: 99.5,
        appearanceSimilarity: 99.2,
        threshold: 72,
        status: 'VERIFIED',
        reason: 'Face profile registered',
      });
      setMatchScore(99.4);
      setScanStage('SUCCESS');
      setScanMessage('Face registered');
      return;
    }

    // Real face comparison against enrolled descriptor
    const refDescriptor = enrolledDescriptorRef.current;
    if (liveDesc && refDescriptor) {
      const comp = compareFaceBiometrics(liveDesc, refDescriptor, 72);
      setVerificationResult(comp);
      setMatchScore(comp.similarity);
      setCapturedBiometrics({
        timestamp: new Date().toISOString(),
        faceBox: { x: 40, y: 20, width: 160, height: 140 },
        landmarks: {} as any,
        eyeDistance: 64,
        aspectRatio: 1.35,
        symmetryScore: 92,
        confidenceScore: comp.similarity,
        livenessPassed: true,
        biometricSignature: `BIO-${employee.employeeCode}-REAL`,
        photoDataUrl: photo || '',
        descriptor: liveDesc,
        verification: comp,
      });
      if (comp.isMatch) {
        setScanStage('SUCCESS');
        setScanMessage(`Verified (${comp.similarity.toFixed(1)}%)`);
      } else {
        setScanStage('FAILED_VERIFICATION');
        setScanMessage(`Face mismatch (${comp.similarity.toFixed(1)}%)`);
      }
    } else {
      setVerificationResult({
        isMatch: false,
        similarity: 0,
        geometricSimilarity: 0,
        appearanceSimilarity: 0,
        threshold: 72,
        status: 'MISMATCH',
        reason: liveDesc ? 'No registered face profile found.' : 'Could not detect face. Position face in frame.',
      });
      setMatchScore(0);
      setScanStage('FAILED_VERIFICATION');
      setScanMessage(liveDesc ? 'No face registered' : 'No face detected');
    }
  };

  const handleRetake = () => {
    resetBiometricTracker();
    prevImageDataRef.current = null;
    setCapturedPhoto(null);
    setCapturedBiometrics(null);
    setVerificationResult(null);
    setScanStage('DETECTING_FACE');
    setMatchScore(0);
    setIsFaceCentered(false);
    startAnalysisLoop();
  };

  const handleStartEnrollment = () => {
    resetBiometricTracker();
    prevImageDataRef.current = null;
    isEnrollingModeRef.current = true;
    setIsEnrollingMode(true);
    setCapturedPhoto(null);
    setCapturedBiometrics(null);
    setVerificationResult(null);
    setScanStage('ENROLLING');
    setMatchScore(0);
    setIsFaceCentered(false);
    startAnalysisLoop();
  };

  useEffect(() => {
    if (isOpen) {
      setScanStage('INITIALIZING');
      setMatchScore(0);
      setCapturedPhoto(null);
      setCapturedBiometrics(null);
      setVerificationResult(null);
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const isFaceVerified = scanStage === 'SUCCESS' && !!verificationResult?.isMatch && isEnrolled;
  const isLocationAuthorized =
    mode === 'LOGOUT' || !geofencingEnabled ? true : gpsChecked && !!geofenceResult?.isWithinRadius;
  const canSubmit = isFaceVerified && isLocationAuthorized && !isSubmitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    const now = new Date();
    const timeFormatted = now.toTimeString().split(' ')[0];
    const effectiveScore = matchScore;

    const auditPayload = {
      employeeId: employee.id,
      date: businessDate(),
      location: centerLabel,
      shift: employee.shift || 'MORNING',
      latitude: currentCoords?.lat,
      longitude: currentCoords?.lng,
      distanceMeters: currentCoords && geofenceResult ? geofenceResult.distanceMeters : undefined,
      biometricScore: effectiveScore,
      isLocationVerified: isLocationAuthorized,
      isBiometricVerified: isFaceVerified,
      time: timeFormatted,
      facePhoto: capturedPhoto || undefined,
      faceBiometrics: capturedBiometrics ? JSON.stringify(capturedBiometrics) : undefined,
      notes: `Face Biometric (${effectiveScore.toFixed(1)}% match) — ${centerLabel}`,
    };

    try {
      if (mode === 'LOGIN') {
        const record = await api.attendance.checkIn(auditPayload);
        dispatch(
          addToast({
            type: 'success',
            title: 'Checked In',
            message: `Punch recorded at ${record.checkIn || timeFormatted}.`,
          })
        );
        onSuccess(record);
      } else {
        const record = await api.attendance.checkOut(auditPayload);
        dispatch(
          addToast({
            type: 'success',
            title: 'Checked Out',
            message: `Shift completed at ${record.checkOut || timeFormatted}.`,
          })
        );
        onSuccess(record);
      }
      onClose();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: mode === 'LOGIN' ? 'Check-In Failed' : 'Check-Out Failed',
          message: err?.message || 'Unable to save punch record.',
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 overflow-y-auto">
      <div className="relative w-full max-w-md max-h-[92vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-lg text-slate-900 overflow-hidden my-auto">
        {/* Clean Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {mode === 'LOGIN' ? 'Face Check-In' : 'Face Check-Out'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {employee.fullName} · {employee.employeeCode}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleStartEnrollment}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-brand-600 transition-colors cursor-pointer"
            >
              {isEnrolled ? 'Update Face' : 'Register Face'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto">
          {!isEnrolled && !isEnrollingMode && (
            <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900">
              <span>No face registered yet. Tap Register Face to capture.</span>
            </div>
          )}

          {/* Viewfinder Viewport */}
          <div
            className={`relative rounded-xl overflow-hidden bg-slate-950 border aspect-[4/3] flex items-center justify-center ${
              cameraActive
                ? scanStage === 'SUCCESS' || isFaceCentered
                  ? 'border-emerald-500'
                  : 'border-slate-300'
                : 'border-slate-800'
            }`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={processingCanvasRef} className="hidden" />
            <canvas
              ref={hudCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {!cameraActive && (
              <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-900">
                <Camera className="w-8 h-8 text-slate-500 mb-2" />
                <span className="text-xs font-semibold text-slate-200">Camera offline</span>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {cameraError || 'Allow camera permission to continue.'}
                </p>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="mt-3 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Retry camera
                </button>
              </div>
            )}

            {/* Clean Bottom Status Bar */}
            {cameraActive && (
              <div className="absolute bottom-2.5 inset-x-2.5 bg-slate-950/85 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      scanStage === 'SUCCESS' || isFaceCentered
                        ? 'bg-emerald-400'
                        : scanStage === 'FAILED_VERIFICATION'
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span className="truncate font-medium text-white text-xs">
                    {scanMessage}
                  </span>
                </div>

                {scanStage !== 'SUCCESS' && scanStage !== 'FAILED_VERIFICATION' && (
                  <button
                    type="button"
                    onClick={handleQuickVerify}
                    className="text-xs font-semibold text-brand-300 hover:text-white shrink-0 cursor-pointer"
                  >
                    Capture
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Concise Result Strip */}
          {scanStage === 'SUCCESS' && (
            <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {capturedPhoto && (
                  <img
                    src={capturedPhoto}
                    alt="Verified face"
                    className="w-9 h-9 rounded-lg object-cover border border-emerald-200 shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Identity Verified ({matchScore.toFixed(1)}%)</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRetake}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-100/50 text-emerald-800 text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            </div>
          )}

          {scanStage === 'FAILED_VERIFICATION' && (
            <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <p className="text-xs font-medium text-rose-900 truncate">
                  {verificationResult?.reason || 'Verification failed'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetake}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Clean Single-Line Location Strip (Login only) */}
          {mode === 'LOGIN' && (
            <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin
                  className={`w-4 h-4 shrink-0 ${
                    !geofencingEnabled || (gpsChecked && !!geofenceResult?.isWithinRadius)
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                />
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 block truncate">
                    {centerLabel}
                  </span>
                  <span className="text-xs text-slate-500">
                    {!geofencingEnabled
                      ? 'Geofence check disabled by company policy'
                      : gpsStatusText}
                  </span>
                </div>
              </div>

              {geofencingEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    // A failed centers request is retried here; the geofence check re-runs once it loads
                    if (centersError) void refreshCenters();
                    else handleCheckDeviceGps();
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh GPS</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Clean Action Footer */}
        <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-200 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className={`flex-1 h-10 px-4 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              canSubmit
                ? 'bg-brand-600 hover:bg-brand-700 text-white'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{mode === 'LOGIN' ? 'Confirm Check-In' : 'Confirm Check-Out'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
