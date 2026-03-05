"use client";

import { useEffect } from "react";

interface ToastProps {
  type: "success" | "error";
  message: string;
  onClose: () => void;
  durationMs?: number;
}

export const Toast = ({ type, message, onClose, durationMs = 3500 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  const styles =
    type === "success"
      ? "border-emerald-700/60 bg-emerald-950/70 text-emerald-100"
      : "border-red-700/60 bg-red-950/70 text-red-100";

  return (
    <div className={`fixed right-6 top-20 z-50 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur ${styles}`}>
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button type="button" onClick={onClose} className="text-xs text-gray-300 transition hover:text-white">
          Dismiss
        </button>
      </div>
    </div>
  );
};
