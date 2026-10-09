import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { Holiday } from '@/types';
import { useAppSelector, useAppDispatch } from '@/store';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { DataTable, Column } from '@/components/common/DataTable';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { formatDate } from '@/utils/formatters';
import { PartyPopper, Calendar, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { addToast } from '@/store/slices/uiSlice';

export const HolidayCalendar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { activeRole } = useAppSelector((state) => state.auth);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Holiday form
  const [name, setName] = useState('');
  const [date, setDate] = useState('2026-11-24');
  const [type, setType] = useState<Holiday['type']>('FESTIVAL');
  const [description, setDescription] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.holidays.getAll();
      setHolidays(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    try {
      await api.holidays.create({
        name,
        date,
        dayOfWeek,
        type,
        isMandatory: type === 'NATIONAL',
        description,
      });

      dispatch(
        addToast({
          type: 'success',
          title: 'Holiday Added',
          message: `${name} has been added to the official calendar.`,
        })
      );
      setIsAddModalOpen(false);
      setName('');
      setDescription('');
      loadData();
    } catch {
      dispatch(addToast({ type: 'error', title: 'Failed to add holiday' }));
    }
  };

  const handleDelete = async (id: string, holidayName: string) => {
    if (window.confirm(`Remove ${holidayName} from holiday schedule?`)) {
      await api.holidays.delete(id);
      dispatch(
        addToast({
          type: 'info',
          title: 'Holiday Removed',
          message: `${holidayName} removed.`,
        })
      );
      loadData();
    }
  };

  const columns: Column<Holiday>[] = [
    {
      key: 'name',
      header: 'Holiday Name',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          {row.description && <div className="text-[11px] text-slate-500">{row.description}</div>}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-800">{formatDate(row.date)}</span>
      ),
    },
    {
      key: 'dayOfWeek',
      header: 'Day',
      sortable: true,
    },
    {
      key: 'type',
      header: 'Classification',
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.type === 'NATIONAL'
              ? 'purple'
              : row.type === 'FESTIVAL'
              ? 'success'
              : 'neutral'
          }
          size="sm"
        >
          {row.type}
        </Badge>
      ),
    },
    {
      key: 'isMandatory',
      header: 'Mandatory',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-700">
          {row.isMandatory ? 'Gazetted' : 'Optional'}
        </span>
      ),
    },
    ...(activeRole === 'ADMIN'
      ? [
          {
            key: 'actions',
            header: 'Action',
            align: 'right' as const,
            render: (row: Holiday) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(row.id, row.name)}
                className="!p-1 text-slate-400 hover:text-rose-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Holiday Calendar</h1>
          <p className="text-xs text-slate-500 mt-1">
            Official paid non-working days, gazetted national celebrations & festival holidays
          </p>
        </div>
        {activeRole === 'ADMIN' && (
          <Button
            variant="primary"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Holiday
          </Button>
        )}
      </div>

      {/* Main Table */}
      <DataTable
        data={holidays}
        columns={columns}
        searchPlaceholder="Search holidays by name..."
        exportFileName="pulse_holidays_calendar_2026"
        isLoading={isLoading}
      />

      {/* Add Holiday Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Company Holiday"
        subtitle="Schedule an official non-working day on the corporate calendar"
        size="md"
      >
        <form onSubmit={handleAddHoliday} className="space-y-4 text-xs">
          <Input
            label="Holiday Title"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Guru Nanak Jayanti"
            required
          />

          <Input
            label="Holiday Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Select
            label="Holiday Classification"
            options={[
              { value: 'NATIONAL', label: 'National Gazetted Holiday' },
              { value: 'FESTIVAL', label: 'Festival Paid Holiday' },
              { value: 'OPTIONAL', label: 'Restricted / Optional Holiday' },
            ]}
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          />

          <Input
            label="Description / Context"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes regarding the observance"
          />

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Holiday
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
