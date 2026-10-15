"use client";

import { useEffect, useRef, useState } from "react";

type CopyButtonProps = {
  text: string;
  className?: string;
  onCopied?: () => void;
};

export function CopyButton({ text, className = "", onCopied }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const resetRef = useRef<number | null>(null);
  const toastRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetRef.current) window.clearTimeout(resetRef.current);
      if (toastRef.current) window.clearTimeout(toastRef.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastRef.current) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(null), 1500);
  }

  async function handleCopy() {
    if (!text?.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      showToast("Text copied to clipboard");
      if (resetRef.current) window.clearTimeout(resetRef.current);
      resetRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("Copy failed. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleCopy()}
        disabled={!text?.trim()}
        className={[
          "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        ].join(" ")}
      >
        <svg viewBox="0 0 20 20" aria-hidden className={`h-4 w-4 ${copied ? "text-emerald-600" : "text-slate-400"}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {copied ? <path d="m5 10.5 3 3 7-7" /> : <><rect x="7" y="7" width="9" height="9" rx="1.5" /><path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" /></>}
        </svg>
        {copied ? "Copied!" : "Copy"}
      </button>
      {toast ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
