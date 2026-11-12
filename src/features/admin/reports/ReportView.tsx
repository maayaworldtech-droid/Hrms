import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Download, Info, Search } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { exportToCSV } from '@/utils/formatters';

/**
 * Every report tab has the same shape, so the admin learns the page once:
 * headline numbers -> how centers compare -> what needs attention -> the full list (downloadable).
 */
export interface ReportKpi {
  label: string;
  value: string;
  /** One short sentence putting the number in context, e.g. "Rs 12,000 more than September" */
  note?: string;
  tone?: 'default' | 'warning';
}

export interface CenterBar {
  center: string;
  value: number;
  display: string;
}

export interface AttentionItem {
  text: string;
  tone: 'warning' | 'info';
  link?: { to: string; label: string };
}

export interface ReportColumn {
  key: string;
  header: string;
  align?: 'left' | 'right';
}

export interface ReportData {
  /** Shown above everything, e.g. "Payroll for October has not been generated yet" */
  notice?: AttentionItem;
  kpis: ReportKpi[];
  chart: { title: string; bars: CenterBar[] } | null;
  attention: AttentionItem[];
  table: {
    title: string;
    emptyText: string;
    columns: ReportColumn[];
    rows: { id: string; search: string; cells: Record<string, React.ReactNode> }[];
    csv: { filename: string; headers: string[]; rows: (string | number)[][] };
  };
}

export const ReportViewLayout: React.FC<{ data: ReportData; selectedCenter: string }> = ({ data, selectedCenter }) => (
  <div className="space-y-6">
    {data.notice && <AttentionRow item={data.notice} />}

    <KpiStrip kpis={data.kpis} />

    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <section className="xl:col-span-3">
        {data.chart && <CenterComparison title={data.chart.title} bars={data.chart.bars} selectedCenter={selectedCenter} />}
      </section>
      <section className="xl:col-span-2">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Needs attention</h3>
        {data.attention.length === 0 ? (
          <p className="text-sm text-slate-600">Nothing needs your attention for this period.</p>
        ) : (
          <ul className="space-y-2">
            {data.attention.map((item, i) => (
              <li key={i}>
                <AttentionRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>

    <ReportTable table={data.table} />
  </div>
);

const KpiStrip: React.FC<{ kpis: ReportKpi[] }> = ({ kpis }) => (
  <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200">
    {kpis.map((k) => (
      <div key={k.label} className="px-4 py-3 bg-white">
        <dt className="text-sm text-slate-600">{k.label}</dt>
        <dd className={`text-lg font-semibold tabular-nums mt-0.5 ${k.tone === 'warning' ? 'text-amber-800' : 'text-slate-900'}`}>
          {k.value}
        </dd>
        {k.note && <dd className="text-xs text-slate-600 mt-0.5">{k.note}</dd>}
      </div>
    ))}
  </dl>
);

/**
 * One measure per center as thin horizontal bars. Always compares every center, so picking a center
 * in the filter highlights it against the others instead of leaving a single lonely bar.
 */
const CenterComparison: React.FC<{ title: string; bars: CenterBar[]; selectedCenter: string }> = ({
  title,
  bars,
  selectedCenter,
}) => {
  const max = Math.max(0, ...bars.map((b) => b.value));
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-600 mb-3">
        {selectedCenter === 'ALL' ? 'All centers compared.' : `${selectedCenter} highlighted against the other centers.`}
      </p>
      {bars.length === 0 ? (
        <p className="text-sm text-slate-600">No centers to compare yet.</p>
      ) : (
        <ul className="space-y-2">
          {bars.map((b) => {
            const highlighted = selectedCenter === 'ALL' || selectedCenter === b.center;
            const width = max > 0 ? Math.max(b.value > 0 ? 1.5 : 0, (b.value / max) * 100) : 0;
            return (
              <li
                key={b.center}
                className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3"
                title={`${b.center}: ${b.display}`}
              >
                <span className={`text-sm truncate ${highlighted ? 'text-slate-900' : 'text-slate-600'}`}>{b.center}</span>
                <span className="h-2.5 rounded-sm bg-slate-100" aria-hidden="true">
                  <span
                    className={`block h-full rounded-r ${highlighted ? 'bg-brand-600' : 'bg-slate-300'}`}
                    style={{ width: `${width}%` }}
                  />
                </span>
                <span className={`text-sm tabular-nums text-right ${highlighted ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                  {b.display}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const AttentionRow: React.FC<{ item: AttentionItem }> = ({ item }) => {
  const warning = item.tone === 'warning';
  const Icon = warning ? AlertTriangle : Info;
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${
        warning ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-800'
      }`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${warning ? 'text-amber-700' : 'text-slate-500'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p>{item.text}</p>
        {item.link && (
          <Link to={item.link.to} className="inline-flex items-center gap-1 mt-1 font-medium text-brand-700 hover:text-brand-800 underline-offset-2 hover:underline">
            {item.link.label}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
};

const PAGE_SIZE = 25;

const ReportTable: React.FC<{ table: ReportData['table'] }> = ({ table }) => {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? table.rows.filter((r) => r.search.toLowerCase().includes(q)) : table.rows;
  }, [table.rows, query]);
  const visible = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{table.title}</h3>
          <p className="text-xs text-slate-600">
            {filtered.length === table.rows.length
              ? `${table.rows.length} rows`
              : `${filtered.length} of ${table.rows.length} rows match`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search this list</span>
            <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="h-9 w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-3 text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-400/30"
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={table.csv.rows.length === 0}
            onClick={() => exportToCSV(table.csv.filename, table.csv.headers, table.csv.rows)}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download for Excel
          </Button>
        </div>
      </div>

      {table.rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
          {table.emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {table.columns.map((c) => (
                  <th key={c.key} className={`px-4 py-2.5 font-medium whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.map((row) => (
                <tr key={row.id}>
                  {table.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2.5 text-slate-900 ${c.align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : ''}`}
                    >
                      {row.cells[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > PAGE_SIZE && (
            <div className="px-4 py-2.5 border-t border-slate-200 text-center">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline underline-offset-2 cursor-pointer"
              >
                {showAll ? 'Show fewer' : `Show all ${filtered.length} rows`}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
