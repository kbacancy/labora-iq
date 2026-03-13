"use client";

import { compactButtonClassName } from "@/src/components/ui/surface";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const PaginationControls = ({
  page,
  pageSize,
  total,
  disabled = false,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startRow = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRow = total === 0 ? 0 : Math.min(total, currentPage * pageSize);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="text-sm text-slate-400">
        Showing <span className="text-slate-200">{startRow}</span>-<span className="text-slate-200">{endRow}</span> of{" "}
        <span className="text-slate-200">{total}</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-3 text-sm text-slate-400">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            disabled={disabled}
            className="w-24 rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={disabled || currentPage <= 1}
            className={compactButtonClassName}
          >
            Previous
          </button>
          <span className="min-w-24 text-center text-sm text-slate-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={disabled || currentPage >= totalPages}
            className={compactButtonClassName}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
