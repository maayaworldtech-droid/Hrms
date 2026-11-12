import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/common/Modal';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { api } from '@/services/api';
import { AttendanceRecord } from '@/types';
import { formatDate, formatTime, formatLabel } from '@/utils/formatters';
import { businessDate, subtractMonthsFromDate, previousDayIso } from '@/utils/operations';
import { ShieldCheck, AlertCircle, CalendarDays } from 'lucide-react';
import { getShiftLabel } from '@/utils/shiftUtils';

interface EmployeeAttendanceHistoryModalProps {
  employee: {
    employeeId: string;
    employeeName: string;
    location?: string;
    shift?: string;
  } | null;
  onClose: () => void;
}

const PAGE_SIZE = 10;

export const EmployeeAttendanceHistoryModal: React.FC<EmployeeAttendanceHistoryModalProps> = ({
  employee,
  onClose,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [oldestLoadedFrom, setOldestLoadedFrom] = useState<string>('');
  const [currentWindowFrom, setCurrentWindowFrom] = useState<string>('');
  const [currentWindowTo, setCurrentWindowTo] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [hasOlderRecords, setHasOlderRecords] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  const fetchWindow = useCallback(
    async (
      empId: string,
      winFrom: string,
      winTo: string,
      targetPage: number,
      append: boolean
    ) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setLoadError(false);

      try {
        const res = await api.attendance.getEmployeeHistory(empId, {
          fromDate: winFrom,
          toDate: winTo,
          page: targetPage,
          size: PAGE_SIZE,
        });
        const items = Array.isArray(res.items) ? res.items : [];
        setRecords((prev) => {
          if (!append) return items;
          const merged = new Map<string, AttendanceRecord>();
          prev.forEach((r) => merged.set(String(r.id), r));
          items.forEach((r) => merged.set(String(r.id), r));
          return Array.from(merged.values());
        });
        setCurrentWindowFrom(res.fromDate);
        setCurrentWindowTo(res.toDate);
        setOldestLoadedFrom((prev) => (!prev || res.fromDate < prev ? res.fromDate : prev));
        setPage(res.page);
        setHasMore(Boolean(res.hasMore));
        setHasOlderRecords(Boolean(res.hasOlderRecords));
      } catch {
        setLoadError(true);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!employee) {
      setRecords([]);
      setLoadError(false);
      return;
    }
    const today = businessDate();
    const oneMonthAgo = subtractMonthsFromDate(today, 1);
    setToDate(today);
    setFromDate(oneMonthAgo);
    setOldestLoadedFrom(oneMonthAgo);
    setRecords([]);
    setPage(0);
    setHasMore(false);
    setHasOlderRecords(false);
    void fetchWindow(employee.employeeId, oneMonthAgo, today, 0, false);
  }, [employee, fetchWindow]);

  const handleLoadMoreInWindow = () => {
    if (!employee || !hasMore || isLoadingMore) return;
    void fetchWindow(employee.employeeId, currentWindowFrom, currentWindowTo, page + 1, true);
  };

  const handleLoadPreviousMonth = () => {
    if (!employee || !hasOlderRecords || isLoadingMore) return;
    const prevWinTo = previousDayIso(currentWindowFrom);
    const prevWinFrom = subtractMonthsFromDate(prevWinTo, 1);
    void fetchWindow(employee.employeeId, prevWinFrom, prevWinTo, 0, true);
  };

  if (!employee) return null;

  const statusVariant = (status: string) => {
    if (status === 'PRESENT') return 'success';
    if (status === 'ON_DUTY') return 'info';
    if (status === 'LATE') return 'warning';
    return 'error';
  };

  return (
    <Modal
      isOpen={Boolean(employee)}
      onClose={onClose}
      title={`${employee.employeeName} — Attendance History`}
      subtitle={`${employee.location || 'No center assigned'} · ${
        getShiftLabel(employee.shift)
      }`}
      size="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Active range bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 text-slate-600">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Range:{' '}
              <strong className="text-slate-900">
                {oldestLoadedFrom ? formatDate(oldestLoadedFrom) : '--'}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {toDate ? formatDate(toDate) : '--'}
              </strong>
            </span>
          </div>
          <span className="text-slate-500 tabular-nums">
            {records.length} {records.length === 1 ? 'record' : 'records'} loaded
          </span>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="py-8 text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
            <p className="font-semibold text-slate-900">Could not load attendance history</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void fetchWindow(
                  employee.employeeId,
                  currentWindowFrom || fromDate,
                  currentWindowTo || toDate,
                  page,
                  page > 0
                )
              }
            >
              Retry
            </Button>
          </div>
        ) : records.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="font-semibold text-slate-900">
              No attendance records in this 1-month window
            </p>
            <p className="text-slate-500">
              No punches found between {fromDate ? formatDate(fromDate) : '--'} and{' '}
              {toDate ? formatDate(toDate) : '--'}.
            </p>
            {hasOlderRecords && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadPreviousMonth}
                  isLoading={isLoadingMore}
                >
                  Load previous month
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Punch in</th>
                    <th className="py-2.5 px-3">Punch out</th>
                    <th className="py-2.5 px-3">Hours</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{formatDate(rec.date)}</span>
                          {rec.isBiometricVerified && (
                            <span title="Face Biometric Verified">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-slate-800 whitespace-nowrap">
                        {rec.checkIn ? formatTime(rec.checkIn) : '--:--'}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-slate-800 whitespace-nowrap">
                        {rec.checkOut ? formatTime(rec.checkOut) : '--:--'}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums text-slate-800 whitespace-nowrap">
                        {rec.workHours ? `${rec.workHours} hrs` : '--'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <Badge variant={statusVariant(rec.status)} size="sm">
                          {formatLabel(rec.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Load More & Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMoreInWindow}
                isLoading={isLoadingMore}
              >
                Load more
              </Button>
            )}
            {!hasMore && hasOlderRecords && records.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadPreviousMonth}
                isLoading={isLoadingMore}
              >
                Load previous month
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

