import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Search, Download, Filter, X } from 'lucide-react';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { exportToCSV } from '@/utils/formatters';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

/** Pass this when the API pages the data; the table then shows the server's counts and controls. */
export interface ServerPagination {
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
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
  /** Card renderer for phones; the table is hidden below 640px when this is given. */
  mobileRender?: (item: T) => React.ReactNode;
  hidePagination?: boolean;
  onSearchChange?: (query: string) => void;
  pagination?: ServerPagination;
  /** Pre-fills the search box, for deep links such as ?q=MW-1003. */
  initialSearch?: string;
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
  hidePagination = false,
  onSearchChange,
  pagination,
  initialSearch = '',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const serverPaged = Boolean(pagination);

  // Press "/" anywhere outside a field to jump to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filteredData = useMemo(() => {
    if (onSearchChange || !searchQuery.trim()) return safeData;
    const query = searchQuery.toLowerCase().trim();
    if (searchFilter) return safeData.filter((item) => searchFilter(item, query));
    return safeData.filter((item) =>
      Object.values(item).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(query))
    );
  }, [safeData, searchQuery, searchFilter, onSearchChange]);

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

  const clientTotalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    if (hidePagination || serverPaged) return sortedData;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage, hidePagination, serverPaged]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearchChange?.('');
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

  const alignClass = (align?: Column<T>['align']) =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  const emptyBlock = (
    <EmptyState
      bare
      compact
      icon={Filter}
      title={emptyTitle}
      description={emptyDescription}
      actionLabel={searchQuery ? 'Clear search' : undefined}
      onAction={searchQuery ? clearSearch : undefined}
    />
  );

  // Footer numbers come from the server when it pages, otherwise from the local slice
  const page = serverPaged ? pagination!.page : currentPage;
  const totalPages = serverPaged ? Math.max(1, pagination!.totalPages) : clientTotalPages;
  const totalElements = serverPaged ? pagination!.totalElements : sortedData.length;
  const rangeStart = totalElements === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const rangeEnd = serverPaged ? rangeStart + paginatedData.length - 1 : Math.min(page * itemsPerPage, totalElements);
  const goTo = (next: number) => (serverPaged ? pagination!.onPageChange(next) : setCurrentPage(next));
  const showFooter = !hidePagination && !isLoading && totalElements > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col items-stretch justify-between gap-3 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearchChange?.(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-500 transition-colors hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {filterComponent}
          {exportFileName && (
            <Button variant="outline" size="sm" onClick={handleExport} leftIcon={<Download className="h-3.5 w-3.5" />}>
              Download for Excel
            </Button>
          )}
          {headerAction}
        </div>
      </div>

      {mobileRender && (
        <div className="ops-mobile-list divide-y divide-slate-200 px-4">
          {isLoading ? (
            <div className="space-y-3 py-4" role="status" aria-label="Loading records">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : paginatedData.length ? (
            paginatedData.map((row, index) => (
              <article key={row.id || index} className="py-3.5">
                {mobileRender(row)}
              </article>
            ))
          ) : (
            emptyBlock
          )}
        </div>
      )}

      <div className={mobileRender ? 'ops-desktop-table' : 'overflow-x-auto'}>
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={sortKey === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`px-4 py-2.5 font-medium ${alignClass(col.align)} ${col.className || ''}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className={`inline-flex items-center gap-1.5 rounded transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 ${
                        sortKey === col.key ? 'font-semibold text-brand-700' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {sortKey === col.key ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5">
                      <div className="h-4 w-3/4 rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8">
                  {emptyBlock}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick?.(row)}
                  className={`h-12 transition-colors duration-100 ${onRowClick ? 'cursor-pointer hover:bg-slate-100' : 'hover:bg-slate-50'}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 text-slate-700 ${alignClass(col.align)} ${col.align === 'right' ? 'tabular-nums' : ''} ${col.className || ''}`}
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

      {showFooter && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              Showing {rangeStart} to {rangeEnd} of {totalElements} records
            </span>
            {!serverPaged && (
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Records per page"
                className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              >
                {[...new Set([5, 10, pageSize, 20, 50])]
                  .sort((a, b) => a - b)
                  .map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => goTo(page - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-medium tabular-nums text-slate-900">
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => goTo(page + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
