
/**
 * Formats a number to Indian Rupee (INR) format
 * Example: 1250000 -> "₹12,50,000"
 */
export function formatINR(amount: number, showDecimals = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return formatter.format(amount);
}

/**
 * Format date string (YYYY-MM-DD) to friendly format (e.g. 15 Oct, 2026)
 */
export function formatDate(dateStr?: string | Date): string {
  if (!dateStr) return '-';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format a date-time such as "2026-11-13T11:29:19" (India time, from the server) to
 * "13 Nov 2026, 11:29 am".
 */
export function formatDateTime(value?: string): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format 24-hour time "14:30" or ISO to "02:30 PM"
 */
export function formatTime(timeStr?: string): string {
  if (!timeStr) return '--:--';
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1].substring(0, 2);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${String(formattedHours).padStart(2, '0')}:${minutes} ${ampm}`;
  }
  return timeStr;
}

/**
 * Convert numbers to Indian Words for official payslips
 * e.g. 152000 -> "One Lakh Fifty Two Thousand Rupees Only"
 */
export function numberToIndianWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    const str = ('000000000' + n).substr(-9);
    const match = str.match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!match) return '';

    let out = '';
    out += Number(match[1]) !== 0 ? (a[Number(match[1])] || b[Number(match[1][0])] + ' ' + a[Number(match[1][1])]) + 'Crore ' : '';
    out += Number(match[2]) !== 0 ? (a[Number(match[2])] || b[Number(match[2][0])] + ' ' + a[Number(match[2][1])]) + 'Lakh ' : '';
    out += Number(match[3]) !== 0 ? (a[Number(match[3])] || b[Number(match[3][0])] + ' ' + a[Number(match[3][1])]) + 'Thousand ' : '';
    out += Number(match[4]) !== 0 ? (a[Number(match[4])] || b[Number(match[4][0])] + ' ' + a[Number(match[4][1])]) + 'Hundred ' : '';
    out += Number(match[5]) !== 0 ? ((out !== '' ? 'and ' : '') + (a[Number(match[5])] || b[Number(match[5][0])] + ' ' + a[Number(match[5][1])])) : '';

    return out.trim();
  }

  const rounded = Math.round(num);
  if (rounded === 0) return 'Zero Rupees Only';
  return `${inWords(rounded)} Rupees Only`;
}

/**
 * Downloads a CSV file that opens cleanly in Excel. Pass raw numbers (not formatted currency
 * strings) so the columns can be totalled. A UTF-8 byte order mark keeps the rupee sign and
 * non-English names readable in Excel.
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (cell: string | number | null | undefined) => {
    const cellStr = String(cell ?? '');
    return /[",\r\n]/.test(cellStr) ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
  };
  const csvContent = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\r\n');

  const blob = new Blob([String.fromCharCode(0xfeff) + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Turns a backend code into readable text: "CASUAL_LEAVE" -> "Casual leave", "ON_DUTY" -> "On Duty".
 * Use it wherever a status or type code is shown, so no screen prints raw capitalised codes.
 */
export function formatLabel(value?: string | null): string {
  if (!value) return '';
  const special: Record<string, string> = {
    ON_DUTY: 'On Duty',
    OD: 'On Duty',
    PAID: 'Paid',
    PENDING: 'Pending',
    LOSS_OF_PAY: 'Loss of pay',
    COMP_OFF: 'Comp off',
  };
  const key = value.trim().toUpperCase();
  if (special[key]) return special[key];
  const words = key.toLowerCase().split(/[_\s]+/).filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
