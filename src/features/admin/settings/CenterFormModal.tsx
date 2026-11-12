import React, { useEffect, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Center, CenterInput, CenterType } from '@/types';

interface CenterFormModalProps {
  isOpen: boolean;
  /** When set, the form edits this center; otherwise it creates a new one. */
  center: Center | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: CenterInput) => void;
}

const suggestedName = (type: CenterType, city: string) => {
  const clean = city.trim();
  if (!clean) return '';
  return type === 'GAMING_ZONE' ? `Maaya World Gaming Zone ${clean}` : `Maaya World ${clean}`;
};

interface FormState {
  centerType: CenterType;
  city: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
}

const emptyForm: FormState = {
  centerType: 'CENTER',
  city: '',
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  radiusMeters: '250',
};

export const CenterFormModal: React.FC<CenterFormModalProps> = ({ isOpen, center, isSaving, onClose, onSubmit }) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  // Keep suggesting the name from type + city until the admin types a name of their own
  const [nameEdited, setNameEdited] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [locating, setLocating] = useState(false);
  const [locateMessage, setLocateMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (center) {
      setForm({
        centerType: center.centerType,
        city: center.city,
        name: center.name,
        address: center.address,
        latitude: center.latitude != null ? String(center.latitude) : '',
        longitude: center.longitude != null ? String(center.longitude) : '',
        radiusMeters: String(center.radiusMeters || 250),
      });
      setNameEdited(true);
    } else {
      setForm(emptyForm);
      setNameEdited(false);
    }
    setErrors({});
    setLocateMessage('');
  }, [isOpen, center]);

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (!nameEdited && ('city' in patch || 'centerType' in patch)) {
        next.name = suggestedName(next.centerType, next.city);
      }
      return next;
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocateMessage('This browser cannot read your location. Enter the coordinates instead.');
      return;
    }
    setLocating(true);
    setLocateMessage('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocateMessage(`Location captured (accurate to about ${Math.round(pos.coords.accuracy)} m).`);
        setLocating(false);
      },
      (err) => {
        setLocateMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Allow it in the browser, or enter the coordinates.'
            : 'Could not read your location. Try again, or enter the coordinates.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = (): CenterInput | null => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.city.trim()) next.city = 'Enter the city';
    if (form.name.trim().length < 3) next.name = 'Enter a name of at least 3 characters';

    const hasLat = form.latitude.trim() !== '';
    const hasLng = form.longitude.trim() !== '';
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (hasLat !== hasLng) {
      next.latitude = 'Enter both latitude and longitude, or leave both empty';
    } else if (hasLat && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      next.latitude = 'Latitude must be between -90 and 90';
    } else if (hasLng && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
      next.longitude = 'Longitude must be between -180 and 180';
    }
    const radius = Number(form.radiusMeters);
    if (!Number.isFinite(radius) || radius < 50 || radius > 5000) {
      next.radiusMeters = 'Use a distance between 50 and 5000 meters';
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return null;
    return {
      name: form.name.trim(),
      centerType: form.centerType,
      city: form.city.trim(),
      address: form.address.trim(),
      latitude: hasLat ? lat : null,
      longitude: hasLng ? lng : null,
      radiusMeters: Math.round(radius),
    };
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const input = validate();
    if (input) onSubmit(input);
  };

  const renaming = !!center && form.name.trim() !== center.name;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={center ? `Edit ${center.name}` : 'Add a center'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleSubmit()} isLoading={isSaving}>
            {center ? 'Save changes' : 'Add center'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className="block text-sm font-medium text-slate-900 mb-1.5">Type</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['CENTER', 'GAMING_ZONE'] as CenterType[]).map((type) => (
              <label
                key={type}
                className={`flex items-center gap-2 h-10 px-3 rounded-lg border cursor-pointer text-sm ${
                  form.centerType === type
                    ? 'border-brand-600 bg-brand-50 text-brand-800 font-medium ring-1 ring-brand-600'
                    : 'border-slate-300 text-slate-700 hover:border-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="centerType"
                  className="accent-brand-600"
                  checked={form.centerType === type}
                  onChange={() => update({ centerType: type })}
                />
                {type === 'GAMING_ZONE' ? 'Gaming zone' : 'Center'}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="City"
            required
            placeholder="e.g. Vijayawada"
            value={form.city}
            error={errors.city}
            onChange={(e) => update({ city: e.target.value })}
          />
          <Input
            label="Name shown everywhere"
            required
            value={form.name}
            error={errors.name}
            helperText={
              renaming
                ? `Past attendance, leave and payslips will also show the new name instead of "${center?.name}".`
                : 'Suggested from the type and city. You can change it.'
            }
            onChange={(e) => {
              setNameEdited(true);
              setForm((prev) => ({ ...prev, name: e.target.value }));
            }}
          />
        </div>

        <div>
          <label htmlFor="center-address" className="block text-sm font-medium text-slate-900 mb-1.5">
            Address
          </label>
          <textarea
            id="center-address"
            rows={2}
            value={form.address}
            placeholder="Building, street and area"
            onChange={(e) => update({ address: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-400/30"
          />
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Check-in area</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Staff can only check in when their phone is within this distance of the center.
                Open this form while standing at the center and use your current location.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={useCurrentLocation}
              isLoading={locating}
              leftIcon={<Crosshair className="w-4 h-4" />}
            >
              Use my current location
            </Button>
          </div>
          {locateMessage && <p className="text-xs text-slate-700">{locateMessage}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Latitude"
              inputMode="decimal"
              placeholder="17.4326"
              value={form.latitude}
              error={errors.latitude}
              onChange={(e) => update({ latitude: e.target.value })}
            />
            <Input
              label="Longitude"
              inputMode="decimal"
              placeholder="78.3411"
              value={form.longitude}
              error={errors.longitude}
              onChange={(e) => update({ longitude: e.target.value })}
            />
            <Input
              label="Allowed distance (meters)"
              type="number"
              min={50}
              max={5000}
              value={form.radiusMeters}
              error={errors.radiusMeters}
              onChange={(e) => update({ radiusMeters: e.target.value })}
            />
          </div>
          {form.latitude.trim() === '' && (
            <p className="text-xs text-amber-800">
              Without a check-in area, staff at this center cannot check in while location checks are switched on.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};
