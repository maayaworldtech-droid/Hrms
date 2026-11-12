import { AttendanceRecord, Center, Employee, LeaveRequest, OnDutyRequest, PayrollRun, Payslip } from '@/types';
import { formatDate, formatINR } from '@/utils/formatters';
import { AttentionItem, CenterBar, ReportData } from './ReportView';
import { MonthRange, centerNameOf, daysWithinMonth, idKey, plural, sum, titleCase } from './reportUtils';

export interface ReportContext {
  range: MonthRange;
  prevRange: MonthRange;
  /** "ALL" or a center name */
  centerFilter: string;
  centers: Center[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  onDuty: OnDutyRequest[];
  run: PayrollRun | undefined;
  prevRun: PayrollRun | undefined;
  slips: Payslip[];
  prevSlips: Payslip[];
  today: string;
}

// ----------------------------------------------------------------------------- shared helpers

const helpers = (ctx: ReportContext) => {
  const empById = new Map(ctx.employees.map((e) => [idKey(e.id), e]));
  /** Center of a person: their current center, else the name stored on the record */
  const centerFor = (employeeId: unknown, storedLocation?: string) => {
    const emp = empById.get(idKey(employeeId));
    return centerNameOf(ctx.centers, emp?.location || storedLocation);
  };
  const inScope = (center: string) => ctx.centerFilter === 'ALL' || ctx.centerFilter === center;
  /** Bars for every center (plus "No center" if it carries data), in Settings order */
  const barsFor = (valueOf: (center: string) => number, display: (value: number, center: string) => string): CenterBar[] => {
    const names = ctx.centers.map((c) => c.name);
    if (valueOf('No center') > 0) names.push('No center');
    return names.map((center) => {
      const value = valueOf(center);
      return { center, value, display: display(value, center) };
    });
  };
  const nameList = (names: string[], max = 4) =>
    names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
  return { empById, centerFor, inScope, barsFor, nameList };
};

const compareMoney = (current: number, previous: number | null, prevLabel: string) => {
  if (previous === null) return `No payroll for ${prevLabel} to compare`;
  const diff = Math.round(current - previous);
  if (diff === 0) return `Same as ${prevLabel}`;
  return `${formatINR(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than ${prevLabel}`;
};

const compareCount = (current: number, previous: number, prevLabel: string, noun: string) => {
  const diff = current - previous;
  if (diff === 0) return `Same as ${prevLabel}`;
  return `${plural(Math.abs(diff), noun)} ${diff > 0 ? 'more' : 'fewer'} than ${prevLabel}`;
};

const scopeSuffix = (ctx: ReportContext) => (ctx.centerFilter === 'ALL' ? 'all-centers' : ctx.centerFilter.replace(/\s+/g, '-').toLowerCase());

// ----------------------------------------------------------------------------- Salary

export const buildSalaryReport = (ctx: ReportContext): ReportData => {
  const { centerFor, inScope, barsFor, nameList } = helpers(ctx);
  const { range, prevRange } = ctx;
  const slipCenter = (s: Payslip) => centerNameOf(ctx.centers, s.location) !== 'No center'
    ? centerNameOf(ctx.centers, s.location)
    : centerFor(s.employeeId);

  const emptyTable = {
    title: `Salary for ${range.label}`,
    emptyText: 'No payslips for this month.',
    columns: [],
    rows: [],
    csv: { filename: `salary-${range.key}-${scopeSuffix(ctx)}`, headers: [], rows: [] },
  };

  if (!ctx.run) {
    return {
      notice: {
        tone: 'warning',
        text: `Salaries for ${range.label} have not been worked out yet. Generate the payroll first, then come back to see this report.`,
        link: { to: '/admin/payroll', label: 'Go to Payroll' },
      },
      kpis: [
        { label: 'Total salary cost', value: '—' },
        { label: 'Take-home paid to staff', value: '—' },
        { label: 'Deductions', value: '—' },
        { label: 'People on payroll', value: '—' },
      ],
      chart: null,
      attention: [],
      table: emptyTable,
    };
  }

  const slips = ctx.slips.filter((s) => inScope(slipCenter(s)));
  const gross = sum(slips.map((s) => s.components.grossMonthly));
  const net = sum(slips.map((s) => s.components.netMonthly));
  const deductions = sum(slips.map((s) => s.components.totalDeductions));
  const prevGross = ctx.prevRun ? sum(ctx.prevSlips.filter((s) => inScope(slipCenter(s))).map((s) => s.components.grossMonthly)) : null;
  const paid = ctx.run.status === 'DISBURSED';

  const attention: AttentionItem[] = [];
  if (!paid) {
    attention.push({
      tone: 'warning',
      text: `${range.label} salaries are still a draft and have not been paid.`,
      link: { to: '/admin/payroll', label: 'Review and pay in Payroll' },
    });
  }
  const noSalary = slips.filter((s) => !(s.components.grossMonthly > 0));
  if (noSalary.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(noSalary.length, 'person has', 'people have')} no salary on file, so their payslip is ₹0: ${nameList(noSalary.map((s) => s.employeeName))}.`,
      link: { to: '/admin/employees', label: 'Set salaries in Employees' },
    });
  }
  const noBank = slips.filter((s) => !s.bankAccount?.trim());
  if (noBank.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(noBank.length, 'person has', 'people have')} no bank account on file and cannot be paid by bank transfer: ${nameList(noBank.map((s) => s.employeeName))}.`,
      link: { to: '/admin/employees', label: 'Add bank details in Employees' },
    });
  }
  const lop = slips.filter((s) => s.lossOfPayDays > 0);
  if (lop.length > 0) {
    attention.push({
      tone: 'info',
      text: `${plural(lop.length, 'person', 'people')} had pay cut for unpaid days: ${nameList(lop.map((s) => `${s.employeeName} (${s.lossOfPayDays} days)`))}.`,
    });
  }

  const sorted = [...slips].sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  return {
    kpis: [
      { label: 'Total salary cost', value: formatINR(gross), note: compareMoney(gross, prevGross, prevRange.name) },
      {
        label: 'Take-home paid to staff',
        value: formatINR(net),
        note: paid ? `Paid on ${formatDate(ctx.run.disbursedAt)}` : 'Not paid yet (draft)',
        tone: paid ? 'default' : 'warning',
      },
      { label: 'Deductions', value: formatINR(deductions), note: 'PF, professional tax, income tax and others' },
      {
        label: 'People on payroll',
        value: String(slips.length),
        note: slips.length > 0 ? `Average take-home ${formatINR(Math.round(net / slips.length))}` : undefined,
      },
    ],
    chart: {
      title: 'Salary cost by center',
      bars: barsFor(
        (center) => sum(ctx.slips.filter((s) => slipCenter(s) === center).map((s) => s.components.grossMonthly)),
        (v) => formatINR(v)
      ),
    },
    attention,
    table: {
      title: `Salary for ${range.label}`,
      emptyText: 'No payslips match this center.',
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'center', header: 'Center' },
        { key: 'designation', header: 'Role' },
        { key: 'gross', header: 'Salary cost', align: 'right' },
        { key: 'deductions', header: 'Deductions', align: 'right' },
        { key: 'net', header: 'Take-home', align: 'right' },
        { key: 'lop', header: 'Unpaid days', align: 'right' },
        { key: 'status', header: 'Status' },
      ],
      rows: sorted.map((s) => ({
        id: s.id,
        search: `${s.employeeName} ${s.employeeCode}`,
        cells: {
          name: s.employeeName,
          center: slipCenter(s),
          designation: s.designation || '—',
          gross: formatINR(s.components.grossMonthly),
          deductions: formatINR(s.components.totalDeductions),
          net: formatINR(s.components.netMonthly),
          lop: s.lossOfPayDays || 0,
          status: s.paymentStatus === 'PAID' ? 'Paid' : <span className="text-amber-800">Not paid yet</span>,
        },
      })),
      csv: {
        filename: `salary-${range.key}-${scopeSuffix(ctx)}`,
        headers: [
          'Employee code', 'Name', 'Center', 'Role', 'Basic', 'HRA', 'Other allowances', 'Bonus and incentives',
          'Salary cost (gross)', 'PF', 'Professional tax', 'Income tax (TDS)', 'Total deductions', 'Take-home (net)',
          'Unpaid days', 'Bank account', 'Status', 'Paid on',
        ],
        rows: sorted.map((s) => {
          const c = s.components;
          return [
            s.employeeCode, s.employeeName, slipCenter(s), s.designation || '', c.basic, c.hra,
            Math.round((c.specialAllowance || 0) + (c.conveyanceAllowance || 0) + (c.medicalAllowance || 0)),
            Math.round((c.bonus || 0) + (c.incentives || 0)),
            c.grossMonthly, c.epfEmployee, c.professionalTax, c.tds, c.totalDeductions, c.netMonthly,
            s.lossOfPayDays || 0, s.bankAccount || '', s.paymentStatus === 'PAID' ? 'Paid' : 'Not paid yet', s.paymentDate || '',
          ];
        }),
      },
    },
  };
};

