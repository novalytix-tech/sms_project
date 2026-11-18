import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalRecords,
  pageSize,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  itemLabel = 'records',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalRecords === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(validCurrentPage * pageSize, totalRecords);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (validCurrentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="pagination-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span>
          Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
          <strong>{totalRecords}</strong> {itemLabel}
        </span>

        {pageSizeOptions && onPageSizeChange && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>Rows per page:</span>
            <select
              className="form-select"
              value={pageSize}
              onChange={e => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              style={{ padding: '3px 8px', fontSize: '12px', height: 'auto', width: 'auto' }}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn"
          disabled={validCurrentPage <= 1}
          onClick={() => onPageChange(1)}
          title="First page"
          aria-label="First page"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          type="button"
          className="pagination-btn"
          disabled={validCurrentPage <= 1}
          onClick={() => onPageChange(validCurrentPage - 1)}
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, idx) =>
          typeof p === 'number' ? (
            <button
              type="button"
              key={`page-${p}`}
              className={`pagination-btn ${p === validCurrentPage ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={p === validCurrentPage ? 'page' : undefined}
            >
              {p}
            </button>
          ) : (
            <span
              key={`ellipsis-${idx}`}
              style={{ padding: '0 4px', color: 'var(--color-text-secondary, #71717a)' }}
            >
              ...
            </span>
          )
        )}

        <button
          type="button"
          className="pagination-btn"
          disabled={validCurrentPage >= totalPages}
          onClick={() => onPageChange(validCurrentPage + 1)}
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
        <button
          type="button"
          className="pagination-btn"
          disabled={validCurrentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last page"
          aria-label="Last page"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
};

