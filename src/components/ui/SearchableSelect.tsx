"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { compactButtonClassName, fieldLabelClassName, inputClassName } from "@/src/components/ui/surface";

type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string | null;
  keywords?: string[];
};

type SearchableSelectProps = {
  label?: string;
  value: string;
  onChange: (nextValue: string) => void;
  options: SearchableSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  helperText?: string | null;
};

export const SearchableSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  disabled = false,
  helperText,
}: SearchableSelectProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [option.label, option.description ?? "", ...(option.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, search]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePanelPosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const margin = 16;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const preferredHeight = 360;
      const gap = 10;

      const width = Math.min(rect.width, viewportWidth - margin * 2);
      const left = Math.min(Math.max(margin, rect.left), viewportWidth - width - margin);
      const availableBelow = viewportHeight - rect.bottom - margin;
      const availableAbove = rect.top - margin;
      const placeAbove = availableBelow < 260 && availableAbove > availableBelow;
      const maxHeight = Math.max(180, Math.min(preferredHeight, placeAbove ? availableAbove - gap : availableBelow - gap));
      const top = placeAbove ? Math.max(margin, rect.top - maxHeight - gap) : rect.bottom + gap;

      setPanelStyle({
        top,
        left,
        width,
        maxHeight,
      });
    };

    updatePanelPosition();

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const onViewportChange = () => updatePanelPosition();

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open]);

  const dropdown =
    open && typeof document !== "undefined" && panelStyle
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[80] overflow-hidden rounded-[1.6rem] border border-slate-700/90 bg-[linear-gradient(180deg,rgba(2,6,23,0.99),rgba(8,15,32,0.97))] shadow-[0_28px_80px_rgba(0,0,0,0.52)] ring-1 ring-blue-500/10 backdrop-blur-xl"
            style={{
              top: panelStyle.top,
              left: panelStyle.left,
              width: panelStyle.width,
            }}
          >
            <div className="border-b border-slate-800/90 bg-slate-950/92 p-3">
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className={`${inputClassName} border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50`}
              />
            </div>
            <div
              className="scrollbar-panel overflow-y-auto bg-[linear-gradient(180deg,rgba(2,6,23,0.99),rgba(8,15,32,0.95))] p-2"
              style={{ maxHeight: panelStyle.maxHeight }}
            >
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setSearch("");
                  setOpen(false);
                }}
                className={`mb-1 w-full justify-start text-left ${compactButtonClassName} ${
                  value === ""
                    ? "border-blue-500/50 bg-blue-500/12 text-blue-200"
                    : "border-slate-800 bg-slate-950/85 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                {placeholder}
              </button>
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-4 text-sm text-slate-500">{emptyMessage}</p>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setSearch("");
                      setOpen(false);
                    }}
                    className={`mb-1 w-full rounded-xl border px-3 py-3 text-left transition ${
                      value === option.value
                        ? "border-blue-500/55 bg-blue-500/12 text-blue-100 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.12)]"
                        : "border-slate-800 bg-slate-950 text-slate-200 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <span className="block text-sm">{option.label}</span>
                    {option.description ? (
                      <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className="relative">
      {label ? <span className={fieldLabelClassName}>{label}</span> : null}
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setSearch("");
            setOpen((current) => !current);
          }
        }}
        disabled={disabled}
        className={`${inputClassName} flex min-h-[52px] items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <span className="min-w-0">
          <span className={selectedOption ? "block truncate text-slate-100" : "block truncate text-slate-500"}>
            {selectedOption?.label ?? placeholder}
          </span>
          {selectedOption?.description ? (
            <span className="mt-1 block truncate text-xs text-slate-400">{selectedOption.description}</span>
          ) : null}
        </span>
        <span className="text-xs text-slate-500">{open ? "Close" : "Select"}</span>
      </button>
      {helperText ? <p className="mt-2 text-xs leading-6 text-slate-500">{helperText}</p> : null}
      {dropdown}
    </div>
  );
};