// ----------------------------------------------------------------------------- Attendance

export const buildAttendanceReport = (ctx: ReportContext): ReportData => {
  const { empById, centerFor, inScope, barsFor, nameList } = helpers(ctx);
  const { range, prevRange } = ctx;
  const recCenter = (r: AttendanceRecord) => centerFor(r.employeeId, r.location);
  const inMonth = (r: AttendanceRecord, m: MonthRange) => r.date >= m.start && r.date <= m.end;

  const all = ctx.attendance.filter((r) => inMonth(r, range));
  const recs = all.filter((r) => inScope(recCenter(r)));
  const prev = ctx.attendance.filter((r) => inMonth(r, prevRange) && inScope(recCenter(r)));

  const worked = recs.filter((r) => !!r.checkIn);
  const late = recs.filter((r) => r.status === 'LATE');
  const withHours = recs.filter((r) => r.checkOut && Number(r.workHours) > 0);
  const avgHours = withHours.length ? sum(withHours.map((r) => Number(r.workHours))) / withHours.length : 0;
  const missedOut = recs.filter((r) => r.checkIn && !r.checkOut && r.date < ctx.today);
  const pendingCorrections = recs.filter((r) => r.regularizationStatus === 'PENDING');
  const people = new Set(worked.map((r) => idKey(r.employeeId)));

  // Per-person rows: everyone active in scope, plus anyone with records this month
  const ids = new Set<string>();
  ctx.employees
    .filter((e) => e.status !== 'TERMINATED' && inScope(centerNameOf(ctx.centers, e.location)))
    .forEach((e) => ids.add(idKey(e.id)));
  recs.forEach((r) => ids.add(idKey(r.employeeId)));

  const approvedLeaves = ctx.leaves.filter((l) => l.status === 'APPROVED');
  const odDone = ctx.onDuty.filter(
    (o) => (o.status === 'APPROVED' || o.status === 'COMPLETED') && o.dutyDate >= range.start && o.dutyDate <= range.end
  );

  const perPerson = [...ids].map((id) => {
    const mine = recs.filter((r) => idKey(r.employeeId) === id);
    const emp = empById.get(id);
    const name = emp?.fullName || mine[0]?.employeeName || 'Unknown';
    const hours = mine.filter((r) => r.checkOut && Number(r.workHours) > 0);
    return {
      id,
      name,
      code: emp?.employeeCode || '',
      center: centerFor(id, mine[0]?.location),
      worked: mine.filter((r) => !!r.checkIn).length,
      late: mine.filter((r) => r.status === 'LATE').length,
      avg: hours.length ? sum(hours.map((r) => Number(r.workHours))) / hours.length : 0,
      missed: mine.filter((r) => r.checkIn && !r.checkOut && r.date < ctx.today).length,
      leaveDays: sum(
        approvedLeaves.filter((l) => idKey(l.employeeId) === id).map((l) => daysWithinMonth(l.startDate, l.endDate, range))
      ),
      odDays: odDone.filter((o) => idKey(o.employeeId) === id).length,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const oftenLate = perPerson.filter((p) => p.late >= 3).sort((a, b) => b.late - a.late);
  const attention: AttentionItem[] = [];
  if (oftenLate.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(oftenLate.length, 'person was', 'people were')} late 3 or more times: ${nameList(oftenLate.map((p) => `${p.name} (${p.late})`))}.`,
      link: { to: '/admin/attendance', label: 'Open Attendance' },
    });
  }
  if (pendingCorrections.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(pendingCorrections.length, 'attendance correction is', 'attendance corrections are')} waiting for approval.`,
      link: { to: '/admin/attendance?status=REGULARIZATION_PENDING&date=', label: 'Review corrections' },
    });
  }
  if (missedOut.length > 0) {
    attention.push({
      tone: 'info',
      text: `${plural(missedOut.length, 'day')} had a check-in but no check-out, so working hours are missing for those days.`,
    });
  }

  const prevLate = prev.filter((r) => r.status === 'LATE').length;
  const prevWorked = prev.filter((r) => !!r.checkIn).length;

  return {
    kpis: [
      {
        label: 'Days worked',
        value: String(worked.length),
        note: `${plural(people.size, 'person', 'people')} checked in · ${compareCount(worked.length, prevWorked, prevRange.name, 'day')}`,
      },
      { label: 'Late arrivals', value: String(late.length), note: compareCount(late.length, prevLate, prevRange.name, 'late arrival') },
      {
        label: 'Average hours per day',
        value: withHours.length ? `${avgHours.toFixed(1)} hrs` : '—',
        note: 'From days with a check-out',
      },
      {
        label: 'Forgot to check out',
        value: String(missedOut.length),
        note: 'Days with a check-in but no check-out',
        tone: missedOut.length > 0 ? 'warning' : 'default',
      },
    ],
    chart: {
      title: 'On-time arrivals by center',
      bars: barsFor(
        (center) => {
          const local = all.filter((r) => r.checkIn && recCenter(r) === center);
          if (local.length === 0) return 0;
          return Math.round((local.filter((r) => r.status !== 'LATE').length / local.length) * 100);
        },
        (v, center) => (all.some((r) => r.checkIn && recCenter(r) === center) ? `${v}%` : 'No check-ins')
      ),
    },
    attention,
    table: {
      title: `Attendance by person, ${range.label}`,
      emptyText: 'No staff or attendance for this center.',
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'center', header: 'Center' },
        { key: 'worked', header: 'Days worked', align: 'right' },
        { key: 'late', header: 'Late', align: 'right' },
        { key: 'avg', header: 'Avg hours', align: 'right' },
        { key: 'missed', header: 'No check-out', align: 'right' },
        { key: 'leave', header: 'Leave days', align: 'right' },
        { key: 'od', header: 'On Duty days', align: 'right' },
      ],
      rows: perPerson.map((p) => ({
        id: p.id,
        search: `${p.name} ${p.code}`,
        cells: {
          name: p.name,
          center: p.center,
          worked: p.worked,
          late: p.late >= 3 ? <span className="text-amber-800 font-medium">{p.late}</span> : p.late,
          avg: p.avg ? p.avg.toFixed(1) : '—',
          missed: p.missed,
          leave: p.leaveDays,
          od: p.odDays,
        },
      })),
      csv: {
        filename: `attendance-${range.key}-${scopeSuffix(ctx)}`,
        headers: ['Employee code', 'Name', 'Center', 'Days worked', 'Late arrivals', 'Average hours', 'Days without check-out', 'Leave days', 'On Duty days'],
        rows: perPerson.map((p) => [p.code, p.name, p.center, p.worked, p.late, Number(p.avg.toFixed(2)), p.missed, p.leaveDays, p.odDays]),
      },
    },
  };
};

