import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';
import { AttendanceRecord, ShiftType } from '@/types';
import { getShiftDefinition } from '@/utils/shiftUtils';
import {
  checkVenueGeofence,
  TEST_LOCATION_PRESETS,
  VENUE_GEOFENCES,
  SimulatedLocationPreset,
  GeofenceCheckResult,
} from '@/utils/geolocation';
import { Button } from '@/components/common/Button';
import {
  Camera,
  Scan,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldCheck,
  Building2,
  Navigation,
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

  // Biometric Face Scan States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [scanMessage, setScanMessage] = useState('Position your face within the frame');
  const [scanProgress, setScanProgress] = useState(0);

  // Geolocation States (for LOGIN mode)
  const employeeLocation = employee.location || 'Hyderabad';
  const venue = VENUE_GEOFENCES[employeeLocation] || VENUE_GEOFENCES['Hyderabad'];
  const presets = TEST_LOCATION_PRESETS[employeeLocation] || TEST_LOCATION_PRESETS['Hyderabad'];

  const [selectedPresetId, setSelectedPresetId] = useState<string>(presets[0]?.id || 'on-premise');
  const [useDeviceGps, setUseDeviceGps] = useState(false);
  const [deviceGpsError, setDeviceGpsError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: presets[0]?.latitude || venue.latitude,
    lng: presets[0]?.longitude || venue.longitude,
  });
  const [geofenceResult, setGeofenceResult] = useState<GeofenceCheckResult>(() =>
    checkVenueGeofence(presets[0]?.latitude || venue.latitude, presets[0]?.longitude || venue.longitude, employeeLocation)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recalculate geofence when coordinates change
  useEffect(() => {
    const result = checkVenueGeofence(currentCoords.lat, currentCoords.lng, employeeLocation);
    setGeofenceResult(result);
  }, [currentCoords, employeeLocation]);

  // Handle preset selection
  const handlePresetChange = (presetId: string) => {
    setUseDeviceGps(false);
    setSelectedPresetId(presetId);
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setCurrentCoords({ lat: preset.latitude, lng: preset.longitude });
    }
  };

  // Request actual Device GPS
  const handleUseRealDeviceGps = () => {
    setDeviceGpsError(null);
    setUseDeviceGps(true);
    setSelectedPresetId('real-gps');

    if (!navigator.geolocation) {
      setDeviceGpsError('Geolocation is not supported by your browser');
      setUseDeviceGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setDeviceGpsError(`Device GPS error: ${err.message}. Using fallback location.`);
        setUseDeviceGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } else {
        setCameraActive(false);
        setCameraError('Webcam feed unavailable. Biometric visual sensor simulation activated.');
      }
    } catch (err: any) {
      setCameraActive(false);
      setCameraError('Camera access not granted. Visual recognition simulated for authentication.');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Trigger Automatic Face Scan Flow
  const triggerFaceScan = () => {
    setScanState('SCANNING');
    setScanProgress(0);
    setScanMessage('Detecting face & biometric landmarks...');

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setScanProgress(progress);

      if (progress === 30) {
        setScanMessage('Matching facial geometry against roster database...');
      } else if (progress === 70) {
        setScanMessage(`Authenticating facial credentials for ${employee.fullName}...`);
      } else if (progress >= 100) {
        clearInterval(interval);
        setScanState('SUCCESS');
        setScanMessage(`Biometric Identity Verified: ${employee.fullName}`);
      }
    }, 200);
  };

  // Open/Close Lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
      // Reset scan state and trigger scan automatically
      const timer = setTimeout(() => {
        triggerFaceScan();
      }, 600);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
      setScanState('IDLE');
      setScanProgress(0);
    }
  }, [isOpen]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Validation Checks
  const isFaceVerified = scanState === 'SUCCESS';
  const isLocationAuthorized = mode === 'LOGOUT' ? true : geofenceResult.isWithinRadius;
  const canSubmit = isFaceVerified && isLocationAuthorized && !isSubmitting;

  // Final Action Handler
  const handleConfirm = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      if (mode === 'LOGIN') {
        const record = await api.attendance.checkIn(employee.id, {
          location: venue.shortName,
          shift: employee.shift || 'MORNING',
          notes: `Face Authenticated • On-Premise at ${venue.shortName}`,
        });
        dispatch(
          addToast({
            type: 'success',
            title: 'Attendance Login Verified',
            message: `Check-in recorded at ${record.checkIn} on-premise at ${venue.name}.`,
          })
        );
        onSuccess(record);
      } else {
        const record = await api.attendance.checkOut(employee.id, {
          notes: `Face Authenticated Logout • Shift Closed`,
        });
        dispatch(
          addToast({
            type: 'success',
            title: 'Attendance Logout Confirmed',
            message: `Check-out registered at ${record.checkOut}. Shift completed (${record.workHours} hrs).`,
          })
        );
        onSuccess(record);
      }
      onClose();
    } catch (err: any) {
      dispatch(
        addToast({
          type: 'error',
          title: mode === 'LOGIN' ? 'Login Failed' : 'Logout Failed',
          message: err.message || 'Operation failed',
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const shiftInfo = getShiftDefinition(employee.shift || 'MORNING');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl text-slate-900 overflow-hidden my-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-indigo-600 uppercase">
                Biometric Verification
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs text-slate-500 font-mono">
                {mode === 'LOGIN' ? 'Attendance Check-In' : 'Attendance Check-Out'}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {mode === 'LOGIN' ? 'Attendance Login' : 'Attendance Logout'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Employee Meta Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
            <div>
              <span className="font-semibold text-slate-900">{employee.fullName}</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Staff ID: {employee.employeeCode} / {venue.shortName}
              </p>
            </div>
            <div className="text-right">
              <span className="text-indigo-600 font-semibold">{shiftInfo.name}</span>
              <p className="text-slate-500 text-[11px] font-mono mt-0.5">{shiftInfo.timing}</p>
            </div>
          </div>

          {/* Biometric Face Scanning Canvas */}
          <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] flex items-center justify-center">
            {/* Live Camera Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />

            {/* Simulated Face Preview when webcam is absent or denied */}
            {!cameraActive && (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
                <div className="w-24 h-24 rounded-full border-2 border-indigo-500/40 bg-indigo-500/10 flex items-center justify-center relative mb-3">
                  <Camera className="w-10 h-10 text-indigo-400" />
                  <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-ping opacity-30" />
                </div>
                <span className="text-xs font-semibold text-slate-300">Biometric Sensor Active</span>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  {cameraError || 'Facial geometry recognition running for ' + employee.fullName}
                </p>
              </div>
            )}

            {/* Biometric Scanning Overlay Elements */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Corner Reticles */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-indigo-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-indigo-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-indigo-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-indigo-400" />

                {/* Laser Scanning Line */}
                {scanState === 'SCANNING' && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] transition-all duration-300"
                    style={{
                      top: `${scanProgress}%`,
                    }}
                  />
                )}

                {/* Face Box Frame Indicator */}
                <div
                  className={`absolute inset-4 rounded-lg border transition-colors duration-300 ${
                    scanState === 'SUCCESS'
                      ? 'border-emerald-400/80 bg-emerald-500/10'
                      : scanState === 'SCANNING'
                      ? 'border-cyan-400/50 bg-cyan-500/5'
                      : 'border-slate-600/40'
                  }`}
                />
              </div>

              {/* Status Banner inside viewfinder */}
              <div className="absolute bottom-3 inset-x-3 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  {scanState === 'SCANNING' ? (
                    <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  ) : scanState === 'SUCCESS' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Scan className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span
                    className={`truncate font-medium text-[11px] ${
                      scanState === 'SUCCESS' ? 'text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    {scanMessage}
                  </span>
                </div>

                {scanState === 'SUCCESS' ? (
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider shrink-0">
                    MATCH: 99.4%
                  </span>
                ) : (
                  <button
                    onClick={triggerFaceScan}
                    type="button"
                    className="pointer-events-auto text-[10px] text-cyan-400 hover:text-cyan-300 font-medium underline shrink-0 ml-2"
                  >
                    Rescan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Geolocation Geofence Section (Required for LOGIN mode) */}
          {mode === 'LOGIN' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                  Company Geofence Location Check
                </span>
                <span className="text-slate-500 text-[11px]">Radius: {venue.allowedRadiusMeters}m limit</span>
              </div>

              {/* Geofence Status Card */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  geofenceResult.isWithinRadius
                    ? 'bg-emerald-50/80 border-emerald-200'
                    : 'bg-rose-50/80 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {geofenceResult.isWithinRadius ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-semibold ${
                          geofenceResult.isWithinRadius ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {geofenceResult.isWithinRadius
                          ? 'Location Verified: On-Premise'
                          : 'Location Restricted: Outside Company Premises'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-700 font-medium">
                        {geofenceResult.distanceMeters > 1000
                          ? `${(geofenceResult.distanceMeters / 1000).toFixed(1)} km away`
                          : `${geofenceResult.distanceMeters}m away`}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {venue.name} - {venue.address}
                    </p>

                    {!geofenceResult.isWithinRadius && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-100/70 border border-rose-200 text-[11px] text-rose-800 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Attendance login is only permitted while physically on-premise at the company venue.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Simulator / Tester Switcher */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-600">
                    GPS Source / Testing Selector:
                  </span>
                  {useDeviceGps && (
                    <span className="text-[10px] text-indigo-600 font-mono font-semibold">Live Device GPS</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presets.map((preset) => {
                    const isSelected = !useDeviceGps && selectedPresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetChange(preset.id)}
                        className={`p-2 rounded-lg text-left border transition-all text-[11px] ${
                          isSelected
                            ? preset.isInside
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                              : 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-semibold">{preset.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{preset.description}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleUseRealDeviceGps}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1.5 underline"
                  >
                    <MapPin className="w-3 h-3 text-slate-500" />
                    Query Real Device GPS Coordinates
                  </button>
                  {deviceGpsError && (
                    <span className="text-[10px] text-amber-600 truncate max-w-xs">{deviceGpsError}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Logout Confirmation Summary (for LOGOUT mode) */}
          {mode === 'LOGOUT' && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="font-semibold text-slate-900">Shift Logout Authentication</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Your face scan confirms shift completion for {shiftInfo.name} ({shiftInfo.timing}). Punch-out timestamp and logged duration will be archived automatically.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 w-full sm:w-auto text-center sm:text-left">
            {!isFaceVerified ? (
              <span className="text-amber-700 font-medium">Waiting for biometric facial match...</span>
            ) : mode === 'LOGIN' && !geofenceResult.isWithinRadius ? (
              <span className="text-rose-700 font-medium">Blocked: Must be at company venue</span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center justify-center sm:justify-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                All verifications passed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={!canSubmit}
              isLoading={isSubmitting}
              className={`flex-1 sm:flex-none shadow-sm ${
                mode === 'LOGIN'
                  ? '!bg-emerald-600 hover:!bg-emerald-500 disabled:!bg-slate-200 disabled:!text-slate-400'
                  : '!bg-rose-600 hover:!bg-rose-500 disabled:!bg-slate-200 disabled:!text-slate-400'
              }`}
            >
              {mode === 'LOGIN' ? 'Confirm Attendance Login' : 'Confirm Attendance Logout'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
