import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { CompanySettings as CompanySettingsType, AuditLog } from '@/types';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import {
  Settings,
  Building2,
  ShieldCheck,
  Save,
  Check,
  History,
  Clock,
} from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToast } from '@/store/slices/uiSlice';

export const CompanySettings: React.FC = () => {
  const dispatch = useAppDispatch();
  const [settings, setSettings] = useState<CompanySettingsType | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.settings.get(), api.audit.getLogs()]).then(([s, logs]) => {
      setSettings(s);
      setAuditLogs(logs);
      setIsLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await api.settings.update(settings);
      dispatch(
        addToast({
          type: 'success',
          title: 'Settings Saved',
          message: 'Company configuration and statutory parameters updated.',
        })
      );
      const updatedLogs = await api.audit.getLogs();
      setAuditLogs(updatedLogs);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading company settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Settings & Compliance</h1>
          <p className="text-xs text-slate-500 mt-1">
            Corporate entity profile, statutory registrations, work policies & system audit trails
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={isSaving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form settings */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Entity Profile */}
            <Card>
              <CardHeader
                title="Legal Entity & Registrations"
                subtitle="Official particulars reflected on payroll receipts and statutory returns"
                icon={<Building2 className="w-4 h-4" />}
              />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Trading / Brand Name"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  />
                  <Input
                    label="Registered Legal Entity Name"
                    value={settings.legalEntityName}
                    onChange={(e) => setSettings({ ...settings, legalEntityName: e.target.value })}
                  />
                  <Input
                    label="Corporate GSTIN / PAN"
                    value={settings.corporateTaxId}
                    onChange={(e) => setSettings({ ...settings, corporateTaxId: e.target.value })}
                  />
                  <Input
                    label="EPFO Establishment Code"
                    value={settings.pfRegistrationNo}
                    onChange={(e) => setSettings({ ...settings, pfRegistrationNo: e.target.value })}
                  />
                  <Input
                    label="ESIC Employer Code"
                    value={settings.esiRegistrationNo}
                    onChange={(e) => setSettings({ ...settings, esiRegistrationNo: e.target.value })}
                  />
                  <Input
                    label="Official HR Inquiries Email"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Registered Headquarters Address
                  </label>
                  <textarea
                    value={settings.registeredAddress}
                    onChange={(e) => setSettings({ ...settings, registeredAddress: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Attendance & Shift Policies */}
            <Card>
              <CardHeader
                title="Workforce & Time Policies"
                subtitle="Shift parameters, attendance regularization thresholds, and calendar rules"
                icon={<Clock className="w-4 h-4" />}
              />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Standard Work Hours/Day"
                    type="number"
                    step="0.5"
                    value={settings.standardWorkHoursPerDay}
                    onChange={(e) =>
                      setSettings({ ...settings, standardWorkHoursPerDay: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Work Days per Week"
                    type="number"
                    value={settings.workDaysPerWeek}
                    onChange={(e) =>
                      setSettings({ ...settings, workDaysPerWeek: Number(e.target.value) })
                    }
                  />
                  <Input
                    label="Fiscal Year Begins"
                    value={settings.fiscalYearStartMonth}
                    onChange={(e) =>
                      setSettings({ ...settings, fiscalYearStartMonth: e.target.value })
                    }
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800">
                      Geofenced Office Check-In
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Restrict mobile attendance punch within office radius
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableGeoFencingAttendance}
                    onChange={(e) =>
                      setSettings({ ...settings, enableGeoFencingAttendance: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Right Col: Audit Trail Log */}
        <div>
          <Card>
            <CardHeader
              title="System Audit Trail"
              subtitle="Tamper-evident record of administrative modifications"
              icon={<History className="w-4 h-4" />}
            />
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-slate-50 text-xs">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.split(' ')[1]}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                      <span>By: <strong className="text-slate-700">{log.actorName}</strong></span>
                      <span className="font-mono">{log.ipAddress}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