// ----------------------------------------------------------------------------- Leave

export const buildLeaveReport = (ctx: ReportContext): ReportData => {
  const { centerFor, inScope, barsFor, nameList } = helpers(ctx);
  const { range } = ctx;
  const leaveCenter = (l: LeaveRequest) => centerFor(l.employeeId, l.location);
  const overlapping = (l: LeaveRequest) => l.startDate <= range.end && (l.endDate || l.startDate) >= range.start;

  const all = ctx.leaves.filter(overlapping);
  const list = all.filter((l) => inScope(leaveCenter(l)));
  const approved = list.filter((l) => l.status === 'APPROVED');
  const pending = list.filter((l) => l.status === 'PENDING');
  const closed = list.filter((l) => l.status === 'REJECTED' || l.status === 'CANCELLED');
  const daysOf = (l: LeaveRequest) => daysWithinMonth(l.startDate, l.endDate, range);
  const takenDays = sum(approved.map(daysOf));

  const byType = new Map<string, number>();
  approved.forEach((l) => byType.set(l.leaveType, (byType.get(l.leaveType) || 0) + daysOf(l)));
  const topType = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];

  const perPersonDays = new Map<string, { name: string; days: number }>();
  approved.forEach((l) => {
    const key = idKey(l.employeeId);
    const cur = perPersonDays.get(key) || { name: l.employeeName, days: 0 };
    perPersonDays.set(key, { name: cur.name, days: cur.days + daysOf(l) });
  });
  const heavy = [...perPersonDays.values()].filter((p) => p.days >= 5).sort((a, b) => b.days - a.days);

  const attention: AttentionItem[] = [];
  if (pending.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(pending.length, 'leave request is', 'leave requests are')} waiting for approval (${plural(sum(pending.map(daysOf)), 'day')}).`,
      link: { to: '/admin/leaves?status=PENDING', label: 'Review leave requests' },
    });
  }
  if (heavy.length > 0) {
    attention.push({
      tone: 'info',
      text: `${plural(heavy.length, 'person is', 'people are')} away 5 or more days this month: ${nameList(heavy.map((p) => `${p.name} (${p.days})`))}.`,
    });
  }

  const statusLabel = (s: LeaveRequest['status']) =>
    s === 'PENDING' ? <span className="text-amber-800">Waiting</span> : titleCase(s);
  const sorted = [...list].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return {
    kpis: [
      { label: 'Leave days taken', value: String(takenDays), note: `Approved leave · ${plural(perPersonDays.size, 'person', 'people')}` },
      {
        label: 'Waiting for approval',
        value: String(pending.length),
        note: pending.length ? `${plural(sum(pending.map(daysOf)), 'day')} requested` : 'All requests handled',
        tone: pending.length > 0 ? 'warning' : 'default',
      },
      { label: 'Rejected or cancelled', value: String(closed.length) },
      {
        label: 'Most used leave type',
        value: topType ? titleCase(topType[0]) : '—',
        note: topType ? plural(topType[1], 'day') : undefined,
      },
    ],
    chart: {
      title: 'Leave days taken by center',
      bars: barsFor(
        (center) => sum(all.filter((l) => l.status === 'APPROVED' && leaveCenter(l) === center).map(daysOf)),
        (v) => plural(v, 'day')
      ),
    },
    attention,
    table: {
      title: `Leave requests in ${range.label}`,
      emptyText: 'No leave requests this month.',
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'center', header: 'Center' },
        { key: 'type', header: 'Type' },
        { key: 'dates', header: 'Dates' },
        { key: 'days', header: 'Days this month', align: 'right' },
        { key: 'status', header: 'Status' },
      ],
      rows: sorted.map((l) => ({
        id: String(l.id),
        search: l.employeeName,
        cells: {
          name: l.employeeName,
          center: leaveCenter(l),
          type: titleCase(l.leaveType),
          dates: l.startDate === l.endDate ? formatDate(l.startDate) : `${formatDate(l.startDate)} to ${formatDate(l.endDate)}`,
          days: daysOf(l),
          status: statusLabel(l.status),
        },
      })),
      csv: {
        filename: `leave-${range.key}-${scopeSuffix(ctx)}`,
        headers: ['Name', 'Center', 'Leave type', 'From', 'To', 'Total days', 'Days in this month', 'Status', 'Reason'],
        rows: sorted.map((l) => [
          l.employeeName, leaveCenter(l), titleCase(l.leaveType), l.startDate, l.endDate, l.days, daysOf(l), titleCase(l.status), l.reason || '',
        ]),
      },
    },
  };
};

// ----------------------------------------------------------------------------- Expenses (On Duty)

export const buildExpenseReport = (ctx: ReportContext): ReportData => {
  const { centerFor, inScope, barsFor } = helpers(ctx);
  const { range } = ctx;
  const odCenter = (o: OnDutyRequest) => centerFor(o.employeeId, o.location);
  const all = ctx.onDuty.filter((o) => o.dutyDate >= range.start && o.dutyDate <= range.end);
  const list = all.filter((o) => inScope(odCenter(o)));
  const amount = (o: OnDutyRequest) => (o.hasExpense ? Number(o.expenseAmount) || 0 : 0);

  const trips = list.filter((o) => o.status !== 'REJECTED' && o.status !== 'CANCELLED');
  const claims = list.filter((o) => amount(o) > 0);
  const reimbursed = claims.filter((o) => o.reimbursementStatus === 'REIMBURSED');
  const waiting = claims.filter((o) => o.reimbursementStatus === 'PENDING');
  const pendingTrips = list.filter((o) => o.status === 'PENDING');

  const attention: AttentionItem[] = [];
  if (waiting.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(waiting.length, 'expense claim is', 'expense claims are')} waiting to be reimbursed, totalling ${formatINR(sum(waiting.map(amount)))}.`,
      link: { to: '/admin/on-duty', label: 'Review claims' },
    });
  }
  if (pendingTrips.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(pendingTrips.length, 'On Duty request is', 'On Duty requests are')} waiting for approval.`,
      link: { to: '/admin/on-duty', label: 'Review requests' },
    });
  }

  const reimbursementLabel = (o: OnDutyRequest) => {
    if (amount(o) <= 0) return '—';
    if (o.reimbursementStatus === 'REIMBURSED') return 'Reimbursed';
    if (o.reimbursementStatus === 'REJECTED') return 'Rejected';
    return <span className="text-amber-800">Waiting</span>;
  };
  const sorted = [...list].sort((a, b) => b.dutyDate.localeCompare(a.dutyDate));

  return {
    kpis: [
      { label: 'On Duty trips', value: String(trips.length), note: `${plural(new Set(trips.map((o) => idKey(o.employeeId))).size, 'person', 'people')} went out on work` },
      { label: 'Expenses claimed', value: formatINR(sum(claims.map(amount))), note: plural(claims.length, 'claim') },
      { label: 'Reimbursed', value: formatINR(sum(reimbursed.map(amount))), note: plural(reimbursed.length, 'claim') },
      {
        label: 'Waiting to be reimbursed',
        value: formatINR(sum(waiting.map(amount))),
        note: plural(waiting.length, 'claim'),
        tone: waiting.length > 0 ? 'warning' : 'default',
      },
    ],
    chart: {
      title: 'Expenses claimed by center',
      bars: barsFor((center) => sum(all.filter((o) => odCenter(o) === center).map(amount)), (v) => formatINR(v)),
    },
    attention,
    table: {
      title: `On Duty trips and expenses, ${range.label}`,
      emptyText: 'No On Duty trips this month.',
      columns: [
        { key: 'date', header: 'Date' },
        { key: 'name', header: 'Name' },
        { key: 'center', header: 'Center' },
        { key: 'purpose', header: 'Purpose' },
        { key: 'status', header: 'Trip status' },
        { key: 'amount', header: 'Expense', align: 'right' },
        { key: 'reimbursement', header: 'Reimbursement' },
      ],
      rows: sorted.map((o) => ({
        id: String(o.id),
        search: o.employeeName,
        cells: {
          date: formatDate(o.dutyDate),
          name: o.employeeName,
          center: odCenter(o),
          purpose: titleCase(o.dutyType),
          status: o.status === 'PENDING' ? <span className="text-amber-800">Waiting</span> : titleCase(o.status),
          amount: amount(o) > 0 ? formatINR(amount(o)) : '—',
          reimbursement: reimbursementLabel(o),
        },
      })),
      csv: {
        filename: `on-duty-expenses-${range.key}-${scopeSuffix(ctx)}`,
        headers: ['Date', 'Name', 'Center', 'Purpose', 'Trip status', 'Expense amount', 'Expense details', 'Reimbursement status', 'Reimbursed on'],
        rows: sorted.map((o) => [
          o.dutyDate, o.employeeName, odCenter(o), titleCase(o.dutyType), titleCase(o.status), amount(o),
          o.expenseDescription || '', amount(o) > 0 ? titleCase(o.reimbursementStatus || 'PENDING') : '', o.reimbursedOn || '',
        ]),
      },
    },
  };
};

// ----------------------------------------------------------------------------- Staff

export const buildStaffReport = (ctx: ReportContext): ReportData => {
  const { inScope, barsFor, nameList } = helpers(ctx);
  const { range } = ctx;
  const centerOf = (e: Employee) => centerNameOf(ctx.centers, e.location);
  const allActive = ctx.employees.filter((e) => e.status !== 'TERMINATED');
  const active = allActive.filter((e) => inScope(centerOf(e)));
  const joined = active.filter((e) => e.joiningDate >= range.start && e.joiningDate <= range.end);
  const managers = active.filter((e) => e.role === 'MANAGER');
  const missingBank = active.filter((e) => !e.bankDetails?.accountNumber?.trim() || !e.bankDetails?.panNumber?.trim());
  const noCenter = active.filter((e) => centerOf(e) === 'No center');
  const centersWithoutManager = ctx.centers.filter((c) => c.managers.length === 0 && inScope(c.name));
  const noSalary = active.filter((e) => !(e.monthlySalary > 0));

  const attention: AttentionItem[] = [];
  if (missingBank.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(missingBank.length, 'person is', 'people are')} missing a bank account or PAN, which payroll needs: ${nameList(missingBank.map((e) => e.fullName))}.`,
      link: { to: '/admin/employees', label: 'Update in Employees' },
    });
  }
  if (noSalary.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(noSalary.length, 'person has', 'people have')} no salary on file and will be paid ₹0 until one is set: ${nameList(noSalary.map((e) => e.fullName))}.`,
      link: { to: '/admin/employees', label: 'Set salaries in Employees' },
    });
  }
  if (centersWithoutManager.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${nameList(centersWithoutManager.map((c) => c.name))} ${centersWithoutManager.length === 1 ? 'has' : 'have'} no manager.`,
      link: { to: '/admin/settings?tab=centers', label: 'Assign a manager' },
    });
  }
  if (noCenter.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${plural(noCenter.length, 'person is', 'people are')} not assigned to any center: ${nameList(noCenter.map((e) => e.fullName))}.`,
      link: { to: '/admin/employees', label: 'Assign in Employees' },
    });
  }

  const roleLabel = (e: Employee) => (e.role === 'MANAGER' ? 'Manager' : e.role === 'ADMIN' ? 'Admin' : 'Staff');
  const sorted = [...active].sort((a, b) => a.fullName.localeCompare(b.fullName));

  return {
    kpis: [
      { label: 'Active staff', value: String(active.length), note: plural(managers.length, 'manager') },
      { label: `Joined in ${range.name}`, value: String(joined.length) },
      {
        label: 'Monthly salary bill',
        value: formatINR(sum(active.map((e) => e.monthlySalary || 0))),
        note: 'Current salaries, before deductions',
      },
      {
        label: 'Missing bank or PAN',
        value: String(missingBank.length),
        tone: missingBank.length > 0 ? 'warning' : 'default',
      },
    ],
    chart: {
      title: 'Staff by center',
      bars: barsFor(
        (center) => allActive.filter((e) => centerOf(e) === center).length,
        (v) => plural(v, 'person', 'people')
      ),
    },
    attention,
    table: {
      title: 'Staff list',
      emptyText: 'No active staff at this center.',
      columns: [
        { key: 'name', header: 'Name' },
        { key: 'center', header: 'Center' },
        { key: 'designation', header: 'Job title' },
        { key: 'role', header: 'Access' },
        { key: 'joined', header: 'Joined' },
        { key: 'salary', header: 'Monthly salary', align: 'right' },
        { key: 'bank', header: 'Bank and PAN' },
      ],
      rows: sorted.map((e) => {
        const complete = !!e.bankDetails?.accountNumber?.trim() && !!e.bankDetails?.panNumber?.trim();
        return {
          id: e.id,
          search: `${e.fullName} ${e.employeeCode} ${e.designation || ''}`,
          cells: {
            name: e.fullName,
            center: centerOf(e),
            designation: e.designation || '—',
            role: roleLabel(e),
            joined: formatDate(e.joiningDate),
            salary: e.monthlySalary > 0 ? formatINR(e.monthlySalary) : <span className="text-amber-800">Not set</span>,
            bank: complete ? 'Complete' : <span className="text-amber-800">Missing</span>,
          },
        };
      }),
      csv: {
        filename: `staff-${scopeSuffix(ctx)}`,
        headers: ['Employee code', 'Name', 'Email', 'Phone', 'Center', 'Job title', 'Access', 'Shift', 'Joined', 'Monthly salary', 'Bank account', 'PAN', 'UAN'],
        rows: sorted.map((e) => [
          e.employeeCode, e.fullName, e.email, e.phone, centerOf(e), e.designation || '', roleLabel(e), titleCase(e.shift || 'MORNING'),
          e.joiningDate, e.monthlySalary || 0, e.bankDetails?.accountNumber || '', e.bankDetails?.panNumber || '', e.bankDetails?.uanNumber || '',
        ]),
      },
    },
  };
};
