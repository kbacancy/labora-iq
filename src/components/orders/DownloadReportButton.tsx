"use client";

import { useState } from "react";
import { fetchWithAccessToken } from "@/src/lib/auth-fetch";

interface DownloadReportButtonProps {
  orderId: string;
}

export const DownloadReportButton = ({ orderId }: DownloadReportButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAccessToken("/api/workflow/reports", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { fileUrl?: string };
      };

      if (!response.ok || !payload.data?.fileUrl) {
        throw new Error(payload.error ?? "Failed to generate report.");
      }

      window.open(payload.data.fileUrl, "_blank", "noopener,noreferrer");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={onDownload}
        disabled={loading}
        className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-200 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Preparing..." : "Download Report"}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
};
