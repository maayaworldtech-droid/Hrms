import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Filter,
  X,
} from 'lucide-react';
import { Button } from './Button';
import { exportToCSV } from '@/utils/formatters';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  filterComponent?: React.ReactNode;
  defaultSortKey?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pageSize?: number;
  exportFileName?: string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  headerAction?: React.ReactNode;
  mobileRender?: (item: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchFilter,
  filterComponent,
  defaultSortKey,
  defaultSortOrder = 'asc',
  pageSize = 10,
  exportFileName,
  onRowClick,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records matching your current filter criteria.',
  headerAction,
  mobileRender,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase().trim();
    if (searchFilter) {
      return data.filter((item) => searchFilter(item, query));
    }
    return data.filter((item) =>
      Object.values(item).some(
        (val) =>
          val !== null &&
          val !== undefined &&
          String(val).toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery, searchFilter]);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortOrder]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (!exportFileName) return;
    const headers = columns.map((col) => col.header);
    const rows = sortedData.map((row) =>
      columns.map((col) => {
        const val = row[col.key];
        return typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
      })
    );
    exportToCSV(exportFileName, headers, rows);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E4E7EC] shadow-xs overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-3.5 sm:p-4 border-b border-[#E4E7EC] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full h-9 pl-9 pr-8 text-sm bg-[#F7F8FA] hover:bg-white border border-[#D0D5DD] rounded-lg text-[#101828] placeholder-[#667085] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#3B68F5]/20 focus:border-[#3B68F5] transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828] p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] px-1.5 py-0.5 text-[#667085] font-mono border border-[#D0D5DD] rounded bg-white shadow-xs">
                /
              </kbd>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {filterComponent}

          {exportFileName && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              title="Download CSV export"
            >
              Export CSV
            </Button>
          )}

          {headerAction}
        </div>
      </div>

      {/* Table Body */}
      {mobileRender && <div className="ops-mobile-list px-4 divide-y divide-[#E4E7EC]">
        {isLoading ? <p className="ops-empty" role="status">Loading records…</p> : paginatedData.length ? paginatedData.map((row, index) => <article key={row.id || index} className="py-4">{mobileRender(row)}</article>) : <div className="ops-empty"><p className="font-semibold">{emptyTitle}</p><p>{emptyDescription}</p>{searchQuery && <button className="ops-link" onClick={() => setSearchQuery('')}>Clear search</button>}</div>}
      </div>}
      <div className={mobileRender ? 'ops-desktop-table' : 'overflow-x-auto'}>
        <table className="w-full text-left text-sm text-[#344054]">
          <thead className="bg-[#F7F8FA] border-b border-[#E4E7EC] text-[13px] font-medium text-[#475467] sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 font-medium tracking-normal ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => handleSort(col.key)}
                      className={`inline-flex items-center gap-1.5 hover:text-[#101828] transition-colors focus:outline-none ${
                        sortKey === col.key ? 'text-[#2A4FE0] font-semibold' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {sortKey === col.key ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#2A4FE0]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#2A4FE0]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-[#98A2B3]" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E4E7EC]">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-4">
                      <div className="h-4 bg-[#F0F2F5] rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-14 px-4 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#F0F2F5] flex items-center justify-center text-[#667085] mb-3 border border-[#E4E7EC]">
                      <Filter className="w-4 h-4" />
                    </div>
                    <p className="text-sm font-semibold text-[#101828]">{emptyTitle}</p>
                    <p className="text-xs text-[#667085] mt-1 max-w-sm">{emptyDescription}</p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-3 text-xs text-[#2A4FE0] hover:underline font-medium"
                      >
                        Reset search filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`h-12 transition-colors duration-100 ${
                    onRowClick ? 'cursor-pointer hover:bg-[#F0F2F5]' : 'hover:bg-[#F7F8FA]'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3 px-4 text-[#344054] ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right tabular-nums'
                          : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && sortedData.length > 0 && (
        <div className="p-3 px-4 bg-[#F7F8FA] border-t border-[#E4E7EC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#475467]">
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length}{' '}
              records
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              aria-label="Records per page"
              className="ml-2 bg-white border border-[#D0D5DD] rounded-md px-2 py-1 text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#3B68F5]/20 focus:border-[#3B68F5]"
            >
              {[...new Set([5, 10, pageSize, 20, 50])].sort((a,b) => a-b).map(size => <option key={size} value={size}>{size} / page</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 !p-0"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2 text-[#101828] font-medium tabular-nums">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 !p-0"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
