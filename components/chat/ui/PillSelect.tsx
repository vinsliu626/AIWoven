// components/chat/ui/workflow/PillSelect.tsx
"use client";

import React, { useEffect, useState } from "react";

export type PillOption = { value: string; label: string };

export function PillSelect({ value, options, onChange, disabled, className = "" }: any) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o: any) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [open]);

  return (
    <div className={`relative ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button" disabled={disabled} onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:border-blue-400 hover:bg-slate-50 transition-colors"
      >
        <span className="truncate">{selected.label}</span>
        <span className="ml-2 text-[10px] text-slate-500">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-full min-w-[140px] rounded-xl border border-slate-200 bg-white/90 backdrop-blur-xl shadow-2xl z-30 py-1 overflow-hidden">
          {options.map((opt: any) => (
            <button
              key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-[11px] transition-colors ${opt.value === value ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}